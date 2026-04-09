import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";

interface Visit {
  id: string;
  visit_type: string;
  scheduled_date: string;
  research_center_id: string | null;
  research_center?: {
    id: string;
    code: string;
    name: string | null;
  };
}

interface Profile {
  id: string;
  full_name: string;
}

interface Finding {
  id: string;
  visit_id: string | null;
  is_remote?: boolean;
  participant_code?: string | null;
  finding_type?: string | null;
  form_name?: string | null;
  responsible_name?: string | null;
  description: string;
  severity: string;
  status: string;
  due_date: string | null;
  resolved_at?: string | null;
  assigned_to: string | null;
  resolution: string | null;
  created_at: string;
}

interface FindingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finding?: Finding | null;
  onSuccess: () => void;
}

const FindingDialog = ({ open, onOpenChange, finding, onSuccess }: FindingDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [availableForms, setAvailableForms] = useState<string[]>([]);
  
  // Form state
  const [visitId, setVisitId] = useState<string>("");
  const [participantCode, setParticipantCode] = useState("");
  const [findingType, setFindingType] = useState("NA");
  const [formName, setFormName] = useState("");
  const [description, setDescription] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [severity, setSeverity] = useState("minor");
  const [status, setStatus] = useState("open");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [resolvedAt, setResolvedAt] = useState<Date | undefined>();
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [resolution, setResolution] = useState("");

  useEffect(() => {
    if (open) {
      loadVisitsAndProfiles();
      if (finding) {
        setVisitId(finding.is_remote ? "remoto" : (finding.visit_id || ""));
        setParticipantCode(finding.participant_code || "");
        setFindingType(finding.finding_type || "NA");
        setFormName(finding.form_name || "");
        setDescription(finding.description);
        setResponsibleName(finding.responsible_name || "");
        setSeverity(finding.severity);
        setStatus(finding.status);
        setDueDate(finding.due_date ? new Date(finding.due_date) : undefined);
        setResolvedAt(finding.resolved_at ? new Date(finding.resolved_at) : undefined);
        setAssignedTo(finding.assigned_to || "");
        setResolution(finding.resolution || "");
      } else {
        resetForm();
      }
    }
  }, [open, finding]);

  const resetForm = () => {
    setVisitId("");
    setParticipantCode("");
    setFindingType("NA");
    setFormName("");
    setDescription("");
    setResponsibleName("");
    setSeverity("minor");
    setStatus("open");
    setDueDate(undefined);
    setResolvedAt(undefined);
    setAssignedTo("");
    setResolution("");
  };

  const loadVisitsAndProfiles = async () => {
    try {
      const [visitsRes, profilesRes, formsRes] = await Promise.all([
        supabase
          .from("study_visits")
          .select(`
            id,
            visit_type,
            scheduled_date,
            research_center_id,
            project_id,
            research_center:research_centers(id, code, name)
          `)
          .order("scheduled_date", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name")
          .order("full_name"),
        supabase
          .from("study_forms")
          .select("form_name, project_id")
          .order("form_name")
      ]);

      if (visitsRes.error) throw visitsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (formsRes.error) throw formsRes.error;

      setVisits(visitsRes.data || []);
      setProfiles(profilesRes.data || []);
      
      // Get unique form names
      const uniqueForms = [...new Set((formsRes.data || []).map(f => f.form_name))];
      setAvailableForms(uniqueForms);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    }
  };

  const handleSubmit = async () => {
    if (!visitId) {
      toast.error("Selecione uma visita ou Remoto");
      return;
    }
    if (!description.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }
    if (description.trim().length > 2000) {
      toast.error("Descrição deve ter no máximo 2000 caracteres");
      return;
    }

    const isRemote = visitId === "remoto";

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const findingData = {
        visit_id: isRemote ? null : visitId,
        is_remote: isRemote,
        participant_code: participantCode.trim() || null,
        finding_type: findingType,
        form_name: formName.trim() || null,
        description: description.trim(),
        responsible_name: responsibleName.trim() || null,
        severity,
        status,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        resolved_at: status === "closed" && resolvedAt ? resolvedAt.toISOString() : (status === "closed" ? new Date().toISOString() : null),
        assigned_to: assignedTo || null,
        resolution: resolution.trim() || null
      };

      if (finding) {
        // Track changes for history
        const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];
        
        if (finding.status !== status) {
          changes.push({ field: "status", oldValue: finding.status, newValue: status });
        }
        if (finding.severity !== severity) {
          changes.push({ field: "severity", oldValue: finding.severity, newValue: severity });
        }
        if (finding.assigned_to !== (assignedTo || null)) {
          const oldAssignee = profiles.find(p => p.id === finding.assigned_to)?.full_name || finding.assigned_to;
          const newAssignee = profiles.find(p => p.id === assignedTo)?.full_name || assignedTo;
          changes.push({ field: "assigned_to", oldValue: oldAssignee || null, newValue: newAssignee || null });
        }
        if (finding.due_date !== (dueDate ? format(dueDate, "yyyy-MM-dd") : null)) {
          changes.push({ 
            field: "due_date", 
            oldValue: finding.due_date, 
            newValue: dueDate ? format(dueDate, "yyyy-MM-dd") : null 
          });
        }
        if (finding.description !== description.trim()) {
          changes.push({ field: "description", oldValue: "Descrição anterior", newValue: "Descrição atualizada" });
        }
        if ((finding.resolution || "") !== resolution.trim()) {
          changes.push({ field: "resolution", oldValue: finding.resolution, newValue: resolution.trim() || null });
        }

        const { error } = await supabase
          .from("visit_findings")
          .update(findingData)
          .eq("id", finding.id);

        if (error) throw error;

        // Insert history entries for each change
        for (const change of changes) {
          await supabase.from("finding_history").insert({
            finding_id: finding.id,
            user_id: user?.id || null,
            action: change.field === "status" ? "status_changed" : 
                   change.field === "assigned_to" ? "assigned" : "updated",
            field_changed: change.field,
            old_value: change.oldValue,
            new_value: change.newValue
          });
        }

        toast.success("Pendência atualizada com sucesso");
      } else {
        const { data: newFinding, error } = await supabase
          .from("visit_findings")
          .insert(findingData)
          .select()
          .single();

        if (error) throw error;

        // Insert creation history
        await supabase.from("finding_history").insert({
          finding_id: newFinding.id,
          user_id: user?.id || null,
          action: "created",
          field_changed: null,
          old_value: null,
          new_value: null,
          notes: "Pendência criada"
        });

        toast.success("Pendência criada com sucesso");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!finding;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Pendência" : "Nova Pendência"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Visit Selection */}
          <div className="space-y-2">
            <Label htmlFor="visit">Visita *</Label>
            <Select value={visitId} onValueChange={setVisitId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a visita" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remoto">Remoto</SelectItem>
                {visits.map((visit) => (
                  <SelectItem key={visit.id} value={visit.id}>
                    {visit.research_center?.code || "N/A"} - {visit.visit_type} ({format(new Date(visit.scheduled_date), "dd/MM/yyyy")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Participant Code and Finding Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="participantCode">Código do Participante</Label>
              <Input
                id="participantCode"
                value={participantCode}
                onChange={(e) => setParticipantCode(e.target.value)}
                placeholder="Ex: 001-001"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={findingType} onValueChange={setFindingType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Desvio">Desvio</SelectItem>
                  <SelectItem value="eCRF">eCRF</SelectItem>
                  <SelectItem value="Prontuário">Prontuário</SelectItem>
                  <SelectItem value="Violação">Violação</SelectItem>
                  <SelectItem value="Binder">Binder</SelectItem>
                  <SelectItem value="CEP">CEP</SelectItem>
                  <SelectItem value="NA">NA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Form Name */}
          <div className="space-y-2">
            <Label>Formulário</Label>
            {availableForms.length > 0 ? (
              <Select value={formName} onValueChange={setFormName}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o formulário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_other">Outro (digitar)</SelectItem>
                  {availableForms.map((form) => (
                    <SelectItem key={form} value={form}>
                      {form}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="formName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome do formulário"
                maxLength={200}
              />
            )}
            {formName === "_other" && (
              <Input
                value=""
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Digite o nome do formulário"
                maxLength={200}
                className="mt-2"
              />
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a pendência encontrada..."
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/2000
            </p>
          </div>

          {/* Responsible Name */}
          <div className="space-y-2">
            <Label htmlFor="responsibleName">Responsável (Nome)</Label>
            <Input
              id="responsibleName"
              value={responsibleName}
              onChange={(e) => setResponsibleName(e.target.value)}
              placeholder="Nome do responsável pela resolução"
              maxLength={200}
            />
          </div>

          {/* Severity and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Severidade</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Menor</SelectItem>
                  <SelectItem value="major">Maior</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="closed">Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date and Assigned To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select 
                value={assignedTo || "_none"} 
                onValueChange={(val) => setAssignedTo(val === "_none" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhum</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resolution Date and Resolution (only shown if status is closed or editing) */}
          {(status === "closed" || isEditing) && (
            <>
              {status === "closed" && (
                <div className="space-y-2">
                  <Label>Data de Conclusão</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !resolvedAt && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {resolvedAt ? format(resolvedAt, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={resolvedAt}
                        onSelect={setResolvedAt}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="resolution">Resolução</Label>
                <Textarea
                  id="resolution"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Descreva como a pendência foi resolvida..."
                  rows={3}
                  maxLength={2000}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar Alterações" : "Criar Pendência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FindingDialog;
