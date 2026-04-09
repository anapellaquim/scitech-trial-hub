import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { parse, format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ImportFindingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  rowNumber: number;
  centro: string;
  dataVisita: string;
  tipoVisita: string;
  participantCode: string;
  findingType: string;
  formName: string;
  descricao: string;
  responsibleName: string;
  severidade: string;
  status: string;
  prazo: string;
  responsavel: string;
  resolucao: string;
  visitId?: string;
  assignedToId?: string;
  isRemote?: boolean;
  error?: string;
  warning?: string;
}

const ImportFindingsDialog = ({ open, onOpenChange, onSuccess }: ImportFindingsDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [validRows, setValidRows] = useState<ParsedRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [importResult, setImportResult] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setValidRows([]);
    setInvalidRows([]);
    setStep("upload");
    setImportResult({ success: 0, failed: 0 });
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const parseDateString = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    
    // Try different date formats
    const formats = ["dd/MM/yyyy", "yyyy-MM-dd", "dd-MM-yyyy"];
    for (const fmt of formats) {
      const parsed = parse(dateStr, fmt, new Date());
      if (isValid(parsed)) return parsed;
    }
    
    // Try Excel date number
    const excelDate = parseFloat(dateStr);
    if (!isNaN(excelDate) && excelDate > 0) {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      if (isValid(date)) return date;
    }
    
    return null;
  };

  const mapSeverity = (value: string): string => {
    const normalized = value.toLowerCase().trim();
    if (normalized === "crítico" || normalized === "critico" || normalized === "critical") return "critical";
    if (normalized === "maior" || normalized === "major") return "major";
    if (normalized === "menor" || normalized === "minor") return "minor";
    return "minor"; // default
  };

  const mapStatus = (value: string): string => {
    const normalized = value.toLowerCase().trim();
    if (normalized === "resolvido" || normalized === "closed" || normalized === "fechado") return "closed";
    return "open"; // default
  };

  const mapFindingType = (value: string): string => {
    const normalized = value.trim();
    const validTypes = ["Desvio", "eCRF", "Prontuário", "Violação", "Binder", "CEP", "NA"];
    const match = validTypes.find(t => t.toLowerCase() === normalized.toLowerCase());
    return match || "NA";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validExtensions = [".xlsx", ".xls"];
    const extension = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      toast.error("Arquivo inválido. Use .xlsx ou .xls");
      return;
    }

    setFile(selectedFile);
    await parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

      if (jsonData.length < 2) {
        toast.error("Arquivo vazio ou sem dados");
        return;
      }

      // Get header row and find column indices
      const headers = jsonData[0].map(h => String(h).toLowerCase().trim());
      const colIndex = {
        centro: headers.findIndex(h => h.includes("centro") && !h.includes("nome")),
        dataVisita: headers.findIndex(h => h.includes("data") && h.includes("visita")),
        tipoVisita: headers.findIndex(h => (h.includes("tipo") && h.includes("visita")) || h === "visita"),
        participantCode: headers.findIndex(h => h.includes("código") || h.includes("codigo") || h.includes("participante")),
        findingType: headers.findIndex(h => h === "tipo" || (h.includes("tipo") && !h.includes("visita"))),
        formName: headers.findIndex(h => h.includes("formulário") || h.includes("formulario") || h.includes("form")),
        descricao: headers.findIndex(h => h.includes("descri")),
        responsibleName: headers.findIndex(h => h === "responsável" || h === "responsavel"),
        severidade: headers.findIndex(h => h.includes("sever")),
        status: headers.findIndex(h => h.includes("status")),
        prazo: headers.findIndex(h => h.includes("prazo")),
        assignedTo: headers.findIndex(h => h.includes("atribuído") || h.includes("atribuido") || h.includes("assigned")),
        resolucao: headers.findIndex(h => h.includes("resolu"))
      };

      // Validate required columns
      if (colIndex.descricao === -1) {
        toast.error("Coluna obrigatória não encontrada: Descrição");
        return;
      }

      // Load research centers and visits for validation
      const { data: centers } = await supabase.from("research_centers").select("id, code");
      const { data: visits } = await supabase.from("study_visits").select("id, research_center_id, scheduled_date, visit_type");
      const { data: profiles } = await supabase.from("profiles").select("id, full_name");

      const rows: ParsedRow[] = [];
      const valid: ParsedRow[] = [];
      const invalid: ParsedRow[] = [];

      // Process each data row
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0 || !row.some(cell => cell)) continue;

        const centro = colIndex.centro !== -1 ? String(row[colIndex.centro] || "").trim() : "";
        const dataVisitaRaw = colIndex.dataVisita !== -1 ? String(row[colIndex.dataVisita] || "").trim() : "";
        const tipoVisita = colIndex.tipoVisita !== -1 ? String(row[colIndex.tipoVisita] || "").trim() : "";
        const participantCode = colIndex.participantCode !== -1 ? String(row[colIndex.participantCode] || "").trim() : "";
        const findingType = colIndex.findingType !== -1 ? String(row[colIndex.findingType] || "").trim() : "";
        const formName = colIndex.formName !== -1 ? String(row[colIndex.formName] || "").trim() : "";
        const descricao = String(row[colIndex.descricao] || "").trim();
        const responsibleName = colIndex.responsibleName !== -1 ? String(row[colIndex.responsibleName] || "").trim() : "";
        const severidade = colIndex.severidade !== -1 ? String(row[colIndex.severidade] || "").trim() : "Menor";
        const status = colIndex.status !== -1 ? String(row[colIndex.status] || "").trim() : "Aberto";
        const prazoRaw = colIndex.prazo !== -1 ? String(row[colIndex.prazo] || "").trim() : "";
        const assignedToName = colIndex.assignedTo !== -1 ? String(row[colIndex.assignedTo] || "").trim() : "";
        const resolucao = colIndex.resolucao !== -1 ? String(row[colIndex.resolucao] || "").trim() : "";

        // Check if it's a remote finding
        const isRemote = centro.toLowerCase() === "remoto" || tipoVisita.toLowerCase() === "remoto";

        const parsedRow: ParsedRow = {
          rowNumber: i + 1,
          centro,
          dataVisita: dataVisitaRaw,
          tipoVisita,
          participantCode,
          findingType: mapFindingType(findingType),
          formName,
          descricao,
          responsibleName,
          severidade,
          status,
          prazo: prazoRaw,
          responsavel: assignedToName,
          resolucao,
          isRemote
        };

        // Validate required fields
        if (!descricao) {
          parsedRow.error = "Descrição é obrigatória";
          invalid.push(parsedRow);
          rows.push(parsedRow);
          continue;
        }

        // Remote findings don't need center/date validation
        if (isRemote) {
          parsedRow.isRemote = true;
          
          // Find assignee (optional)
          if (assignedToName) {
            const profileMatch = profiles?.find(p => 
              p.full_name.toLowerCase().includes(assignedToName.toLowerCase())
            );
            if (profileMatch) {
              parsedRow.assignedToId = profileMatch.id;
            } else {
              parsedRow.warning = `Atribuído "${assignedToName}" não encontrado`;
            }
          }
          
          valid.push(parsedRow);
          rows.push(parsedRow);
          continue;
        }

        // Non-remote findings need center validation
        if (!centro) {
          parsedRow.error = "Centro é obrigatório para pendências não remotas";
          invalid.push(parsedRow);
          rows.push(parsedRow);
          continue;
        }

        if (!dataVisitaRaw) {
          parsedRow.error = "Data da visita é obrigatória para pendências não remotas";
          invalid.push(parsedRow);
          rows.push(parsedRow);
          continue;
        }

        // Find center
        const centerMatch = centers?.find(c => c.code.toLowerCase() === centro.toLowerCase());
        if (!centerMatch) {
          parsedRow.error = `Centro "${centro}" não encontrado`;
          invalid.push(parsedRow);
          rows.push(parsedRow);
          continue;
        }

        // Parse date
        const visitDate = parseDateString(dataVisitaRaw);
        if (!visitDate) {
          parsedRow.error = `Data inválida: ${dataVisitaRaw}`;
          invalid.push(parsedRow);
          rows.push(parsedRow);
          continue;
        }

        const visitDateFormatted = format(visitDate, "yyyy-MM-dd");

        // Find visit by center + date
        let visitMatch = visits?.find(v => 
          v.research_center_id === centerMatch.id && 
          v.scheduled_date === visitDateFormatted
        );

        // If not found and tipoVisita specified, try with visit type
        if (!visitMatch && tipoVisita) {
          visitMatch = visits?.find(v => 
            v.research_center_id === centerMatch.id && 
            v.visit_type?.toLowerCase() === tipoVisita.toLowerCase()
          );
        }

        if (!visitMatch) {
          parsedRow.error = `Visita não encontrada para centro ${centro} em ${format(visitDate, "dd/MM/yyyy")}`;
          invalid.push(parsedRow);
          rows.push(parsedRow);
          continue;
        }

        parsedRow.visitId = visitMatch.id;
        parsedRow.dataVisita = format(visitDate, "dd/MM/yyyy");

        // Find assignee (optional)
        if (assignedToName) {
          const profileMatch = profiles?.find(p => 
            p.full_name.toLowerCase().includes(assignedToName.toLowerCase())
          );
          if (profileMatch) {
            parsedRow.assignedToId = profileMatch.id;
          } else {
            parsedRow.warning = `Atribuído "${assignedToName}" não encontrado`;
          }
        }

        valid.push(parsedRow);
        rows.push(parsedRow);
      }

      setParsedData(rows);
      setValidRows(valid);
      setInvalidRows(invalid);
      setStep("preview");
    } catch (error: any) {
      toast.error("Erro ao ler arquivo: " + error.message);
    }
  };

  const handleImport = async () => {
    if (validRows.length === 0) {
      toast.error("Nenhuma linha válida para importar");
      return;
    }

    setImporting(true);
    let successCount = 0;
    let failedCount = 0;

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    for (const row of validRows) {
      try {
        const prazoDate = row.prazo ? parseDateString(row.prazo) : null;

        const { data: finding, error } = await supabase
          .from("visit_findings")
          .insert({
            visit_id: row.isRemote ? null : row.visitId!,
            is_remote: row.isRemote || false,
            participant_code: row.participantCode || null,
            finding_type: row.findingType || "NA",
            form_name: row.formName || null,
            description: row.descricao,
            responsible_name: row.responsibleName || null,
            severity: mapSeverity(row.severidade),
            status: mapStatus(row.status),
            due_date: prazoDate ? format(prazoDate, "yyyy-MM-dd") : null,
            assigned_to: row.assignedToId || null,
            resolution: row.resolucao || null,
            created_by: userId
          })
          .select()
          .single();

        if (error) throw error;

        // Record in history
        if (finding) {
          await supabase.from("finding_history").insert({
            finding_id: finding.id,
            user_id: userId,
            action: "imported",
            notes: `Importado do Excel - Linha ${row.rowNumber}`
          });
        }

        successCount++;
      } catch (error) {
        failedCount++;
      }
    }

    setImporting(false);
    setImportResult({ success: successCount, failed: failedCount });
    setStep("result");

    if (successCount > 0) {
      onSuccess();
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        "Centro": "001",
        "Data da Visita": "15/01/2025",
        "Visita": "IMV",
        "Código": "001-001",
        "Tipo": "eCRF",
        "Formulário": "ICF",
        "Descrição": "Exemplo de pendência a ser resolvida",
        "Responsável": "Nome do Responsável",
        "Severidade": "Menor",
        "Status": "Aberto",
        "Prazo": "30/01/2025",
        "Atribuído a": "Nome do Usuário",
        "Resolução": ""
      },
      {
        "Centro": "Remoto",
        "Data da Visita": "",
        "Visita": "",
        "Código": "",
        "Tipo": "Desvio",
        "Formulário": "",
        "Descrição": "Exemplo de pendência remota",
        "Responsável": "Nome do Responsável",
        "Severidade": "Maior",
        "Status": "Aberto",
        "Prazo": "15/02/2025",
        "Atribuído a": "",
        "Resolução": ""
      }
    ];

    const instructionsData = [
      { "Campo": "Centro", "Obrigatório": "Sim*", "Descrição": "Código do centro (ex: 001) ou 'Remoto' para pendências remotas" },
      { "Campo": "Data da Visita", "Obrigatório": "Sim*", "Descrição": "Data da visita no formato dd/MM/yyyy (não obrigatório se Remoto)" },
      { "Campo": "Visita", "Obrigatório": "Não", "Descrição": "Tipo da visita: SQV, SIV, IMV, COV" },
      { "Campo": "Código", "Obrigatório": "Não", "Descrição": "Código do participante (ex: 001-001)" },
      { "Campo": "Tipo", "Obrigatório": "Não", "Descrição": "Tipo da pendência: Desvio, eCRF, Prontuário, Violação, Binder, CEP, NA" },
      { "Campo": "Formulário", "Obrigatório": "Não", "Descrição": "Nome do formulário (configurável por estudo)" },
      { "Campo": "Descrição", "Obrigatório": "Sim", "Descrição": "Descrição detalhada da pendência" },
      { "Campo": "Responsável", "Obrigatório": "Não", "Descrição": "Nome do responsável pela resolução" },
      { "Campo": "Severidade", "Obrigatório": "Não", "Descrição": "Menor, Maior ou Crítico (padrão: Menor)" },
      { "Campo": "Status", "Obrigatório": "Não", "Descrição": "Aberto ou Resolvido (padrão: Aberto)" },
      { "Campo": "Prazo", "Obrigatório": "Não", "Descrição": "Data limite no formato dd/MM/yyyy" },
      { "Campo": "Atribuído a", "Obrigatório": "Não", "Descrição": "Nome do usuário para atribuição no sistema (busca parcial)" },
      { "Campo": "Resolução", "Obrigatório": "Não", "Descrição": "Texto de resolução (se status = Resolvido)" }
    ];

    const wb = XLSX.utils.book_new();
    
    const wsData = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, wsData, "Dados");
    
    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instruções");

    XLSX.writeFile(wb, "template_pendencias.xlsx");
    toast.success("Template baixado!");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Pendências do Excel
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Selecione um arquivo Excel com a lista de pendências"}
            {step === "preview" && "Revise os dados antes de importar"}
            {step === "result" && "Resultado da importação"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === "upload" && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Clique para selecionar ou arraste o arquivo</p>
                <p className="text-sm text-muted-foreground mt-1">Formatos aceitos: .xlsx, .xls</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Precisa de um modelo?</p>
                      <p className="text-sm text-muted-foreground">Baixe o template com as colunas corretas</p>
                    </div>
                    <Button variant="outline" onClick={downloadTemplate}>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="py-1 px-3">
                  <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                  {validRows.length} válidas
                </Badge>
                <Badge variant="outline" className="py-1 px-3">
                  <XCircle className="h-4 w-4 mr-1 text-destructive" />
                  {invalidRows.length} inválidas
                </Badge>
                {file && (
                  <span className="text-sm text-muted-foreground">
                    Arquivo: {file.name}
                  </span>
                )}
              </div>

              <ScrollArea className="h-[400px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Linha</TableHead>
                      <TableHead>Centro</TableHead>
                      <TableHead>Visita</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Formulário</TableHead>
                      <TableHead className="min-w-[200px]">Descrição</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((row) => (
                      <TableRow 
                        key={row.rowNumber} 
                        className={row.error ? "bg-destructive/10" : row.warning ? "bg-yellow-500/10" : ""}
                      >
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>{row.isRemote ? "Remoto" : row.centro}</TableCell>
                        <TableCell>{row.isRemote ? "-" : (row.tipoVisita || "-")}</TableCell>
                        <TableCell>{row.participantCode || "-"}</TableCell>
                        <TableCell>{row.findingType || "-"}</TableCell>
                        <TableCell>{row.formName || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{row.descricao}</TableCell>
                        <TableCell>{row.responsibleName || "-"}</TableCell>
                        <TableCell>
                          {row.error ? (
                            <div className="flex items-center gap-1 text-destructive text-sm">
                              <XCircle className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{row.error}</span>
                            </div>
                          ) : row.warning ? (
                            <div className="flex items-center gap-1 text-yellow-600 text-sm">
                              <AlertCircle className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{row.warning}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-green-600 text-sm">
                              <CheckCircle2 className="h-4 w-4" />
                              OK
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {step === "result" && (
            <div className="py-8 text-center space-y-6">
              <div className="flex justify-center gap-8">
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-green-600">{importResult.success}</p>
                  <p className="text-sm text-muted-foreground">Importadas</p>
                </div>
                {importResult.failed > 0 && (
                  <div className="text-center">
                    <div className="h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                      <XCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <p className="text-3xl font-bold text-destructive">{importResult.failed}</p>
                    <p className="text-sm text-muted-foreground">Falharam</p>
                  </div>
                )}
              </div>
              <p className="text-muted-foreground">
                {importResult.success > 0 
                  ? "As pendências foram importadas com sucesso!" 
                  : "Nenhuma pendência foi importada."}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          )}
          
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetState}>Voltar</Button>
              <Button 
                onClick={handleImport} 
                disabled={validRows.length === 0 || importing}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>Importar {validRows.length} pendências</>
                )}
              </Button>
            </>
          )}
          
          {step === "result" && (
            <Button onClick={handleClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportFindingsDialog;
