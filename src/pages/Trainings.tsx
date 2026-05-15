import { parseLocalDate, formatDateOnly, todayDateOnly } , formatInBrasilia } from "@/lib/dateUtils";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ModulePageLayout from "@/components/shared/ModulePageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Search, UserCheck, BookOpen, Upload, CalendarClock, GraduationCap, AlertTriangle, CheckCircle2 } from "lucide-react";
import BulkImportDialog, { ColumnMapping } from "@/components/shared/BulkImportDialog";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";

interface Training {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  is_required: boolean;
  delegate_role: string | null;
  due_date: string | null;
  planned_date: string | null;
  training_type: string;
  duration_hours: number | null;
  status: string;
  instructor: string | null;
}

interface TrainingRecord {
  id: string;
  training_id: string;
  user_id: string;
  user_name: string;
  team_role: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  status: string;
  certificate_url: string | null;
}

const TRAINING_TYPES = [
  { value: "initial", label: "Initial / Onboarding" },
  { value: "protocol", label: "Protocol" },
  { value: "sop", label: "SOP" },
  { value: "gcp", label: "GCP / ICH" },
  { value: "safety", label: "Safety / Pharmacovigilance" },
  { value: "refresher", label: "Refresher" },
  { value: "other", label: "Other" },
];

const TRAINING_STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const statusBadge: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-200 text-gray-700",
};

const recordStatusBadge: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
};

export default function Trainings() {
  const navigate = useNavigate();
  const { projectId: persistedProjectId, setProjectId } = usePersistedFilters();
  const [selectedProject, setSelectedProject] = useState(persistedProjectId || "");
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Training | null>(null);
  const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const importColumns: ColumnMapping[] = [
    { excelHeader: "Title", dbColumn: "title", required: true },
    { excelHeader: "Description", dbColumn: "description" },
    { excelHeader: "Required", dbColumn: "is_required", transform: (v: any) => v === "Yes" || v === true || v === "true" },
    { excelHeader: "Type", dbColumn: "training_type" },
    { excelHeader: "Delegate Role", dbColumn: "delegate_role" },
    { excelHeader: "Planned Date", dbColumn: "planned_date" },
    { excelHeader: "Due Date", dbColumn: "due_date" },
    { excelHeader: "Duration (h)", dbColumn: "duration_hours", transform: (v: any) => v ? Number(v) : null },
    { excelHeader: "Instructor", dbColumn: "instructor" },
    { excelHeader: "Status", dbColumn: "status" },
  ];

  const emptyForm = {
    title: "", description: "", is_required: true, delegate_role: "",
    planned_date: "", due_date: "", training_type: "protocol",
    duration_hours: "", status: "planned", instructor: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [recordForm, setRecordForm] = useState({
    user_name: "", team_role: "", status: "pending",
    assigned_at: format(new Date(), "yyyy-MM-dd"),
    completed_at: "", certificate_url: "",
  });

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
    };
    check();
  }, []);

  useEffect(() => {
    if (selectedProject) { setProjectId(selectedProject); loadData(); }
  }, [selectedProject]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: t } = await supabase.from("trainings").select("*").eq("project_id", selectedProject).order("planned_date", { ascending: true, nullsFirst: false });
    const trainingIds = (t || []).map(tr => tr.id);
    let recs: any[] = [];
    if (trainingIds.length) {
      const { data: r } = await supabase.from("training_records").select("*").in("training_id", trainingIds).order("user_name");
      recs = r || [];
    }
    setTrainings((t as any) || []);
    setRecords(recs as any);
    setLoading(false);
  }, [selectedProject]);

  const handleSaveTraining = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    const payload: any = {
      project_id: selectedProject,
      title: form.title.trim(),
      description: form.description.trim() || null,
      is_required: form.is_required,
      delegate_role: form.delegate_role.trim() || null,
      planned_date: form.planned_date || null,
      due_date: form.due_date || null,
      training_type: form.training_type,
      duration_hours: form.duration_hours ? Number(form.duration_hours) : null,
      status: form.status,
      instructor: form.instructor.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("trainings").update(payload).eq("id", editing.id)
      : await supabase.from("trainings").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Updated" : "Created");
    setDialogOpen(false); setEditing(null); loadData();
  };

  const handleSaveRecord = async () => {
    if (!recordForm.user_name.trim() || !selectedTraining) return;
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      training_id: selectedTraining.id,
      user_id: user?.id || "00000000-0000-0000-0000-000000000000",
      user_name: recordForm.user_name.trim(),
      team_role: recordForm.team_role.trim() || null,
      status: recordForm.status,
      assigned_at: recordForm.assigned_at || null,
      completed_at: recordForm.completed_at || null,
      certificate_url: recordForm.certificate_url.trim() || null,
    };
    const { error } = editingRecord
      ? await supabase.from("training_records").update(payload).eq("id", editingRecord.id)
      : await supabase.from("training_records").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editingRecord ? "Record updated" : "Record added");
    setRecordDialogOpen(false); setEditingRecord(null); loadData();
  };

  const handleDeleteTraining = async (id: string) => {
    if (!confirm("Delete training and all assignments?")) return;
    await supabase.from("trainings").delete().eq("id", id);
    toast.success("Deleted"); loadData();
  };

  const handleDeleteRecord = async (id: string) => {
    await supabase.from("training_records").delete().eq("id", id);
    toast.success("Removed"); loadData();
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (t: Training) => {
    setEditing(t);
    setForm({
      title: t.title, description: t.description || "", is_required: t.is_required,
      delegate_role: t.delegate_role || "",
      planned_date: t.planned_date || "", due_date: t.due_date || "",
      training_type: t.training_type || "protocol",
      duration_hours: t.duration_hours?.toString() || "",
      status: t.status || "planned",
      instructor: t.instructor || "",
    });
    setDialogOpen(true);
  };

  const openAssign = (t: Training) => {
    setSelectedTraining(t);
    setEditingRecord(null);
    setRecordForm({
      user_name: "", team_role: t.delegate_role || "", status: "pending",
      assigned_at: format(new Date(), "yyyy-MM-dd"), completed_at: "", certificate_url: "",
    });
    setRecordDialogOpen(true);
  };

  const openEditRecord = (t: Training, r: TrainingRecord) => {
    setSelectedTraining(t);
    setEditingRecord(r);
    setRecordForm({
      user_name: r.user_name, team_role: r.team_role || "",
      status: r.status,
      assigned_at: r.assigned_at || "",
      completed_at: r.completed_at ? r.completed_at.slice(0, 10) : "",
      certificate_url: r.certificate_url || "",
    });
    setRecordDialogOpen(true);
  };

  const filtered = useMemo(
    () => trainings.filter(t => t.title.toLowerCase().includes(search.toLowerCase())),
    [trainings, search]
  );

  const stats = useMemo(() => {
    const totalAssignments = records.length;
    const completedAssignments = records.filter(r => r.status === "completed").length;
    return {
      total: trainings.length,
      required: trainings.filter(t => t.is_required).length,
      planned: trainings.filter(t => t.status === "planned").length,
      completed: trainings.filter(t => t.status === "completed").length,
      assignmentCompliance: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
      overdue: trainings.filter(t => t.due_date && t.status !== "completed" && t.status !== "cancelled" && parseLocalDate(t.due_date) < new Date()).length,
    };
  }, [trainings, records]);

  const exportData = filtered.map(t => {
    const recs = records.filter(r => r.training_id === t.id);
    return {
      Title: t.title,
      Type: t.training_type,
      Required: t.is_required ? "Yes" : "No",
      Status: t.status,
      "Planned Date": t.planned_date || "",
      "Due Date": t.due_date || "",
      "Duration (h)": t.duration_hours ?? "",
      Instructor: t.instructor || "",
      "Delegate Role": t.delegate_role || "",
      Assigned: recs.length,
      Completed: recs.filter(r => r.status === "completed").length,
      Pending: recs.filter(r => r.status === "pending").length,
    };
  });

  const renderTrainingCard = (t: Training) => {
    const recs = records.filter(r => r.training_id === t.id);
    const completed = recs.filter(r => r.status === "completed").length;
    const pct = recs.length ? Math.round((completed / recs.length) * 100) : 0;
    const overdue = t.due_date && t.status !== "completed" && t.status !== "cancelled" && parseLocalDate(t.due_date) < new Date();
    return (
      <Card key={t.id} className="border">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <BookOpen className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">{t.title}</h4>
                {t.is_required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                <Badge variant="outline" className="text-xs">{TRAINING_TYPES.find(x => x.value === t.training_type)?.label ?? t.training_type}</Badge>
                <Badge className={`text-xs ${statusBadge[t.status] ?? ""}`}>{t.status.replace("_", " ")}</Badge>
                {t.delegate_role && <Badge variant="secondary" className="text-xs">{t.delegate_role}</Badge>}
                {overdue && <Badge variant="destructive" className="text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Overdue</Badge>}
              </div>
              {t.description && <p className="text-sm text-muted-foreground mb-2">{t.description}</p>}
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap mb-2">
                {t.planned_date && <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />Planned: {format(parseLocalDate(t.planned_date), "dd/MM/yyyy")}</span>}
                {t.due_date && <span>Due: {format(parseLocalDate(t.due_date), "dd/MM/yyyy")}</span>}
                {t.duration_hours != null && <span>{t.duration_hours}h</span>}
                {t.instructor && <span>Instructor: {t.instructor}</span>}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Progress value={pct} className="h-2 w-40" />
                <span className="text-xs font-medium">{completed}/{recs.length} completed ({pct}%)</span>
              </div>
              {recs.length > 0 && (
                <div className="mt-3">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Assigned</TableHead><TableHead>Status</TableHead><TableHead>Completed</TableHead><TableHead></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {recs.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.user_name}</TableCell>
                          <TableCell className="text-muted-foreground">{r.team_role || "—"}</TableCell>
                          <TableCell>{r.assigned_at ? format(parseLocalDate(r.assigned_at), "dd/MM/yyyy") : "—"}</TableCell>
                          <TableCell><Badge className={recordStatusBadge[r.status] ?? ""}>{r.status}</Badge></TableCell>
                          <TableCell>{r.completed_at ? format(parseLocalDate(r.completed_at), "dd/MM/yyyy") : "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEditRecord(t, r)}><Pencil className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord(r.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" title="Assign team member" onClick={() => openAssign(t)}><UserCheck className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteTraining(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const planning = filtered.filter(t => t.status === "planned" || t.status === "in_progress");
  const execution = filtered.filter(t => t.status === "completed" || t.status === "cancelled");

  return (
    <ModulePageLayout title="Training Management" subtitle="Plan, assign and track mandatory training for the study team"
      selectedProject={selectedProject} onProjectChange={setSelectedProject} exportData={exportData} exportFileName="trainings"
      actions={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" />Import</Button><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Training</Button></div>}
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-red-600" /><div><p className="text-2xl font-bold">{stats.required}</p><p className="text-xs text-muted-foreground">Required</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-blue-600" /><div><p className="text-2xl font-bold">{stats.planned}</p><p className="text-xs text-muted-foreground">Planned</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" /><div><p className="text-2xl font-bold">{stats.completed}</p><p className="text-xs text-muted-foreground">Completed</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-600" /><div><p className="text-2xl font-bold">{stats.overdue}</p><p className="text-xs text-muted-foreground">Overdue</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <CardTitle>Trainings</CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Team compliance: <strong>{stats.assignmentCompliance}%</strong></span>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search trainings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[240px]" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : !selectedProject ? (
            <p className="text-muted-foreground text-center py-8">Select a project to view trainings.</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No trainings found.</p>
          ) : (
            <Tabs defaultValue="planning">
              <TabsList>
                <TabsTrigger value="planning">Planning ({planning.length})</TabsTrigger>
                <TabsTrigger value="execution">Execution ({execution.length})</TabsTrigger>
                <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="planning" className="space-y-4 mt-4">
                {planning.length === 0 ? <p className="text-muted-foreground text-center py-6">Nothing planned yet.</p> : planning.map(renderTrainingCard)}
              </TabsContent>
              <TabsContent value="execution" className="space-y-4 mt-4">
                {execution.length === 0 ? <p className="text-muted-foreground text-center py-6">No executed trainings yet.</p> : execution.map(renderTrainingCard)}
              </TabsContent>
              <TabsContent value="all" className="space-y-4 mt-4">
                {filtered.map(renderTrainingCard)}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Training</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.training_type} onValueChange={v => setForm({ ...form, training_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRAINING_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRAINING_STATUSES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Delegate Role</Label><Input value={form.delegate_role} onChange={e => setForm({ ...form, delegate_role: e.target.value })} placeholder="e.g., CRA, PI, Coordinator" /></div>
              <div><Label>Instructor</Label><Input value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} /></div>
              <div><Label>Planned Date</Label><Input type="date" value={form.planned_date} onChange={e => setForm({ ...form, planned_date: e.target.value })} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
              <div><Label>Duration (hours)</Label><Input type="number" step="0.25" value={form.duration_hours} onChange={e => setForm({ ...form, duration_hours: e.target.value })} /></div>
              <div className="flex items-end gap-2">
                <Checkbox id="req" checked={form.is_required} onCheckedChange={c => setForm({ ...form, is_required: !!c })} />
                <Label htmlFor="req">Mandatory training</Label>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveTraining}>{editing ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingRecord ? "Edit" : "Assign"} Team Member{selectedTraining ? ` — ${selectedTraining.title}` : ""}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Person Name *</Label><Input value={recordForm.user_name} onChange={e => setRecordForm({ ...recordForm, user_name: e.target.value })} /></div>
              <div><Label>Team Role</Label><Input value={recordForm.team_role} onChange={e => setRecordForm({ ...recordForm, team_role: e.target.value })} placeholder="e.g., Sub-Investigator" /></div>
              <div><Label>Assigned At</Label><Input type="date" value={recordForm.assigned_at} onChange={e => setRecordForm({ ...recordForm, assigned_at: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={recordForm.status} onValueChange={v => setRecordForm({ ...recordForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Completed At</Label><Input type="date" value={recordForm.completed_at} onChange={e => setRecordForm({ ...recordForm, completed_at: e.target.value })} /></div>
              <div><Label>Certificate URL</Label><Input value={recordForm.certificate_url} onChange={e => setRecordForm({ ...recordForm, certificate_url: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRecordDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveRecord}>{editingRecord ? "Update" : "Add"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} tableName="trainings" projectId={selectedProject} columns={importColumns} onSuccess={loadData} />
    </ModulePageLayout>
  );
}
