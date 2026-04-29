import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ModulePageLayout from "@/components/shared/ModulePageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, History, Upload, X } from "lucide-react";
import BulkImportDialog, { ColumnMapping } from "@/components/shared/BulkImportDialog";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";

interface ChangeControlRecord {
  id: string;
  project_id: string | null;
  change_code: string;
  description: string;
  change_type: string;
  impact_assessment: string | null;
  affected_documents: string | null;
  impact_areas: string[] | null;
  requester: string | null;
  change_reason: string | null;
  requires_training: boolean;
  requires_communication: boolean;
  status: string;
  responsible: string | null;
  opened_at: string;
  resolved_at: string | null;
}

interface Approval {
  id: string;
  change_control_id: string;
  approver_name: string;
  decision: string;
  decision_date: string | null;
  comments: string | null;
}

interface ActionItem {
  id?: string;
  change_control_id?: string;
  action_description: string;
  responsible: string;
  due_date: string;
  status: string;
  display_order: number;
  _isNew?: boolean;
}

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  implemented: "bg-purple-100 text-purple-800",
  closed: "bg-gray-100 text-gray-800",
};

const TYPE_OPTIONS = [
  { value: "protocol", label: "Protocol" },
  { value: "regulatory", label: "Regulatory" },
  { value: "operational", label: "Operational" },
  { value: "systems", label: "Sistemas (CTMS/EDC/eTMF)" },
  { value: "vendor", label: "Fornecedor/Vendor" },
  { value: "schedule", label: "Cronograma" },
];

const IMPACT_AREAS = [
  { value: "participant_safety", label: "Segurança do Participante" },
  { value: "data", label: "Dados" },
  { value: "regulatory_ethical", label: "Regulatório/Ético" },
  { value: "schedule", label: "Cronograma" },
  { value: "budget", label: "Orçamento" },
  { value: "systems", label: "Sistemas (CTMS/EDC/eTMF)" },
  { value: "other", label: "Outros" },
];

const GENERAL_VALUE = "__general__";

const emptyForm = {
  project_id: "" as string,
  change_code: "",
  description: "",
  change_type: "operational",
  requester: "",
  change_reason: "",
  affected_documents: "",
  impact_areas: [] as string[],
  requires_training: false,
  requires_communication: false,
  status: "open",
  responsible: "",
  opened_at: todayDateOnly(),
  resolved_at: "",
};

export default function ChangeControl() {
  const navigate = useNavigate();
  const { projectId: persistedProjectId, setProjectId } = usePersistedFilters();
  const [selectedProject, setSelectedProject] = useState(persistedProjectId || "all");
  const [projects, setProjects] = useState<{ id: string; title: string; protocol_number: string | null }[]>([]);
  const [records, setRecords] = useState<ChangeControlRecord[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [allActions, setAllActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChangeControlRecord | null>(null);
  const [selectedCC, setSelectedCC] = useState<ChangeControlRecord | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  const importColumns: ColumnMapping[] = [
    { excelHeader: "Change Code", dbColumn: "change_code", required: true },
    { excelHeader: "Description", dbColumn: "description", required: true },
    { excelHeader: "Type", dbColumn: "change_type", transform: (v: any) => v || "operational" },
    { excelHeader: "Requester", dbColumn: "requester" },
    { excelHeader: "Change Reason", dbColumn: "change_reason" },
    { excelHeader: "Affected Documents/Processes", dbColumn: "affected_documents" },
    { excelHeader: "Status", dbColumn: "status", transform: (v: any) => v || "open" },
    { excelHeader: "Responsible", dbColumn: "responsible" },
    { excelHeader: "Opened At", dbColumn: "opened_at", transform: (v: any) => v || todayDateOnly() },
    { excelHeader: "Resolved At", dbColumn: "resolved_at" },
  ];
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const [approvalForm, setApprovalForm] = useState({ approver_name: "", decision: "pending", decision_date: "", comments: "" });

  useEffect(() => {
    const check = async () => { const { data: { session } } = await supabase.auth.getSession(); if (!session) navigate("/auth"); };
    check();
  }, []);

  useEffect(() => {
    supabase.from("projects").select("id, title, protocol_number").order("title").then(({ data }) => setProjects(data || []));
  }, []);

  useEffect(() => {
    if (selectedProject) { setProjectId(selectedProject); loadData(); }
  }, [selectedProject]);

  const loadData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("change_controls").select("*").order("opened_at", { ascending: false });
    if (selectedProject === GENERAL_VALUE) {
      query = query.is("project_id", null);
    } else if (selectedProject && selectedProject !== "all") {
      query = query.eq("project_id", selectedProject);
    }
    const [{ data: cc }, { data: ap }, { data: acts }] = await Promise.all([
      query,
      supabase.from("change_control_approvals").select("*").order("created_at"),
      supabase.from("change_control_actions" as any).select("*").order("display_order"),
    ]);
    setRecords((cc as any) || []);
    setApprovals(ap || []);
    setAllActions((acts as any) || []);
    setLoading(false);
  }, [selectedProject]);

  const toggleImpactArea = (area: string) => {
    setForm(f => ({
      ...f,
      impact_areas: f.impact_areas.includes(area) ? f.impact_areas.filter(a => a !== area) : [...f.impact_areas, area],
    }));
  };

  const addActionItem = () => {
    setActionItems(items => [...items, { action_description: "", responsible: "", due_date: "", status: "pending", display_order: items.length, _isNew: true }]);
  };

  const updateActionItem = (idx: number, patch: Partial<ActionItem>) => {
    setActionItems(items => items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const removeActionItem = (idx: number) => {
    setActionItems(items => items.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.change_code.trim() || !form.description.trim()) { toast.error("Code and description are required"); return; }
    const payload: any = {
      project_id: form.project_id && form.project_id !== GENERAL_VALUE ? form.project_id : null,
      change_code: form.change_code.trim(),
      description: form.description.trim(),
      change_type: form.change_type,
      requester: form.requester.trim() || null,
      change_reason: form.change_reason.trim() || null,
      affected_documents: form.affected_documents.trim() || null,
      impact_assessment: form.affected_documents.trim() || null, // keep legacy field in sync
      impact_areas: form.impact_areas,
      requires_training: form.requires_training,
      requires_communication: form.requires_communication,
      status: form.status,
      responsible: form.responsible.trim() || null,
      opened_at: form.opened_at,
      resolved_at: form.resolved_at || null,
    };

    let ccId = editing?.id;
    if (editing) {
      await supabase.from("change_controls").update(payload).eq("id", editing.id);
    } else {
      const { data, error } = await supabase.from("change_controls").insert(payload).select().single();
      if (error) { toast.error(error.message); return; }
      ccId = data.id;
    }

    if (ccId) {
      // Replace action items: delete existing for this CC then insert all
      await supabase.from("change_control_actions" as any).delete().eq("change_control_id", ccId);
      const validActions = actionItems.filter(a => a.action_description.trim());
      if (validActions.length > 0) {
        await supabase.from("change_control_actions" as any).insert(
          validActions.map((a, i) => ({
            change_control_id: ccId,
            action_description: a.action_description.trim(),
            responsible: a.responsible.trim() || null,
            due_date: a.due_date || null,
            status: a.status || "pending",
            display_order: i,
          }))
        );
      }
    }

    toast.success(editing ? "Updated" : "Created");
    setDialogOpen(false); setEditing(null); loadData();
  };

  const handleAddApproval = async () => {
    if (!approvalForm.approver_name.trim() || !selectedCC) return;
    await supabase.from("change_control_approvals").insert({
      change_control_id: selectedCC.id, approver_name: approvalForm.approver_name.trim(),
      decision: approvalForm.decision, decision_date: approvalForm.decision_date || null,
      comments: approvalForm.comments.trim() || null,
    });
    toast.success("Approval added"); setApprovalDialogOpen(false); loadData();
  };

  const handleDelete = async (id: string) => { await supabase.from("change_controls").delete().eq("id", id); toast.success("Deleted"); loadData(); };

  const openNew = () => {
    setEditing(null);
    const initialProject = !selectedProject || selectedProject === "all" ? GENERAL_VALUE : selectedProject;
    setForm({ ...emptyForm, project_id: initialProject });
    setActionItems([]);
    setDialogOpen(true);
  };

  const openEdit = (r: ChangeControlRecord) => {
    setEditing(r);
    setForm({
      project_id: r.project_id || GENERAL_VALUE,
      change_code: r.change_code,
      description: r.description,
      change_type: r.change_type,
      requester: r.requester || "",
      change_reason: r.change_reason || "",
      affected_documents: r.affected_documents || r.impact_assessment || "",
      impact_areas: r.impact_areas || [],
      requires_training: r.requires_training || false,
      requires_communication: r.requires_communication || false,
      status: r.status,
      responsible: r.responsible || "",
      opened_at: r.opened_at,
      resolved_at: r.resolved_at || "",
    });
    setActionItems(allActions.filter(a => a.change_control_id === r.id).map(a => ({ ...a })));
    setDialogOpen(true);
  };

  const filtered = records.filter(r => {
    const matchSearch = r.change_code.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportData = filtered.map(r => ({
    "Change ID": r.change_code,
    Description: r.description,
    Type: r.change_type,
    Requester: r.requester || "",
    "Change Reason": r.change_reason || "",
    "Affected Documents/Processes": r.affected_documents || r.impact_assessment || "",
    "Impact Areas": (r.impact_areas || []).join(", "),
    "Requires Training": r.requires_training ? "Yes" : "No",
    "Requires Communication": r.requires_communication ? "Yes" : "No",
    Status: r.status,
    Responsible: r.responsible || "",
    "Opened At": r.opened_at,
    "Resolved At": r.resolved_at || "",
  }));

  const projectLabel = (pid: string | null) => {
    if (!pid) return "General";
    const p = projects.find(x => x.id === pid);
    return p ? (p.protocol_number || p.title) : "—";
  };

  return (
    <ModulePageLayout title="Change Control" subtitle="Track protocol, regulatory, and operational changes (general or per project)"
      selectedProject={selectedProject} onProjectChange={setSelectedProject} exportData={exportData} exportFileName="change_control"
      showAllOption
      showGeneralOption
      generalValue={GENERAL_VALUE}
      generalLabel="General (no project)"
      actions={<div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" />Import</Button>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Change</Button>
      </div>}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <CardTitle>Changes</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[200px]" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="under_review">Under Review</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="implemented">Implemented</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No changes found.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>ID</TableHead><TableHead>Project</TableHead><TableHead>Description</TableHead><TableHead>Type</TableHead><TableHead>Requester</TableHead><TableHead>Status</TableHead><TableHead>Responsible</TableHead><TableHead>Opened</TableHead><TableHead>Actions Plan</TableHead><TableHead>Approvals</TableHead><TableHead className="w-[120px]">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const ccApprovals = approvals.filter(a => a.change_control_id === r.id);
                  const ccActions = allActions.filter(a => a.change_control_id === r.id);
                  const typeLabel = TYPE_OPTIONS.find(t => t.value === r.change_type)?.label || r.change_type;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-medium">{r.change_code}</TableCell>
                      <TableCell>{r.project_id ? <Badge variant="outline">{projectLabel(r.project_id)}</Badge> : <Badge>General</Badge>}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.description}</TableCell>
                      <TableCell><Badge variant="outline">{typeLabel}</Badge></TableCell>
                      <TableCell>{r.requester || "-"}</TableCell>
                      <TableCell><Badge className={statusColors[r.status] || ""}>{r.status}</Badge></TableCell>
                      <TableCell>{r.responsible || "-"}</TableCell>
                      <TableCell>{r.opened_at}</TableCell>
                      <TableCell>{ccActions.length > 0 ? `${ccActions.filter(a => a.status === "completed").length}/${ccActions.length}` : "-"}</TableCell>
                      <TableCell>{ccApprovals.length > 0 ? `${ccApprovals.filter(a => a.decision === "approved").length}/${ccApprovals.length}` : "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedCC(r); setApprovalForm({ approver_name: "", decision: "pending", decision_date: "", comments: "" }); setApprovalDialogOpen(true); }}><History className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Change Control</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Project / Scope</Label>
              <Select value={form.project_id || GENERAL_VALUE} onValueChange={v => setForm({...form, project_id: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENERAL_VALUE}>General (no project)</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.protocol_number || p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Change ID</Label><Input value={form.change_code} onChange={e => setForm({...form, change_code: e.target.value})} placeholder="CC-001" /></div>
              <div><Label>Type</Label>
                <Select value={form.change_type} onValueChange={v => setForm({...form, change_type: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Solicitante</Label><Input value={form.requester} onChange={e => setForm({...form, requester: e.target.value})} placeholder="Nome do solicitante" /></div>
              <div><Label>Responsible</Label><Input value={form.responsible} onChange={e => setForm({...form, responsible: e.target.value})} /></div>
            </div>

            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>

            <div><Label>Motivo da Mudança</Label><Textarea value={form.change_reason} onChange={e => setForm({...form, change_reason: e.target.value})} placeholder="Por que essa mudança é necessária?" /></div>

            <div><Label>Documentos/Processos Afetados</Label><Textarea value={form.affected_documents} onChange={e => setForm({...form, affected_documents: e.target.value})} placeholder="Liste documentos, SOPs e processos impactados" /></div>

            <div>
              <Label>Avaliação do Impacto</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 p-3 border rounded-md">
                {IMPACT_AREAS.map(area => (
                  <label key={area.value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={form.impact_areas.includes(area.value)}
                      onCheckedChange={() => toggleImpactArea(area.value)}
                    />
                    {area.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-3 border rounded-md">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={form.requires_training}
                  onCheckedChange={(v) => setForm({...form, requires_training: !!v})}
                />
                Necessidade de Treinamento
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={form.requires_communication}
                  onCheckedChange={(v) => setForm({...form, requires_communication: !!v})}
                />
                Necessidade de Comunicação
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Plano de Ação</Label>
                <Button type="button" size="sm" variant="outline" onClick={addActionItem}><Plus className="h-3 w-3 mr-1" />Add Ação</Button>
              </div>
              {actionItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">Nenhuma ação cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  {actionItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-start p-2 border rounded-md">
                      <Textarea
                        className="col-span-5 min-h-[40px]"
                        placeholder="Descrição da ação"
                        value={item.action_description}
                        onChange={e => updateActionItem(idx, { action_description: e.target.value })}
                      />
                      <Input
                        className="col-span-3"
                        placeholder="Responsável"
                        value={item.responsible}
                        onChange={e => updateActionItem(idx, { responsible: e.target.value })}
                      />
                      <Input
                        className="col-span-2"
                        type="date"
                        value={item.due_date}
                        onChange={e => updateActionItem(idx, { due_date: e.target.value })}
                      />
                      <Select value={item.status} onValueChange={v => updateActionItem(idx, { status: v })}>
                        <SelectTrigger className="col-span-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="in_progress">Em andamento</SelectItem>
                          <SelectItem value="completed">Concluída</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => removeActionItem(idx)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="under_review">Under Review</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="implemented">Implemented</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Opened At</Label><Input type="date" value={form.opened_at} onChange={e => setForm({...form, opened_at: e.target.value})} /></div>
              <div><Label>Resolved At</Label><Input type="date" value={form.resolved_at} onChange={e => setForm({...form, resolved_at: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add Approval — {selectedCC?.change_code}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>Approver Name</Label><Input value={approvalForm.approver_name} onChange={e => setApprovalForm({...approvalForm, approver_name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Decision</Label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={approvalForm.decision} onChange={e => setApprovalForm({...approvalForm, decision: e.target.value})}>
                  <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
                </select>
              </div>
              <div><Label>Date</Label><Input type="date" value={approvalForm.decision_date} onChange={e => setApprovalForm({...approvalForm, decision_date: e.target.value})} /></div>
            </div>
            <div><Label>Comments</Label><Textarea value={approvalForm.comments} onChange={e => setApprovalForm({...approvalForm, comments: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>Cancel</Button><Button onClick={handleAddApproval}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} tableName="change_controls" projectId={selectedProject} columns={importColumns} onSuccess={loadData} />
    </ModulePageLayout>
  );
}
