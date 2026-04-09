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
import { usePersistedFilters } from "@/hooks/usePersistedFilters";

interface Decision {
  id: string;
  project_id: string;
  decision_code: string;
  meeting_origin: string | null;
  decision_date: string;
  description: string;
  impacted_area: string | null;
  responsible: string | null;
  deadline: string | null;
  status: string;
  observations: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  implemented: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function SteeringDecisions() {
  const navigate = useNavigate();
  const { projectId: persistedProjectId, setProjectId } = usePersistedFilters();
  const [selectedProject, setSelectedProject] = useState(persistedProjectId || "");
  const [records, setRecords] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Decision | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const importColumns: ColumnMapping[] = [
    { excelHeader: "Decision Code", dbColumn: "decision_code", required: true },
    { excelHeader: "Description", dbColumn: "description", required: true },
    { excelHeader: "Meeting Origin", dbColumn: "meeting_origin" },
    { excelHeader: "Decision Date", dbColumn: "decision_date", transform: (v: any) => v || new Date().toISOString().split("T")[0] },
    { excelHeader: "Impacted Area", dbColumn: "impacted_area" },
    { excelHeader: "Responsible", dbColumn: "responsible" },
    { excelHeader: "Deadline", dbColumn: "deadline" },
    { excelHeader: "Status", dbColumn: "status", transform: (v: any) => v || "pending" },
    { excelHeader: "Observations", dbColumn: "observations" },
  ];
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    decision_code: "", meeting_origin: "", decision_date: new Date().toISOString().split("T")[0],
    description: "", impacted_area: "", responsible: "", deadline: "", status: "pending", observations: "",
  });

  useEffect(() => { const check = async () => { const { data: { session } } = await supabase.auth.getSession(); if (!session) navigate("/auth"); }; check(); }, []);
  useEffect(() => { if (selectedProject) { setProjectId(selectedProject); loadData(); } }, [selectedProject]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("steering_decisions").select("*").eq("project_id", selectedProject).order("decision_date", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  }, [selectedProject]);

  const handleSave = async () => {
    if (!form.decision_code.trim() || !form.description.trim()) { toast.error("Code and description are required"); return; }
    const payload = {
      project_id: selectedProject, decision_code: form.decision_code.trim(), meeting_origin: form.meeting_origin.trim() || null,
      decision_date: form.decision_date, description: form.description.trim(), impacted_area: form.impacted_area.trim() || null,
      responsible: form.responsible.trim() || null, deadline: form.deadline || null, status: form.status,
      observations: form.observations.trim() || null,
    };
    if (editing) { await supabase.from("steering_decisions").update(payload).eq("id", editing.id); toast.success("Updated"); }
    else { await supabase.from("steering_decisions").insert(payload); toast.success("Created"); }
    setDialogOpen(false); setEditing(null); loadData();
  };

  const handleDelete = async (id: string) => { await supabase.from("steering_decisions").delete().eq("id", id); toast.success("Deleted"); loadData(); };

  const openNew = () => { setEditing(null); setForm({ decision_code: "", meeting_origin: "", decision_date: new Date().toISOString().split("T")[0], description: "", impacted_area: "", responsible: "", deadline: "", status: "pending", observations: "" }); setDialogOpen(true); };
  const openEdit = (r: Decision) => { setEditing(r); setForm({ decision_code: r.decision_code, meeting_origin: r.meeting_origin || "", decision_date: r.decision_date, description: r.description, impacted_area: r.impacted_area || "", responsible: r.responsible || "", deadline: r.deadline || "", status: r.status, observations: r.observations || "" }); setDialogOpen(true); };

  const filtered = records.filter(r => {
    const matchSearch = r.decision_code.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportData = filtered.map(r => ({
    "Decision ID": r.decision_code, "Meeting Origin": r.meeting_origin || "", Date: r.decision_date,
    Description: r.description, "Impacted Area": r.impacted_area || "", Responsible: r.responsible || "",
    Deadline: r.deadline || "", Status: r.status, Observations: r.observations || "",
  }));

  return (
    <ModulePageLayout title="Steering Committee Decisions" subtitle="Track strategic decisions and implementation status"
      selectedProject={selectedProject} onProjectChange={setSelectedProject} exportData={exportData} exportFileName="steering_decisions"
      actions={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" />Import</Button><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Decision</Button></div>}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <CardTitle>Decisions</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[200px]" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="implemented">Implemented</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No decisions found.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>ID</TableHead><TableHead>Description</TableHead><TableHead>Meeting</TableHead><TableHead>Date</TableHead><TableHead>Impacted Area</TableHead><TableHead>Responsible</TableHead><TableHead>Deadline</TableHead><TableHead>Status</TableHead><TableHead className="w-[100px]">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-medium">{r.decision_code}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.description}</TableCell>
                    <TableCell>{r.meeting_origin || "-"}</TableCell>
                    <TableCell>{r.decision_date}</TableCell>
                    <TableCell>{r.impacted_area || "-"}</TableCell>
                    <TableCell>{r.responsible || "-"}</TableCell>
                    <TableCell>{r.deadline || "-"}</TableCell>
                    <TableCell><Badge className={statusColors[r.status] || ""}>{r.status}</Badge></TableCell>
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
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Decision</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Decision ID</Label><Input value={form.decision_code} onChange={e => setForm({...form, decision_code: e.target.value})} placeholder="SD-001" /></div>
              <div><Label>Meeting Origin</Label><Input value={form.meeting_origin} onChange={e => setForm({...form, meeting_origin: e.target.value})} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Decision Date</Label><Input type="date" value={form.decision_date} onChange={e => setForm({...form, decision_date: e.target.value})} /></div>
              <div><Label>Impacted Area</Label><Input value={form.impacted_area} onChange={e => setForm({...form, impacted_area: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Responsible</Label><Input value={form.responsible} onChange={e => setForm({...form, responsible: e.target.value})} /></div>
              <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="implemented">Implemented</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Observations</Label><Textarea value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} tableName="steering_decisions" projectId={selectedProject} columns={importColumns} onSuccess={loadData} />
    </ModulePageLayout>
  );
}
