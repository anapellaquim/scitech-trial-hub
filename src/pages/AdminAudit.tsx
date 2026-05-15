import { parseLocalDate, formatDateOnly, todayDateOnly , formatInBrasilia } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CTMSNav from "@/components/CTMSNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  History, Search, Download, Filter, Plus, Pencil, Trash2, 
  CheckCircle, XCircle, FileSignature, Eye, RefreshCw,
  FileSpreadsheet, FileText, ChevronDown, ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePermission } from "@/hooks/usePermission";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface AuditEntry {
  id: string;
  module: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_data: any;
  new_data: any;
  changed_fields: string[] | null;
  reason: string | null;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
}

const actionConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  create: { label: "Criação", icon: Plus, color: "bg-green-500" },
  update: { label: "Atualização", icon: Pencil, color: "bg-blue-500" },
  delete: { label: "Exclusão", icon: Trash2, color: "bg-red-500" },
  approve: { label: "Aprovação", icon: CheckCircle, color: "bg-emerald-500" },
  reject: { label: "Rejeição", icon: XCircle, color: "bg-orange-500" },
  sign: { label: "Assinatura", icon: FileSignature, color: "bg-purple-500" },
  export: { label: "Exportação", icon: Download, color: "bg-cyan-500" },
  read: { label: "Visualização", icon: Eye, color: "bg-gray-500" },
};

const moduleConfig: Record<string, { label: string; color: string }> = {
  study: { label: "Estudo", color: "bg-blue-500" },
  visit: { label: "Visita", color: "bg-green-500" },
  edc: { label: "EDC", color: "bg-purple-500" },
  etmf: { label: "eTMF", color: "bg-orange-500" },
  regulatory: { label: "Regulatório", color: "bg-red-500" },
  payment: { label: "Pagamento", color: "bg-yellow-500" },
  user: { label: "Usuário", color: "bg-pink-500" },
  project: { label: "Projeto", color: "bg-indigo-500" },
  participant: { label: "Participante", color: "bg-teal-500" },
  other: { label: "Outro", color: "bg-gray-500" },
};

const AdminAudit = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: permLoading } = usePermission();
  const [loading, setLoading] = useState(true);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Filters
  const [filters, setFilters] = useState({
    module: "all",
    action: "all",
    userId: "all",
    entityType: "",
    startDate: "",
    endDate: "",
    search: "",
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!permLoading) {
      fetchAuditLog();
    }
  }, [filters, page, permLoading]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchUsers();
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");
    setUsers(data || []);
  };

  const fetchAuditLog = async () => {
    setLoading(true);

    let query = supabase
      .from("system_audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (filters.module !== "all") {
      query = query.eq("module", filters.module);
    }
    if (filters.action !== "all") {
      query = query.eq("action", filters.action);
    }
    if (filters.userId !== "all") {
      query = query.eq("user_id", filters.userId);
    }
    if (filters.entityType) {
      query = query.ilike("entity_type", `%${filters.entityType}%`);
    }
    if (filters.startDate) {
      query = query.gte("created_at", parseLocalDate(filters.startDate).toISOString());
    }
    if (filters.endDate) {
      const endDate = parseLocalDate(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data, count, error } = await query;

    if (error) {
      toast.error("Erro ao carregar audit trail");
    } else {
      setAuditEntries(data || []);
      setTotalCount(count || 0);
    }

    setLoading(false);
  };

  const toggleRowExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const clearFilters = () => {
    setFilters({
      module: "all",
      action: "all",
      userId: "all",
      entityType: "",
      startDate: "",
      endDate: "",
      search: "",
    });
    setPage(0);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Relatório de Audit Trail", 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${formatInBrasilia(new Date(), "MM/dd/yyyy HH:mm")}`, 14, 30);
    doc.text(`Total de registros: ${totalCount}`, 14, 36);

    const tableData = auditEntries.map(entry => [
      format(parseLocalDate(entry.created_at), "dd/MM/yyyy HH:mm"),
      moduleConfig[entry.module]?.label || entry.module,
      actionConfig[entry.action]?.label || entry.action,
      entry.entity_type,
      entry.user_name || entry.user_email || "Sistema",
      entry.changed_fields?.join(", ") || "-",
    ]);

    autoTable(doc, {
      head: [["Data/Hora", "Módulo", "Ação", "Entidade", "Usuário", "Campos Alterados"]],
      body: tableData,
      startY: 42,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`audit-trail-${todayDateOnly()}.pdf`);
    toast.success("PDF exportado com sucesso");
  };

  const exportToExcel = () => {
    const data = auditEntries.map(entry => ({
      "Data/Hora": format(parseLocalDate(entry.created_at), "dd/MM/yyyy HH:mm:ss"),
      "Módulo": moduleConfig[entry.module]?.label || entry.module,
      "Ação": actionConfig[entry.action]?.label || entry.action,
      "Tipo de Entidade": entry.entity_type,
      "ID da Entidade": entry.entity_id,
      "Usuário": entry.user_name || entry.user_email || "Sistema",
      "Email": entry.user_email || "-",
      "Campos Alterados": entry.changed_fields?.join(", ") || "-",
      "Motivo": entry.reason || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Trail");
    XLSX.writeFile(wb, `audit-trail-${todayDateOnly()}.xlsx`);
    toast.success("Excel exportado com sucesso");
  };

  const getActionBadge = (action: string) => {
    const config = actionConfig[action] || { label: action, icon: History, color: "bg-gray-500" };
    const Icon = config.icon;
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getModuleBadge = (module: string) => {
    const config = moduleConfig[module] || { label: module, color: "bg-gray-500" };
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const renderDataDiff = (entry: AuditEntry) => {
    if (!entry.old_data && !entry.new_data) return null;
    
    const changedFields = entry.changed_fields || [];
    
    return (
      <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
        <h4 className="font-medium text-sm">Detalhes da Alteração</h4>
        
        {entry.action === "create" && entry.new_data && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Dados criados:</p>
            <pre className="text-xs bg-green-500/10 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(entry.new_data, null, 2)}
            </pre>
          </div>
        )}

        {entry.action === "delete" && entry.old_data && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Dados excluídos:</p>
            <pre className="text-xs bg-red-500/10 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(entry.old_data, null, 2)}
            </pre>
          </div>
        )}

        {entry.action === "update" && changedFields.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Campos alterados:</p>
            <div className="grid gap-2">
              {changedFields.map((field) => (
                <div key={field} className="flex items-start gap-4 text-xs">
                  <span className="font-medium min-w-[120px]">{field}:</span>
                  <div className="flex items-center gap-2">
                    <span className="bg-red-500/10 px-2 py-1 rounded line-through">
                      {JSON.stringify(entry.old_data?.[field]) || "null"}
                    </span>
                    <span>→</span>
                    <span className="bg-green-500/10 px-2 py-1 rounded">
                      {JSON.stringify(entry.new_data?.[field]) || "null"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {entry.reason && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">Motivo:</p>
            <p className="text-sm">{entry.reason}</p>
          </div>
        )}
      </div>
    );
  };

  if (loading && auditEntries.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <CTMSNav />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Audit Trail</h1>
              <p className="text-muted-foreground">
                {totalCount.toLocaleString()} registros de auditoria
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchAuditLog()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Módulo</Label>
                <Select
                  value={filters.module}
                  onValueChange={(v) => { setFilters({ ...filters, module: v }); setPage(0); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(moduleConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Ação</Label>
                <Select
                  value={filters.action}
                  onValueChange={(v) => { setFilters({ ...filters, action: v }); setPage(0); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(actionConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Usuário</Label>
                <Select
                  value={filters.userId}
                  onValueChange={(v) => { setFilters({ ...filters, userId: v }); setPage(0); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Tipo de Entidade</Label>
                <Input
                  placeholder="Ex: studies, tasks..."
                  value={filters.entityType}
                  onChange={(e) => { setFilters({ ...filters, entityType: e.target.value }); setPage(0); }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Data Início</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => { setFilters({ ...filters, startDate: e.target.value }); setPage(0); }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Data Fim</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => { setFilters({ ...filters, endDate: e.target.value }); setPage(0); }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Campos Alterados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : auditEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhum registro encontrado</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditEntries.map((entry) => (
                      <>
                        <TableRow 
                          key={entry.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRowExpand(entry.id)}
                        >
                          <TableCell>
                            {expandedRows.has(entry.id) ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(parseLocalDate(entry.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{getModuleBadge(entry.module)}</TableCell>
                          <TableCell>{getActionBadge(entry.action)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{entry.entity_type}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {entry.entity_id}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{entry.user_name || "Sistema"}</p>
                              <p className="text-xs text-muted-foreground">{entry.user_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {entry.changed_fields && entry.changed_fields.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {entry.changed_fields.slice(0, 3).map((field) => (
                                  <Badge key={field} variant="outline" className="text-xs">
                                    {field}
                                  </Badge>
                                ))}
                                {entry.changed_fields.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{entry.changed_fields.length - 3}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                        {expandedRows.has(entry.id) && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/30">
                              {renderDataDiff(entry)}
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalCount)} de {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * pageSize >= totalCount}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAudit;
