import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ModulePageLayout from "@/components/shared/ModulePageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Upload } from "lucide-react";
import BulkImportDialog, { ColumnMapping } from "@/components/shared/BulkImportDialog";
import { format } from "date-fns";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";

interface VisitSchedule {
  id: string;
  project_id: string;
  site_name: string;
  visit_number: number;
  planned_date: string | null;
  window_start: string | null;
  window_end: string | null;
  actual_date: string | null;
  status: string;
  observations: string | null;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  missed: "bg-red-100 text-red-800",
  rescheduled: "bg-yellow-100 text-yellow-800",
};

export default function StudyVisitSchedule() {
  const navigate = useNavigate();
  const { projectId: persistedProjectId, setProjectId } = usePersistedFilters();
  const [selectedProject, setSelectedProject] = useState(persistedProjectId || "");
  const [records, setRecords] = useState<VisitSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VisitSchedule | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const importColumns: ColumnMapping[] = [
    { excelHeader: "Site", dbColumn: "site_name", required: true },
    { excelHeader: "Visit Number", dbColumn: "visit_number", required: true, transform: (v: any) => parseInt(v) || 1 },
    { excelHeader: "Planned Date", dbColumn: "planned_date" },
    { excelHeader: "Window Start", dbColumn: "window_start" },
    { excelHeader: "Window End", dbColumn: "window_end" },
    { excelHeader: "Actual Date", dbColumn: "actual_date" },
    { excelHeader: "Status", dbColumn: "status", transform: (v: any) => v || "planned" },
    { excelHeader: "Observations", dbColumn: "observations" },
  ];
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    site_name: "", visit_number: 1, planned_date: "", window_start: "", window_end: "",
    actual_date: "", status: "scheduled", observations: "",
  });

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
    };
    check();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      setProjectId(selectedProject);
      loadData();
    }
  }, [selectedProject]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("study_visit_schedule")
      .select("*")
      .eq("project_id", selectedProject)
      .order("visit_number")
      .order("site_name");
    setRecords(data || []);
    setLoading(false);
  }, [selectedProject]);

  const handleSave = async () => {
    if (!form.site_name.trim()) { toast.error("Site name is required"); return; }
    const payload = {
      project_id: selectedProject,
      site_name: form.site_name.trim(),
      visit_number: form.visit_number,
      planned_date: form.planned_date || null,
      window_start: form.window_start || null,
      window_end: form.window_end || null,
      actual_date: form.actual_date || null,
      status: form.status,
      observations: form.observations.trim() || null,
    };

    if (editing) {
      const { error } = await supabase.from("study_visit_schedule").update(payload).eq("id", editing.id);
      if (error) { toast.error("Error updating"); return; }
      toast.success("Visit updated");
    } else {
      const { error } = await supabase.from("study_visit_schedule").insert(payload);
      if (error) { toast.error("Error creating"); return; }
      toast.success("Visit created");
    }
    setDialogOpen(false);
    setEditing(null);
    loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("study_visit_schedule").delete().eq("id", id);
    if (error) { toast.error("Error deleting"); return; }
    toast.success("Deleted");
    loadData();
  };

  const openEdit = (r: VisitSchedule) => {
    setEditing(r);
    setForm({
      site_name: r.site_name, visit_number: r.visit_number,
      planned_date: r.planned_date || "", window_start: r.window_start || "",
      window_end: r.window_end || "", actual_date: r.actual_date || "",
      status: r.status, observations: r.observations || "",
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ site_name: "", visit_number: 1, planned_date: "", window_start: "", window_end: "", actual_date: "", status: "scheduled", observations: "" });
    setDialogOpen(true);
  };

  const filtered = records.filter(r => {
    const matchSearch = r.site_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportData = filtered.map(r => ({
    Site: r.site_name, "Visit #": r.visit_number, "Planned Date": r.planned_date || "",
    "Window Start": r.window_start || "", "Window End": r.window_end || "",
    "Actual Date": r.actual_date || "", Status: r.status, Observations: r.observations || "",
  }));

  return (
    <ModulePageLayout
      title="Study Visit Schedule"
      subtitle="Track and manage planned and actual study visits"
      selectedProject={selectedProject}
      onProjectChange={setSelectedProject}
      exportData={exportData}
      exportFileName="visit_schedule"
      actions={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" />Import</Button><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Visit</Button></div>}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <CardTitle>Visits</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search site..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[200px]" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No visits found. Click "New Visit" to add one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Visit #</TableHead>
                  <TableHead>Planned Date</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Actual Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observations</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.site_name}</TableCell>
                    <TableCell>{r.visit_number}</TableCell>
                    <TableCell>{r.planned_date || "-"}</TableCell>
                    <TableCell>{r.window_start && r.window_end ? `${r.window_start} — ${r.window_end}` : "-"}</TableCell>
                    <TableCell>{r.actual_date || "-"}</TableCell>
                    <TableCell><Badge className={statusColors[r.status] || ""}>{r.status}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.observations || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Visit" : "New Visit"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Site Name</Label><Input value={form.site_name} onChange={e => setForm({...form, site_name: e.target.value})} /></div>
              <div><Label>Visit Number</Label><Input type="number" min={1} value={form.visit_number} onChange={e => setForm({...form, visit_number: parseInt(e.target.value) || 1})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Planned Date</Label><Input type="date" value={form.planned_date} onChange={e => setForm({...form, planned_date: e.target.value})} /></div>
              <div><Label>Window Start</Label><Input type="date" value={form.window_start} onChange={e => setForm({...form, window_start: e.target.value})} /></div>
              <div><Label>Window End</Label><Input type="date" value={form.window_end} onChange={e => setForm({...form, window_end: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Actual Date</Label><Input type="date" value={form.actual_date} onChange={e => setForm({...form, actual_date: e.target.value})} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Observations</Label><Textarea value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} tableName="study_visit_schedule" projectId={selectedProject} columns={importColumns} onSuccess={loadData} />
    </ModulePageLayout>
  );
}
