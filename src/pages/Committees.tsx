import { parseLocalDate } from "@/lib/dateUtils";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Users, MessageSquare, Upload, ExternalLink, Settings, CalendarDays, Mail, CheckCircle2, Clock } from "lucide-react";
import KpiCards from "@/components/shared/KpiCards";
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

interface CommitteeType { id: string; code: string; name: string; description: string | null; is_active: boolean; }
interface Attendee { id: string; committee_id: string; member_name: string; present: boolean; }
interface Deliberation { id: string; committee_id: string; content: string; }
interface Letter {
  id: string; project_id: string; committee_id: string | null; committee_type: string | null;
  letter_code: string; title: string; letter_date: string | null; status: string;
  link: string | null; recipient: string | null; notes: string | null;
}

const statusColors: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  minutes_pending: "bg-yellow-100 text-yellow-800",
  finalized: "bg-purple-100 text-purple-800",
};

const letterStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  acknowledged: "bg-green-100 text-green-800",
  pending_response: "bg-yellow-100 text-yellow-800",
  closed: "bg-purple-100 text-purple-800",
};

export default function Committees() {
  const navigate = useNavigate();
  const { projectId: persistedProjectId, setProjectId } = usePersistedFilters();
  const [selectedProject, setSelectedProject] = useState(persistedProjectId || "");
  const [records, setRecords] = useState<Committee[]>([]);
  const [types, setTypes] = useState<CommitteeType[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [deliberations, setDeliberations] = useState<Deliberation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Committee | null>(null);
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  // Letter state
  const [letterDialogOpen, setLetterDialogOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<Letter | null>(null);
  const [letterSearch, setLetterSearch] = useState("");
  const [letterStatusFilter, setLetterStatusFilter] = useState("all");
  const [letterForm, setLetterForm] = useState({
    letter_code: "", title: "", letter_date: "", status: "draft",
    link: "", recipient: "", notes: "", committee_type: "", committee_id: "",
  });

  // Type state
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<CommitteeType | null>(null);
  const [typeForm, setTypeForm] = useState({ code: "", name: "", description: "", is_active: true });

  const importColumns: ColumnMapping[] = [
    { excelHeader: "Committee Type", dbColumn: "committee_type", required: true, transform: (v: any) => v || "CEC" },
    { excelHeader: "Meeting Number", dbColumn: "meeting_number", required: true, transform: (v: any) => parseInt(v) || 1 },
    { excelHeader: "Meeting Date", dbColumn: "meeting_date", required: true },
    { excelHeader: "Agenda", dbColumn: "agenda" },
    { excelHeader: "Status", dbColumn: "status", transform: (v: any) => v || "planned" },
    { excelHeader: "Next Meeting Date", dbColumn: "next_meeting_date" },
  ];
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState({ committee_type: "CEC", meeting_number: 1, meeting_date: "", agenda: "", status: "planned", next_meeting_date: "" });
  const [newAttendee, setNewAttendee] = useState("");
  const [newDeliberation, setNewDeliberation] = useState("");

  useEffect(() => { const check = async () => { const { data: { session } } = await supabase.auth.getSession(); if (!session) navigate("/auth"); }; check(); }, []);
  useEffect(() => { loadTypes(); }, []);
  useEffect(() => { if (selectedProject) { setProjectId(selectedProject); loadData(); } }, [selectedProject]);

  const loadTypes = async () => {
    const { data } = await supabase.from("committee_types" as any).select("*").order("name");
    setTypes((data as any) || []);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: a }, { data: d }, { data: l }] = await Promise.all([
      supabase.from("committees").select("*").eq("project_id", selectedProject).order("meeting_date", { ascending: false }),
      supabase.from("committee_attendees").select("*"),
      supabase.from("committee_deliberations").select("*"),
      supabase.from("committee_letters" as any).select("*").eq("project_id", selectedProject).order("letter_date", { ascending: false }),
    ]);
    setRecords(c || []);
    setAttendees(a || []);
    setDeliberations(d || []);
    setLetters((l as any) || []);
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

  const openNew = () => {
    const defaultType = types.find(t => t.is_active)?.code || "CEC";
    setEditing(null);
    setForm({ committee_type: defaultType, meeting_number: (records.length || 0) + 1, meeting_date: "", agenda: "", status: "planned", next_meeting_date: "" });
    setDialogOpen(true);
  };
  const openEdit = (r: Committee) => { setEditing(r); setForm({ committee_type: r.committee_type, meeting_number: r.meeting_number, meeting_date: r.meeting_date, agenda: r.agenda || "", status: r.status, next_meeting_date: r.next_meeting_date || "" }); setDialogOpen(true); };
  const openDetail = (r: Committee) => { setSelectedCommittee(r); setDetailDialogOpen(true); };

  // Types CRUD
  const openNewType = () => { setEditingType(null); setTypeForm({ code: "", name: "", description: "", is_active: true }); setTypeDialogOpen(true); };
  const openEditType = (t: CommitteeType) => { setEditingType(t); setTypeForm({ code: t.code, name: t.name, description: t.description || "", is_active: t.is_active }); setTypeDialogOpen(true); };
  const saveType = async () => {
    if (!typeForm.code.trim() || !typeForm.name.trim()) { toast.error("Code and name are required"); return; }
    const payload = { code: typeForm.code.trim().toUpperCase(), name: typeForm.name.trim(), description: typeForm.description.trim() || null, is_active: typeForm.is_active };
    if (editingType) { await supabase.from("committee_types" as any).update(payload).eq("id", editingType.id); toast.success("Type updated"); }
    else { const { error } = await supabase.from("committee_types" as any).insert(payload); if (error) { toast.error(error.message); return; } toast.success("Type created"); }
    setTypeDialogOpen(false); loadTypes();
  };
  const deleteType = async (id: string) => { await supabase.from("committee_types" as any).delete().eq("id", id); toast.success("Type deleted"); loadTypes(); };

  // Letters CRUD
  const openNewLetter = () => {
    setEditingLetter(null);
    setLetterForm({ letter_code: "", title: "", letter_date: "", status: "draft", link: "", recipient: "", notes: "", committee_type: "", committee_id: "" });
    setLetterDialogOpen(true);
  };
  const openEditLetter = (l: Letter) => {
    setEditingLetter(l);
    setLetterForm({
      letter_code: l.letter_code, title: l.title, letter_date: l.letter_date || "",
      status: l.status, link: l.link || "", recipient: l.recipient || "",
      notes: l.notes || "", committee_type: l.committee_type || "", committee_id: l.committee_id || "",
    });
    setLetterDialogOpen(true);
  };
  const saveLetter = async () => {
    if (!letterForm.letter_code.trim() || !letterForm.title.trim()) { toast.error("Code and title are required"); return; }
    const payload = {
      project_id: selectedProject,
      letter_code: letterForm.letter_code.trim(),
      title: letterForm.title.trim(),
      letter_date: letterForm.letter_date || null,
      status: letterForm.status,
      link: letterForm.link.trim() || null,
      recipient: letterForm.recipient.trim() || null,
      notes: letterForm.notes.trim() || null,
      committee_type: letterForm.committee_type || null,
      committee_id: letterForm.committee_id || null,
    };
    if (editingLetter) { await supabase.from("committee_letters" as any).update(payload).eq("id", editingLetter.id); toast.success("Letter updated"); }
    else { await supabase.from("committee_letters" as any).insert(payload); toast.success("Letter created"); }
    setLetterDialogOpen(false); loadData();
  };
  const deleteLetter = async (id: string) => { await supabase.from("committee_letters" as any).delete().eq("id", id); toast.success("Letter deleted"); loadData(); };

  const filtered = records.filter(r => {
    const matchSearch = (r.agenda || "").toLowerCase().includes(search.toLowerCase()) || r.committee_type.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || r.committee_type === typeFilter;
    return matchSearch && matchType;
  });

  const filteredLetters = letters.filter(l => {
    const matchSearch = l.title.toLowerCase().includes(letterSearch.toLowerCase()) || l.letter_code.toLowerCase().includes(letterSearch.toLowerCase()) || (l.recipient || "").toLowerCase().includes(letterSearch.toLowerCase());
    const matchStatus = letterStatusFilter === "all" || l.status === letterStatusFilter;
    return matchSearch && matchStatus;
  });

  const exportData = filtered.map(r => {
    const att = attendees.filter(a => a.committee_id === r.id);
    return {
      Type: r.committee_type, "Meeting #": r.meeting_number, Date: r.meeting_date,
      Status: r.status, Agenda: r.agenda || "", "Next Meeting": r.next_meeting_date || "",
      Attendees: att.map(a => a.member_name).join(", "),
    };
  });

  const activeTypes = types.filter(t => t.is_active);
  const projectCommittees = records;

  return (
    <ModulePageLayout title="Committee Management" subtitle="Committees, meetings, letters, and configurations"
      selectedProject={selectedProject} onProjectChange={setSelectedProject} exportData={exportData} exportFileName="committees"
    >
      {(() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const totalMeetings = records.length;
        const completed = records.filter(r => r.status === "completed" || r.status === "finalized").length;
        const planned = records.filter(r => r.status === "planned").length;
        const minutesPending = records.filter(r => r.status === "minutes_pending").length;
        const upcoming = records.filter(r => r.next_meeting_date && new Date(r.next_meeting_date) >= today).length;
        const totalLetters = letters.length;
        const pendingLetters = letters.filter(l => l.status === "pending_response" || l.status === "sent").length;
        return (
          <div className="mb-6">
            <KpiCards cols={6} items={[
              { label: "Meetings", value: totalMeetings, icon: Users, accent: "primary" },
              { label: "Completed", value: completed, icon: CheckCircle2, accent: "success" },
              { label: "Minutes Pending", value: minutesPending, icon: Clock, accent: "warning" },
              { label: "Upcoming", value: upcoming, icon: CalendarDays, accent: "primary" },
              { label: "Letters", value: totalLetters, icon: Mail, accent: "primary" },
              { label: "Letters Pending", value: pendingLetters, icon: Clock, accent: "warning" },
            ]} />
          </div>
        );
      })()}
      <Tabs defaultValue="meetings" className="w-full">
        <TabsList>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="letters">Letters</TabsTrigger>
          <TabsTrigger value="types"><Settings className="h-3.5 w-3.5 mr-1" />Committee Types</TabsTrigger>
        </TabsList>

        {/* MEETINGS TAB */}
        <TabsContent value="meetings">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <CardTitle>Meetings</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[200px]" /></div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {activeTypes.map(t => <SelectItem key={t.id} value={t.code}>{t.code} — {t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" />Import</Button>
                  <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Meeting</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No meetings found.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Type</TableHead><TableHead>Meeting #</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Attendees</TableHead><TableHead>Next Meeting</TableHead><TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filtered.map(r => {
                      const att = attendees.filter(a => a.committee_id === r.id);
                      return (
                        <TableRow key={r.id}>
                          <TableCell><Badge variant="outline">{r.committee_type}</Badge></TableCell>
                          <TableCell>{r.meeting_number}</TableCell>
                          <TableCell>{r.meeting_date}</TableCell>
                          <TableCell><Badge className={statusColors[r.status] || ""}>{r.status}</Badge></TableCell>
                          <TableCell>{att.length}</TableCell>
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
        </TabsContent>

        {/* LETTERS TAB */}
        <TabsContent value="letters">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <CardTitle>Letters</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search letters..." value={letterSearch} onChange={e => setLetterSearch(e.target.value)} className="pl-8 w-[220px]" /></div>
                  <Select value={letterStatusFilter} onValueChange={setLetterStatusFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="pending_response">Pending Response</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={openNewLetter} disabled={!selectedProject}><Plus className="h-4 w-4 mr-1" />New Letter</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedProject ? <p className="text-muted-foreground text-center py-8">Select a project to view letters.</p> :
                filteredLetters.length === 0 ? <p className="text-muted-foreground text-center py-8">No letters found.</p> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Code</TableHead><TableHead>Title</TableHead><TableHead>Committee</TableHead><TableHead>Date</TableHead><TableHead>Recipient</TableHead><TableHead>Status</TableHead><TableHead>Link</TableHead><TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredLetters.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-xs">{l.letter_code}</TableCell>
                        <TableCell>{l.title}</TableCell>
                        <TableCell>{l.committee_type ? <Badge variant="outline">{l.committee_type}</Badge> : "-"}</TableCell>
                        <TableCell>{l.letter_date || "-"}</TableCell>
                        <TableCell>{l.recipient || "-"}</TableCell>
                        <TableCell><Badge className={letterStatusColors[l.status] || ""}>{l.status.replace("_", " ")}</Badge></TableCell>
                        <TableCell>{l.link ? <a href={l.link} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline"><ExternalLink className="h-3.5 w-3.5" />Open</a> : "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditLetter(l)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteLetter(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TYPES TAB */}
        <TabsContent value="types">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Committee Types</CardTitle>
                <Button size="sm" onClick={openNewType}><Plus className="h-4 w-4 mr-1" />New Type</Button>
              </div>
            </CardHeader>
            <CardContent>
              {types.length === 0 ? <p className="text-muted-foreground text-center py-8">No committee types registered.</p> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Active</TableHead><TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {types.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono">{t.code}</TableCell>
                        <TableCell>{t.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{t.description || "-"}</TableCell>
                        <TableCell>{t.is_active ? <Badge className="bg-green-100 text-green-800">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditType(t)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteType(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Meeting Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Meeting</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Committee Type</Label>
                <Select value={form.committee_type} onValueChange={v => setForm({...form, committee_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activeTypes.map(t => <SelectItem key={t.id} value={t.code}>{t.code} — {t.name}</SelectItem>)}
                  </SelectContent>
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

      {/* Detail Dialog */}
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

      {/* Letter Dialog */}
      <Dialog open={letterDialogOpen} onOpenChange={setLetterDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editingLetter ? "Edit" : "New"} Letter</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Letter Code *</Label><Input value={letterForm.letter_code} onChange={e => setLetterForm({...letterForm, letter_code: e.target.value})} placeholder="e.g. CL-2026-001" /></div>
              <div><Label>Date</Label><Input type="date" value={letterForm.letter_date} onChange={e => setLetterForm({...letterForm, letter_date: e.target.value})} /></div>
            </div>
            <div><Label>Title *</Label><Input value={letterForm.title} onChange={e => setLetterForm({...letterForm, title: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Committee Type</Label>
                <Select value={letterForm.committee_type || "_none"} onValueChange={v => setLetterForm({...letterForm, committee_type: v === "_none" ? "" : v})}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {activeTypes.map(t => <SelectItem key={t.id} value={t.code}>{t.code} — {t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Related Meeting</Label>
                <Select value={letterForm.committee_id || "_none"} onValueChange={v => setLetterForm({...letterForm, committee_id: v === "_none" ? "" : v})}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {projectCommittees.map(c => <SelectItem key={c.id} value={c.id}>{c.committee_type} #{c.meeting_number} — {c.meeting_date}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Recipient</Label><Input value={letterForm.recipient} onChange={e => setLetterForm({...letterForm, recipient: e.target.value})} /></div>
              <div><Label>Status</Label>
                <Select value={letterForm.status} onValueChange={v => setLetterForm({...letterForm, status: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="pending_response">Pending Response</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Link</Label><Input type="url" value={letterForm.link} onChange={e => setLetterForm({...letterForm, link: e.target.value})} placeholder="https://..." /></div>
            <div><Label>Notes</Label><Textarea value={letterForm.notes} onChange={e => setLetterForm({...letterForm, notes: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setLetterDialogOpen(false)}>Cancel</Button><Button onClick={saveLetter}>{editingLetter ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingType ? "Edit" : "New"} Committee Type</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Code *</Label><Input value={typeForm.code} onChange={e => setTypeForm({...typeForm, code: e.target.value})} placeholder="e.g. CEC" /></div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={typeForm.is_active} onCheckedChange={v => setTypeForm({...typeForm, is_active: v})} /><Label>Active</Label></div>
            </div>
            <div><Label>Name *</Label><Input value={typeForm.name} onChange={e => setTypeForm({...typeForm, name: e.target.value})} /></div>
            <div><Label>Description</Label><Textarea value={typeForm.description} onChange={e => setTypeForm({...typeForm, description: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTypeDialogOpen(false)}>Cancel</Button><Button onClick={saveType}>{editingType ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} tableName="committees" projectId={selectedProject} columns={importColumns} onSuccess={loadData} />
    </ModulePageLayout>
  );
}
