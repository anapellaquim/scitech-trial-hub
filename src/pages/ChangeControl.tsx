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
import { Plus, Pencil, Trash2, Search, History, Upload } from "lucide-react";
import BulkImportDialog, { ColumnMapping } from "@/components/shared/BulkImportDialog";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";

interface ChangeControlRecord {
  id: string;
  project_id: string;
  change_code: string;
  description: string;
  change_type: string;
  impact_assessment: string | null;
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

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  implemented: "bg-purple-100 text-purple-800",
  closed: "bg-gray-100 text-gray-800",
};

export default function ChangeControl() {
  const navigate = useNavigate();
  const { projectId: persistedProjectId, setProjectId } = usePersistedFilters();
  const [selectedProject, setSelectedProject] = useState(persistedProjectId || "");
  const [records, setRecords] = useState<ChangeControlRecord[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChangeControlRecord | null>(null);
  const [selectedCC, setSelectedCC] = useState<ChangeControlRecord | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const importColumns: ColumnMapping[] = [
    { excelHeader: "Change Code", dbColumn: "change_code", required: true },
    { excelHeader: "Description", dbColumn: "description", required: true },
    { excelHeader: "Type", dbColumn: "change_type", transform: (v: any) => v || "operational" },
    { excelHeader: "Impact Assessment", dbColumn: "impact_assessment" },
    { excelHeader: "Status", dbColumn: "status", transform: (v: any) => v || "open" },
    { excelHeader: "Responsible", dbColumn: "responsible" },
    { excelHeader: "Opened At", dbColumn: "opened_at", transform: (v: any) => v || new Date().toISOString().split("T")[0] },
    { excelHeader: "Resolved At", dbColumn: "resolved_at" },
  ];
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({ change_code: "", description: "", change_type: "operational", impact_assessment: "", status: "open", responsible: "", opened_at: new Date().toISOString().split("T")[0], resolved_at: "" });
  const [approvalForm, setApprovalForm] = useState({ approver_name: "", decision: "pending", decision_date: "", comments: "" });

  useEffect(() => {
    const check = async () => { const { data: { session } } = await supabase.auth.getSession(); if (!session) navigate("/auth"); };
    check();
  }, []);

  useEffect(() => { if (selectedProject) { setProjectId(selectedProject); loadData(); } }, [selectedProject]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: cc }, { data: ap }] = await Promise.all([
      supabase.from("change_controls").select("*").eq("project_id", selectedProject).order("opened_at", { ascending: false }),
      supabase.from("change_control_approvals").select("*").order("created_at"),
    ]);
    setRecords(cc || []);
    setApprovals(ap || []);
    setLoading(false);
  }, [selectedProject]);

  const handleSave = async () => {
    if (!form.change_code.trim() || !form.description.trim()) { toast.error("Code and description are required"); return; }
    const payload = {
      project_id: selectedProject, change_code: form.change_code.trim(), description: form.description.trim(),
      change_type: form.change_type, impact_assessment: form.impact_assessment.trim() || null,
      status: form.status, responsible: form.responsible.trim() || null,
      opened_at: form.opened_at, resolved_at: form.resolved_at || null,
    };
    if (editing) { await supabase.from("change_controls").update(payload).eq("id", editing.id); toast.success("Updated"); }
    else { await supabase.from("change_controls").insert(payload); toast.success("Created"); }
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

  const openNew = () => { setEditing(null); setForm({ change_code: "", description: "", change_type: "operational", impact_assessment: "", status: "open", responsible: "", opened_at: new Date().toISOString().split("T")[0], resolved_at: "" }); setDialogOpen(true); };
  const openEdit = (r: ChangeControlRecord) => { setEditing(r); setForm({ change_code: r.change_code, description: r.description, change_type: r.change_type, impact_assessment: r.impact_assessment || "", status: r.status, responsible: r.responsible || "", opened_at: r.opened_at, resolved_at: r.resolved_at || "" }); setDialogOpen(true); };

  const filtered = records.filter(r => {
    const matchSearch = r.change_code.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportData = filtered.map(r => ({
    "Change ID": r.change_code, Description: r.description, Type: r.change_type,
    "Impact Assessment": r.impact_assessment || "", Status: r.status, Responsible: r.responsible || "",
    "Opened At": r.opened_at, "Resolved At": r.resolved_at || "",
  }));

  return (
    <ModulePageLayout title="Change Control" subtitle="Track protocol, regulatory, and operational changes"
      selectedProject={selectedProject} onProjectChange={setSelectedProject} exportData={exportData} exportFileName="change_control"
      actions={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" />Import</Button><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Change</Button></div>}
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
                <TableHead>ID</TableHead><TableHead>Description</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Responsible</TableHead><TableHead>Opened</TableHead><TableHead>Resolved</TableHead><TableHead>Approvals</TableHead><TableHead className="w-[120px]">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const ccApprovals = approvals.filter(a => a.change_control_id === r.id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono font-medium">{r.change_code}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.description}</TableCell>
                      <TableCell><Badge variant="outline">{r.change_type}</Badge></TableCell>
                      <TableCell><Badge className={statusColors[r.status] || ""}>{r.status}</Badge></TableCell>
                      <TableCell>{r.responsible || "-"}</TableCell>
                      <TableCell>{r.opened_at}</TableCell>
                      <TableCell>{r.resolved_at || "-"}</TableCell>
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
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Change Control</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Change ID</Label><Input value={form.change_code} onChange={e => setForm({...form, change_code: e.target.value})} placeholder="CC-001" /></div>
              <div><Label>Type</Label>
                <Select value={form.change_type} onValueChange={v => setForm({...form, change_type: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="protocol">Protocol</SelectItem><SelectItem value="regulatory">Regulatory</SelectItem><SelectItem value="operational">Operational</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div><Label>Impact Assessment</Label><Textarea value={form.impact_assessment} onChange={e => setForm({...form, impact_assessment: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="under_review">Under Review</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="implemented">Implemented</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Responsible</Label><Input value={form.responsible} onChange={e => setForm({...form, responsible: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
