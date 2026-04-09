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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, UserCheck, BookOpen, Upload } from "lucide-react";
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
}

interface TrainingRecord {
  id: string;
  training_id: string;
  user_id: string;
  user_name: string;
  completed_at: string | null;
  status: string;
  certificate_url: string | null;
}

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
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const importColumns: ColumnMapping[] = [
    { excelHeader: "Title", dbColumn: "title", required: true },
    { excelHeader: "Description", dbColumn: "description" },
    { excelHeader: "Required", dbColumn: "is_required", transform: (v: any) => v === "Yes" || v === true || v === "true" },
    { excelHeader: "Delegate Role", dbColumn: "delegate_role" },
    { excelHeader: "Due Date", dbColumn: "due_date" },
  ];
  const [form, setForm] = useState({ title: "", description: "", is_required: true, delegate_role: "", due_date: "" });
  const [recordForm, setRecordForm] = useState({ user_name: "", status: "pending", completed_at: "", certificate_url: "" });

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
    const [{ data: t }, { data: r }] = await Promise.all([
      supabase.from("trainings").select("*").eq("project_id", selectedProject).order("title"),
      supabase.from("training_records").select("*").order("user_name"),
    ]);
    setTrainings(t || []);
    const trainingIds = (t || []).map(tr => tr.id);
    setRecords((r || []).filter(rec => trainingIds.includes(rec.training_id)));
    setLoading(false);
  }, [selectedProject]);

  const handleSaveTraining = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    const payload = {
      project_id: selectedProject, title: form.title.trim(), description: form.description.trim() || null,
      is_required: form.is_required, delegate_role: form.delegate_role.trim() || null, due_date: form.due_date || null,
    };
    if (editing) {
      await supabase.from("trainings").update(payload).eq("id", editing.id);
      toast.success("Updated");
    } else {
      await supabase.from("trainings").insert(payload);
      toast.success("Created");
    }
    setDialogOpen(false); setEditing(null); loadData();
  };

  const handleSaveRecord = async () => {
    if (!recordForm.user_name.trim() || !selectedTraining) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("training_records").insert({
      training_id: selectedTraining.id, user_id: user?.id || "00000000-0000-0000-0000-000000000000",
      user_name: recordForm.user_name.trim(), status: recordForm.status,
      completed_at: recordForm.completed_at || null, certificate_url: recordForm.certificate_url.trim() || null,
    });
    toast.success("Record added");
    setRecordDialogOpen(false); loadData();
  };

  const handleDeleteTraining = async (id: string) => {
    await supabase.from("trainings").delete().eq("id", id);
    toast.success("Deleted"); loadData();
  };

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", description: "", is_required: true, delegate_role: "", due_date: "" });
    setDialogOpen(true);
  };

  const openEdit = (t: Training) => {
    setEditing(t);
    setForm({ title: t.title, description: t.description || "", is_required: t.is_required, delegate_role: t.delegate_role || "", due_date: t.due_date || "" });
    setDialogOpen(true);
  };

  const filtered = trainings.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  const exportData = filtered.map(t => {
    const recs = records.filter(r => r.training_id === t.id);
    return {
      Title: t.title, Required: t.is_required ? "Yes" : "No", "Delegate Role": t.delegate_role || "",
      "Due Date": t.due_date || "", "Total Assigned": recs.length,
      Completed: recs.filter(r => r.status === "completed").length,
      Pending: recs.filter(r => r.status === "pending").length,
    };
  });

  return (
    <ModulePageLayout title="Training Management" subtitle="Track required and completed trainings by study"
      selectedProject={selectedProject} onProjectChange={setSelectedProject} exportData={exportData} exportFileName="trainings"
      actions={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" />Import</Button><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Training</Button></div>}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <CardTitle>Trainings</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search trainings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[240px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No trainings found.</p>
          ) : (
            <div className="space-y-4">
              {filtered.map(t => {
                const recs = records.filter(r => r.training_id === t.id);
                const completed = recs.filter(r => r.status === "completed").length;
                return (
                  <Card key={t.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <h4 className="font-semibold">{t.title}</h4>
                            {t.is_required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                            {t.delegate_role && <Badge variant="secondary" className="text-xs">{t.delegate_role}</Badge>}
                          </div>
                          {t.description && <p className="text-sm text-muted-foreground mb-2">{t.description}</p>}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{completed}/{recs.length} completed</span>
                            {t.due_date && <span>Due: {t.due_date}</span>}
                          </div>
                          {recs.length > 0 && (
                            <div className="mt-3">
                              <Table>
                                <TableHeader><TableRow>
                                  <TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Completed At</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                  {recs.map(r => (
                                    <TableRow key={r.id}>
                                      <TableCell>{r.user_name}</TableCell>
                                      <TableCell><Badge className={r.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>{r.status}</Badge></TableCell>
                                      <TableCell>{r.completed_at || "-"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedTraining(t); setRecordForm({ user_name: "", status: "pending", completed_at: "", certificate_url: "" }); setRecordDialogOpen(true); }}><UserCheck className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTraining(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Training</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Delegate Role</Label><Input value={form.delegate_role} onChange={e => setForm({...form, delegate_role: e.target.value})} placeholder="e.g., CRA, PI, Coordinator" /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_required} onCheckedChange={c => setForm({...form, is_required: !!c})} />
              <Label>Required Training</Label>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveTraining}>{editing ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add Training Record</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>Person Name</Label><Input value={recordForm.user_name} onChange={e => setRecordForm({...recordForm, user_name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={recordForm.status} onChange={e => setRecordForm({...recordForm, status: e.target.value})}>
                  <option value="pending">Pending</option><option value="completed">Completed</option><option value="expired">Expired</option>
                </select>
              </div>
              <div><Label>Completed At</Label><Input type="date" value={recordForm.completed_at} onChange={e => setRecordForm({...recordForm, completed_at: e.target.value})} /></div>
            </div>
            <div><Label>Certificate URL</Label><Input value={recordForm.certificate_url} onChange={e => setRecordForm({...recordForm, certificate_url: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRecordDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveRecord}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} tableName="trainings" projectId={selectedProject} columns={importColumns} onSuccess={loadData} />
    </ModulePageLayout>
  );
}
