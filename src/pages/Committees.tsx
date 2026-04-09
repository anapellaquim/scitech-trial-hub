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
import { Plus, Pencil, Trash2, Search, Users, MessageSquare, Upload } from "lucide-react";
import BulkImportDialog, { ColumnMapping } from "@/components/shared/BulkImportDialog";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";

interface Committee {
  id: string;
  project_id: string;
  committee_type: string;
  meeting_number: number;
  meeting_date: string;
  agenda: string | null;
  status: string;
  next_meeting_date: string | null;
}

interface Attendee { id: string; committee_id: string; member_name: string; present: boolean; }
interface Deliberation { id: string; committee_id: string; content: string; }

const statusColors: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  minutes_pending: "bg-yellow-100 text-yellow-800",
  finalized: "bg-purple-100 text-purple-800",
};

export default function Committees() {
  const navigate = useNavigate();
  const { projectId: persistedProjectId, setProjectId } = usePersistedFilters();
  const [selectedProject, setSelectedProject] = useState(persistedProjectId || "");
  const [records, setRecords] = useState<Committee[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [deliberations, setDeliberations] = useState<Deliberation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Committee | null>(null);
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState({ committee_type: "CEC", meeting_number: 1, meeting_date: "", agenda: "", status: "planned", next_meeting_date: "" });
  const [newAttendee, setNewAttendee] = useState("");
  const [newDeliberation, setNewDeliberation] = useState("");

  useEffect(() => { const check = async () => { const { data: { session } } = await supabase.auth.getSession(); if (!session) navigate("/auth"); }; check(); }, []);
  useEffect(() => { if (selectedProject) { setProjectId(selectedProject); loadData(); } }, [selectedProject]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: a }, { data: d }] = await Promise.all([
      supabase.from("committees").select("*").eq("project_id", selectedProject).order("meeting_date", { ascending: false }),
      supabase.from("committee_attendees").select("*"),
      supabase.from("committee_deliberations").select("*"),
    ]);
    setRecords(c || []);
    setAttendees(a || []);
    setDeliberations(d || []);
    setLoading(false);
  }, [selectedProject]);

  const handleSave = async () => {
    if (!form.meeting_date) { toast.error("Meeting date is required"); return; }
    const payload = {
      project_id: selectedProject, committee_type: form.committee_type, meeting_number: form.meeting_number,
      meeting_date: form.meeting_date, agenda: form.agenda.trim() || null, status: form.status,
      next_meeting_date: form.next_meeting_date || null,
    };
    if (editing) { await supabase.from("committees").update(payload).eq("id", editing.id); toast.success("Updated"); }
    else { await supabase.from("committees").insert(payload); toast.success("Created"); }
    setDialogOpen(false); setEditing(null); loadData();
  };

  const handleDelete = async (id: string) => { await supabase.from("committees").delete().eq("id", id); toast.success("Deleted"); loadData(); };

  const addAttendee = async () => {
    if (!newAttendee.trim() || !selectedCommittee) return;
    await supabase.from("committee_attendees").insert({ committee_id: selectedCommittee.id, member_name: newAttendee.trim(), present: true });
    setNewAttendee(""); loadData();
  };

  const addDeliberation = async () => {
    if (!newDeliberation.trim() || !selectedCommittee) return;
    await supabase.from("committee_deliberations").insert({ committee_id: selectedCommittee.id, content: newDeliberation.trim() });
    setNewDeliberation(""); loadData();
  };

  const openNew = () => { setEditing(null); setForm({ committee_type: "CEC", meeting_number: (records.length || 0) + 1, meeting_date: "", agenda: "", status: "planned", next_meeting_date: "" }); setDialogOpen(true); };
  const openEdit = (r: Committee) => { setEditing(r); setForm({ committee_type: r.committee_type, meeting_number: r.meeting_number, meeting_date: r.meeting_date, agenda: r.agenda || "", status: r.status, next_meeting_date: r.next_meeting_date || "" }); setDialogOpen(true); };
  const openDetail = (r: Committee) => { setSelectedCommittee(r); setDetailDialogOpen(true); };

  const filtered = records.filter(r => {
    const matchSearch = (r.agenda || "").toLowerCase().includes(search.toLowerCase()) || r.committee_type.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || r.committee_type === typeFilter;
    return matchSearch && matchType;
  });

  const exportData = filtered.map(r => {
    const att = attendees.filter(a => a.committee_id === r.id);
    const del = deliberations.filter(d => d.committee_id === r.id);
    return {
      Type: r.committee_type, "Meeting #": r.meeting_number, Date: r.meeting_date,
      Status: r.status, Agenda: r.agenda || "", "Next Meeting": r.next_meeting_date || "",
      Attendees: att.map(a => a.member_name).join(", "),
      Deliberations: del.map(d => d.content).join("; "),
    };
  });

  return (
    <ModulePageLayout title="Committee Management" subtitle="CEC and DMC meetings, deliberations, and minutes"
      selectedProject={selectedProject} onProjectChange={setSelectedProject} exportData={exportData} exportFileName="committees"
      actions={<Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Meeting</Button>}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <CardTitle>Meetings</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[200px]" /></div>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="CEC">CEC</SelectItem><SelectItem value="DMC">DMC</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No meetings found.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Type</TableHead><TableHead>Meeting #</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Attendees</TableHead><TableHead>Deliberations</TableHead><TableHead>Next Meeting</TableHead><TableHead className="w-[120px]">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const att = attendees.filter(a => a.committee_id === r.id);
                  const del = deliberations.filter(d => d.committee_id === r.id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell><Badge variant="outline">{r.committee_type}</Badge></TableCell>
                      <TableCell>{r.meeting_number}</TableCell>
                      <TableCell>{r.meeting_date}</TableCell>
                      <TableCell><Badge className={statusColors[r.status] || ""}>{r.status}</Badge></TableCell>
                      <TableCell>{att.length}</TableCell>
                      <TableCell>{del.length}</TableCell>
                      <TableCell>{r.next_meeting_date || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openDetail(r)}><MessageSquare className="h-4 w-4" /></Button>
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
        <DialogContent><DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Meeting</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Committee Type</Label>
                <Select value={form.committee_type} onValueChange={v => setForm({...form, committee_type: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="CEC">CEC</SelectItem><SelectItem value="DMC">DMC</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Meeting Number</Label><Input type="number" min={1} value={form.meeting_number} onChange={e => setForm({...form, meeting_number: parseInt(e.target.value) || 1})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Meeting Date</Label><Input type="date" value={form.meeting_date} onChange={e => setForm({...form, meeting_date: e.target.value})} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="planned">Planned</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="minutes_pending">Minutes Pending</SelectItem><SelectItem value="finalized">Finalized</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Agenda</Label><Textarea value={form.agenda} onChange={e => setForm({...form, agenda: e.target.value})} /></div>
            <div><Label>Next Meeting Date</Label><Input type="date" value={form.next_meeting_date} onChange={e => setForm({...form, next_meeting_date: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{selectedCommittee?.committee_type} — Meeting #{selectedCommittee?.meeting_number}</DialogTitle></DialogHeader>
          {selectedCommittee && (
            <div className="grid gap-6">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2"><Users className="h-4 w-4" />Attendees</h4>
                <div className="flex gap-2 mb-2">
                  <Input value={newAttendee} onChange={e => setNewAttendee(e.target.value)} placeholder="Member name" className="flex-1" />
                  <Button size="sm" onClick={addAttendee}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {attendees.filter(a => a.committee_id === selectedCommittee.id).map(a => (
                    <Badge key={a.id} variant="secondary">{a.member_name}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2"><MessageSquare className="h-4 w-4" />Deliberations / Recommendations</h4>
                <div className="flex gap-2 mb-2">
                  <Textarea value={newDeliberation} onChange={e => setNewDeliberation(e.target.value)} placeholder="Add deliberation..." className="flex-1" />
                  <Button size="sm" onClick={addDeliberation}>Add</Button>
                </div>
                <div className="space-y-2">
                  {deliberations.filter(d => d.committee_id === selectedCommittee.id).map(d => (
                    <Card key={d.id} className="p-3"><p className="text-sm">{d.content}</p></Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ModulePageLayout>
  );
}
