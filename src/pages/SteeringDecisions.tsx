import { todayDateOnly, parseLocalDate, formatDateOnly } from "@/lib/dateUtils";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Upload, Gavel, Clock, CheckCircle2, AlertTriangle, CalendarDays, Users } from "lucide-react";
import KpiCards from "@/components/shared/KpiCards";
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

interface Meeting {
  id: string;
  project_id: string;
  meeting_code: string;
  meeting_date: string;
  location: string | null;
  attendees: string | null;
  agenda: string | null;
  minutes: string | null;
  next_meeting_date: string | null;
  status: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  implemented: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const meetingStatusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  held: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  postponed: "bg-yellow-100 text-yellow-800",
};

export default function SteeringDecisions() {
  const navigate = useNavigate();
  const { projectId: persistedProjectId, setProjectId } = usePersistedFilters();
  const [selectedProject, setSelectedProject] = useState(persistedProjectId || "");
  const [activeTab, setActiveTab] = useState("decisions");

  // Decisions state
  const [records, setRecords] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Decision | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    decision_code: "", meeting_origin: "", decision_date: todayDateOnly(),
    description: "", impacted_area: "", responsible: "", deadline: "", status: "pending", observations: "",
  });

  // Meetings state
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [meetingSearch, setMeetingSearch] = useState("");
  const [meetingStatusFilter, setMeetingStatusFilter] = useState("all");
  const [meetingForm, setMeetingForm] = useState({
    meeting_code: "", meeting_date: todayDateOnly(),
    location: "", attendees: "", agenda: "", minutes: "", next_meeting_date: "", status: "scheduled",
  });

  const importColumns: ColumnMapping[] = [
    { excelHeader: "Decision Code", dbColumn: "decision_code", required: true },
    { excelHeader: "Description", dbColumn: "description", required: true },
    { excelHeader: "Meeting Origin", dbColumn: "meeting_origin" },
    { excelHeader: "Decision Date", dbColumn: "decision_date", transform: (v: any) => v || todayDateOnly() },
    { excelHeader: "Impacted Area", dbColumn: "impacted_area" },
    { excelHeader: "Responsible", dbColumn: "responsible" },
    { excelHeader: "Deadline", dbColumn: "deadline" },
    { excelHeader: "Status", dbColumn: "status", transform: (v: any) => v || "pending" },
    { excelHeader: "Observations", dbColumn: "observations" },
  ];

  useEffect(() => { const check = async () => { const { data: { session } } = await supabase.auth.getSession(); if (!session) navigate("/auth"); }; check(); }, []);
  useEffect(() => { if (selectedProject) { setProjectId(selectedProject); loadData(); loadMeetings(); } }, [selectedProject]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("steering_decisions").select("*").eq("project_id", selectedProject).order("decision_date", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  }, [selectedProject]);

  const loadMeetings = useCallback(async () => {
    setMeetingsLoading(true);
    const { data } = await supabase.from("steering_meetings" as any).select("*").eq("project_id", selectedProject).order("meeting_date", { ascending: false });
    setMeetings((data as any) || []);
    setMeetingsLoading(false);
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

  const openNew = () => { setEditing(null); setForm({ decision_code: "", meeting_origin: "", decision_date: todayDateOnly(), description: "", impacted_area: "", responsible: "", deadline: "", status: "pending", observations: "" }); setDialogOpen(true); };
  const openEdit = (r: Decision) => { setEditing(r); setForm({ decision_code: r.decision_code, meeting_origin: r.meeting_origin || "", decision_date: r.decision_date, description: r.description, impacted_area: r.impacted_area || "", responsible: r.responsible || "", deadline: r.deadline || "", status: r.status, observations: r.observations || "" }); setDialogOpen(true); };

  const handleSaveMeeting = async () => {
    if (!meetingForm.meeting_code.trim() || !meetingForm.meeting_date) { toast.error("Code and date are required"); return; }
    const payload: any = {
      project_id: selectedProject,
      meeting_code: meetingForm.meeting_code.trim(),
      meeting_date: meetingForm.meeting_date,
      location: meetingForm.location.trim() || null,
      attendees: meetingForm.attendees.trim() || null,
      agenda: meetingForm.agenda.trim() || null,
      minutes: meetingForm.minutes.trim() || null,
      next_meeting_date: meetingForm.next_meeting_date || null,
      status: meetingForm.status,
    };
    if (editingMeeting) { await (supabase.from("steering_meetings" as any) as any).update(payload).eq("id", editingMeeting.id); toast.success("Meeting updated"); }
    else { await (supabase.from("steering_meetings" as any) as any).insert(payload); toast.success("Meeting created"); }
    setMeetingDialogOpen(false); setEditingMeeting(null); loadMeetings();
  };

  const handleDeleteMeeting = async (id: string) => { await (supabase.from("steering_meetings" as any) as any).delete().eq("id", id); toast.success("Meeting deleted"); loadMeetings(); };

  const openNewMeeting = () => {
    setEditingMeeting(null);
    setMeetingForm({ meeting_code: "", meeting_date: todayDateOnly(), location: "", attendees: "", agenda: "", minutes: "", next_meeting_date: "", status: "scheduled" });
    setMeetingDialogOpen(true);
  };
  const openEditMeeting = (m: Meeting) => {
    setEditingMeeting(m);
    setMeetingForm({
      meeting_code: m.meeting_code, meeting_date: m.meeting_date, location: m.location || "",
      attendees: m.attendees || "", agenda: m.agenda || "", minutes: m.minutes || "",
      next_meeting_date: m.next_meeting_date || "", status: m.status,
    });
    setMeetingDialogOpen(true);
  };

  const filtered = records.filter(r => {
    const matchSearch = r.decision_code.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredMeetings = meetings.filter(m => {
    const matchSearch = m.meeting_code.toLowerCase().includes(meetingSearch.toLowerCase()) || (m.agenda || "").toLowerCase().includes(meetingSearch.toLowerCase());
    const matchStatus = meetingStatusFilter === "all" || m.status === meetingStatusFilter;
    return matchSearch && matchStatus;
  });

  const exportData = activeTab === "decisions"
    ? filtered.map(r => ({
        "Decision ID": r.decision_code, "Meeting Origin": r.meeting_origin || "", Date: r.decision_date,
        Description: r.description, "Impacted Area": r.impacted_area || "", Responsible: r.responsible || "",
        Deadline: r.deadline || "", Status: r.status, Observations: r.observations || "",
      }))
    : filteredMeetings.map(m => ({
        "Meeting Code": m.meeting_code, Date: m.meeting_date, Location: m.location || "",
        Attendees: m.attendees || "", Agenda: m.agenda || "", Minutes: m.minutes || "",
        "Next Meeting": m.next_meeting_date || "", Status: m.status,
      }));

  const exportFileName = activeTab === "decisions" ? "steering_decisions" : "steering_meetings";

  const headerActions = activeTab === "decisions"
    ? <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" />Import</Button><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Decision</Button></div>
    : <Button size="sm" onClick={openNewMeeting}><Plus className="h-4 w-4 mr-1" />New Meeting</Button>;

  return (
    <ModulePageLayout title="Steering Committee" subtitle="Track strategic decisions and committee meetings"
      selectedProject={selectedProject} onProjectChange={setSelectedProject} exportData={exportData} exportFileName={exportFileName}
      actions={headerActions}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="decisions">Decisions Log</TabsTrigger>
          <TabsTrigger value="meetings">Meetings Log</TabsTrigger>
        </TabsList>

        <TabsContent value="decisions">
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
        </TabsContent>

        <TabsContent value="meetings">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <CardTitle>Meetings</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={meetingSearch} onChange={e => setMeetingSearch(e.target.value)} className="pl-8 w-[200px]" /></div>
                  <Select value={meetingStatusFilter} onValueChange={setMeetingStatusFilter}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="held">Held</SelectItem>
                      <SelectItem value="postponed">Postponed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {meetingsLoading ? <p className="text-muted-foreground">Loading...</p> : filteredMeetings.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No meetings found.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Code</TableHead><TableHead>Date</TableHead><TableHead>Location</TableHead><TableHead>Attendees</TableHead><TableHead>Agenda</TableHead><TableHead>Next Meeting</TableHead><TableHead>Status</TableHead><TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredMeetings.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono font-medium">{m.meeting_code}</TableCell>
                        <TableCell>{m.meeting_date}</TableCell>
                        <TableCell>{m.location || "-"}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{m.attendees || "-"}</TableCell>
                        <TableCell className="max-w-[220px] truncate">{m.agenda || "-"}</TableCell>
                        <TableCell>{m.next_meeting_date || "-"}</TableCell>
                        <TableCell><Badge className={meetingStatusColors[m.status] || ""}>{m.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditMeeting(m)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteMeeting(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

      <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editingMeeting ? "Edit" : "New"} Meeting</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Meeting Code</Label><Input value={meetingForm.meeting_code} onChange={e => setMeetingForm({...meetingForm, meeting_code: e.target.value})} placeholder="SCM-001" /></div>
              <div><Label>Meeting Date</Label><Input type="date" value={meetingForm.meeting_date} onChange={e => setMeetingForm({...meetingForm, meeting_date: e.target.value})} /></div>
            </div>
            <div><Label>Location</Label><Input value={meetingForm.location} onChange={e => setMeetingForm({...meetingForm, location: e.target.value})} placeholder="On-site / Virtual" /></div>
            <div><Label>Attendees</Label><Textarea value={meetingForm.attendees} onChange={e => setMeetingForm({...meetingForm, attendees: e.target.value})} placeholder="One per line or comma-separated" /></div>
            <div><Label>Agenda</Label><Textarea value={meetingForm.agenda} onChange={e => setMeetingForm({...meetingForm, agenda: e.target.value})} /></div>
            <div><Label>Minutes</Label><Textarea value={meetingForm.minutes} onChange={e => setMeetingForm({...meetingForm, minutes: e.target.value})} rows={5} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Next Meeting Date</Label><Input type="date" value={meetingForm.next_meeting_date} onChange={e => setMeetingForm({...meetingForm, next_meeting_date: e.target.value})} /></div>
              <div><Label>Status</Label>
                <Select value={meetingForm.status} onValueChange={v => setMeetingForm({...meetingForm, status: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="held">Held</SelectItem>
                    <SelectItem value="postponed">Postponed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMeetingDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveMeeting}>{editingMeeting ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} tableName="steering_decisions" projectId={selectedProject} columns={importColumns} onSuccess={loadData} />
    </ModulePageLayout>
  );
}
