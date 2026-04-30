import { useState, useEffect, useCallback, useMemo } from "react";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ExternalLink, ClipboardList, AlertCircle, CalendarClock, CheckCircle2, StickyNote } from "lucide-react";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";

interface Site { id: string; project_id: string | null; site_code: string; name: string; }
interface MonitoringVisit {
  id: string; project_id: string; site_id: string | null;
  visit_code: string | null; visit_type: string; status: string;
  planned_date: string | null; actual_date: string | null;
  monitor_name: string | null; purpose: string | null; summary: string | null;
  follow_up_actions: string | null; report_link: string | null; report_date: string | null;
}
interface Finding {
  id: string; monitoring_visit_id: string; category: string | null; severity: string;
  description: string; action_required: string | null; due_date: string | null;
  status: string; resolved_date: string | null; resolution_notes: string | null;
}
interface MonitorNote {
  id: string; monitoring_visit_id: string; project_id: string;
  author_id: string | null; author_name: string | null;
  category: string | null; importance: string; content: string;
  created_at: string; updated_at: string;
}

const VISIT_TYPES = ["SIV", "IMV", "COV", "Remote", "Other"];
const VISIT_STATUSES = ["planned", "scheduled", "in_progress", "completed", "cancelled", "postponed"];
const FINDING_SEVERITIES = ["low", "medium", "high", "critical"];
const FINDING_STATUSES = ["open", "in_progress", "resolved", "closed"];
const NOTE_CATEGORIES = ["General", "Site staff", "Subjects", "Documents", "Drug accountability", "Protocol deviation", "Action item", "Other"];
const NOTE_IMPORTANCE = ["low", "medium", "high"];

const statusColors: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800",
  scheduled: "bg-cyan-100 text-cyan-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
  postponed: "bg-orange-100 text-orange-800",
};

const severityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const findingStatusColors: Record<string, string> = {
  open: "bg-red-100 text-red-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const emptyForm = {
  site_id: "", visit_code: "", visit_type: "IMV", status: "planned",
  planned_date: "", actual_date: "", monitor_name: "", purpose: "",
  summary: "", follow_up_actions: "", report_link: "", report_date: "",
};

const emptyFinding = {
  category: "", severity: "medium", description: "", action_required: "",
  due_date: "", status: "open", resolved_date: "", resolution_notes: "",
};

export default function SiteMonitoring() {
  const navigate = useNavigate();
  const { projectId: persistedProjectId, setProjectId } = usePersistedFilters();
  const [selectedProject, setSelectedProject] = useState(persistedProjectId || "");
  const [sites, setSites] = useState<Site[]>([]);
  const [visits, setVisits] = useState<MonitoringVisit[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MonitoringVisit | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [findingDialogOpen, setFindingDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<MonitoringVisit | null>(null);
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
  const [findingForm, setFindingForm] = useState(emptyFinding);

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
    const [{ data: rc }, { data: v }] = await Promise.all([
      supabase
        .from("research_centers")
        .select("id,project_id,code,name,pi_name,pi_email,pi_phone,coordinator_name,coordinator_email,coordinator_phone")
        .eq("project_id", selectedProject)
        .order("name"),
      supabase.from("site_monitoring_visits" as any).select("*").eq("project_id", selectedProject).order("planned_date", { ascending: false }),
    ]);
    const centers = ((rc as any[]) || []);
    setSites(centers.map((c) => ({ id: c.id, project_id: c.project_id, site_code: c.code, name: c.name })));

    // Auto-mirror missing centers into study_sites so the FK on site_monitoring_visits.site_id is satisfied.
    if (centers.length > 0) {
      const ids = centers.map((c) => c.id);
      const { data: existing } = await supabase.from("study_sites").select("id").in("id", ids);
      const have = new Set(((existing as any[]) || []).map((x) => x.id));
      const missing = centers
        .filter((c) => !have.has(c.id))
        .map((c) => ({
          id: c.id,
          project_id: c.project_id,
          site_code: c.code,
          name: c.name,
          pi_name: c.pi_name,
          pi_email: c.pi_email,
          pi_phone: c.pi_phone,
          coordinator_name: c.coordinator_name,
          coordinator_email: c.coordinator_email,
          coordinator_phone: c.coordinator_phone,
        }));
      if (missing.length > 0) {
        await supabase.from("study_sites").insert(missing);
      }
    }

    const visitsList = (v as any) || [];
    setVisits(visitsList);

    if (visitsList.length > 0) {
      const ids = visitsList.map((x: any) => x.id);
      const { data: f } = await supabase.from("site_monitoring_findings" as any).select("*").in("monitoring_visit_id", ids);
      setFindings((f as any) || []);
    } else {
      setFindings([]);
    }
    setLoading(false);
  }, [selectedProject]);

  const siteName = (id: string | null) => {
    if (!id) return "—";
    const s = sites.find(x => x.id === id);
    return s ? `${s.site_code} — ${s.name}` : "Unknown";
  };

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, site_id: sites[0]?.id || "" }); setDialogOpen(true); };
  const openEdit = (v: MonitoringVisit) => {
    setEditing(v);
    setForm({
      site_id: v.site_id || "", visit_code: v.visit_code || "", visit_type: v.visit_type,
      status: v.status, planned_date: v.planned_date || "", actual_date: v.actual_date || "",
      monitor_name: v.monitor_name || "", purpose: v.purpose || "", summary: v.summary || "",
      follow_up_actions: v.follow_up_actions || "", report_link: v.report_link || "", report_date: v.report_date || "",
    });
    setDialogOpen(true);
  };

  const saveVisit = async () => {
    if (!form.site_id) { toast.error("Site is required"); return; }
    if (!form.planned_date && !form.actual_date) { toast.error("Provide planned or actual date"); return; }
    const payload = {
      project_id: selectedProject,
      site_id: form.site_id,
      visit_code: form.visit_code.trim() || null,
      visit_type: form.visit_type,
      status: form.status,
      planned_date: form.planned_date || null,
      actual_date: form.actual_date || null,
      monitor_name: form.monitor_name.trim() || null,
      purpose: form.purpose.trim() || null,
      summary: form.summary.trim() || null,
      follow_up_actions: form.follow_up_actions.trim() || null,
      report_link: form.report_link.trim() || null,
      report_date: form.report_date || null,
    };
    if (editing) {
      const { error } = await supabase.from("site_monitoring_visits" as any).update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Monitoring visit updated");
    } else {
      const { error } = await supabase.from("site_monitoring_visits" as any).insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Monitoring visit created");
    }
    setDialogOpen(false); loadData();
  };

  const deleteVisit = async (id: string) => {
    if (!confirm("Delete this monitoring visit and all its findings?")) return;
    await supabase.from("site_monitoring_visits" as any).delete().eq("id", id);
    toast.success("Deleted"); loadData();
  };

  // Findings
  const openFindings = (v: MonitoringVisit) => { setSelectedVisit(v); setEditingFinding(null); setFindingForm(emptyFinding); setFindingDialogOpen(true); };
  const editFinding = (f: Finding) => {
    setEditingFinding(f);
    setFindingForm({
      category: f.category || "", severity: f.severity, description: f.description,
      action_required: f.action_required || "", due_date: f.due_date || "", status: f.status,
      resolved_date: f.resolved_date || "", resolution_notes: f.resolution_notes || "",
    });
  };
  const cancelFindingEdit = () => { setEditingFinding(null); setFindingForm(emptyFinding); };
  const saveFinding = async () => {
    if (!selectedVisit) return;
    if (!findingForm.description.trim()) { toast.error("Description is required"); return; }
    const payload = {
      monitoring_visit_id: selectedVisit.id,
      category: findingForm.category.trim() || null,
      severity: findingForm.severity,
      description: findingForm.description.trim(),
      action_required: findingForm.action_required.trim() || null,
      due_date: findingForm.due_date || null,
      status: findingForm.status,
      resolved_date: findingForm.resolved_date || null,
      resolution_notes: findingForm.resolution_notes.trim() || null,
    };
    if (editingFinding) {
      await supabase.from("site_monitoring_findings" as any).update(payload).eq("id", editingFinding.id);
      toast.success("Finding updated");
    } else {
      await supabase.from("site_monitoring_findings" as any).insert(payload);
      toast.success("Finding added");
    }
    cancelFindingEdit(); loadData();
  };
  const deleteFinding = async (id: string) => {
    await supabase.from("site_monitoring_findings" as any).delete().eq("id", id);
    toast.success("Finding deleted"); loadData();
  };

  const visitFindings = (vid: string) => findings.filter(f => f.monitoring_visit_id === vid);

  const filtered = useMemo(() => visits.filter(v => {
    const matchSearch = !search || (v.monitor_name || "").toLowerCase().includes(search.toLowerCase())
      || (v.visit_code || "").toLowerCase().includes(search.toLowerCase())
      || (v.purpose || "").toLowerCase().includes(search.toLowerCase());
    const matchSite = siteFilter === "all" || v.site_id === siteFilter;
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    const matchType = typeFilter === "all" || v.visit_type === typeFilter;
    return matchSearch && matchSite && matchStatus && matchType;
  }), [visits, search, siteFilter, statusFilter, typeFilter]);

  const today = new Date().toISOString().slice(0, 10);
  const planned = filtered.filter(v => ["planned", "scheduled"].includes(v.status));
  const completed = filtered.filter(v => v.status === "completed");
  const overdue = filtered.filter(v => ["planned", "scheduled"].includes(v.status) && v.planned_date && v.planned_date < today);

  const exportData = filtered.map(v => ({
    Site: siteName(v.site_id), Code: v.visit_code || "", Type: v.visit_type,
    Status: v.status, "Planned Date": v.planned_date || "", "Actual Date": v.actual_date || "",
    Monitor: v.monitor_name || "", Purpose: v.purpose || "", Summary: v.summary || "",
    "Follow-up Actions": v.follow_up_actions || "", "Report Date": v.report_date || "",
    "Report Link": v.report_link || "", Findings: visitFindings(v.id).length,
  }));

  const renderTable = (rows: MonitoringVisit[]) => (
    rows.length === 0 ? <p className="text-muted-foreground text-center py-8">No monitoring visits found.</p> : (
      <Table>
        <TableHeader><TableRow>
          <TableHead>Site</TableHead><TableHead>Code</TableHead><TableHead>Type</TableHead>
          <TableHead>Status</TableHead><TableHead>Planned</TableHead><TableHead>Actual</TableHead>
          <TableHead>Monitor</TableHead><TableHead>Findings</TableHead><TableHead>Report</TableHead>
          <TableHead className="w-[140px]">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map(v => {
            const fs = visitFindings(v.id);
            const open = fs.filter(f => f.status === "open" || f.status === "in_progress").length;
            return (
              <TableRow key={v.id}>
                <TableCell className="text-sm">{siteName(v.site_id)}</TableCell>
                <TableCell className="font-mono text-xs">{v.visit_code || "—"}</TableCell>
                <TableCell><Badge variant="outline">{v.visit_type}</Badge></TableCell>
                <TableCell><Badge className={statusColors[v.status] || ""}>{v.status.replace("_", " ")}</Badge></TableCell>
                <TableCell>{v.planned_date || "—"}</TableCell>
                <TableCell>{v.actual_date || "—"}</TableCell>
                <TableCell>{v.monitor_name || "—"}</TableCell>
                <TableCell>
                  {fs.length === 0 ? "—" : (
                    <span className="text-sm">{fs.length} <span className="text-muted-foreground">({open} open)</span></span>
                  )}
                </TableCell>
                <TableCell>{v.report_link ? <a href={v.report_link} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline"><ExternalLink className="h-3.5 w-3.5" />Open</a> : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Findings" onClick={() => openFindings(v)}><ClipboardList className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" title="Delete" onClick={() => deleteVisit(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    )
  );

  return (
    <ModulePageLayout
      title="Site Monitoring"
      subtitle="Plan and track monitoring visits per research site"
      selectedProject={selectedProject}
      onProjectChange={setSelectedProject}
      exportData={exportData}
      exportFileName="site-monitoring"
      actions={<Button size="sm" onClick={openNew} disabled={!selectedProject}><Plus className="h-4 w-4 mr-1" />New Monitoring Visit</Button>}
    >
      {!selectedProject ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Select a study to view monitoring visits.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
            <Card><CardContent className="py-4"><div className="flex items-center gap-3"><CalendarClock className="h-5 w-5 text-blue-600" /><div><p className="text-xs text-muted-foreground">Planned</p><p className="text-2xl font-semibold">{planned.length}</p></div></div></CardContent></Card>
            <Card><CardContent className="py-4"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-600" /><div><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-semibold">{completed.length}</p></div></div></CardContent></Card>
            <Card><CardContent className="py-4"><div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-orange-600" /><div><p className="text-xs text-muted-foreground">Overdue</p><p className="text-2xl font-semibold">{overdue.length}</p></div></div></CardContent></Card>
            <Card><CardContent className="py-4"><div className="flex items-center gap-3"><ClipboardList className="h-5 w-5 text-purple-600" /><div><p className="text-xs text-muted-foreground">Total Visits</p><p className="text-2xl font-semibold">{filtered.length}</p></div></div></CardContent></Card>
            <Card><CardContent className="py-4"><div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-600" /><div><p className="text-xs text-muted-foreground">Open Findings</p><p className="text-2xl font-semibold">{findings.filter(f => f.status === "open" || f.status === "in_progress").length}</p></div></div></CardContent></Card>
            <Card><CardContent className="py-4"><div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-700" /><div><p className="text-xs text-muted-foreground">Critical Findings</p><p className="text-2xl font-semibold">{findings.filter(f => f.severity === "critical" && f.status !== "closed" && f.status !== "resolved").length}</p></div></div></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
                <CardTitle>Monitoring Visits</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[200px]" /></div>
                  <Select value={siteFilter} onValueChange={setSiteFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sites</SelectItem>
                      {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.site_code} — {s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {VISIT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {VISIT_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-muted-foreground">Loading...</p> : (
                <Tabs defaultValue="all">
                  <TabsList>
                    <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
                    <TabsTrigger value="planned">Planned ({planned.length})</TabsTrigger>
                    <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
                    <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all">{renderTable(filtered)}</TabsContent>
                  <TabsContent value="planned">{renderTable(planned)}</TabsContent>
                  <TabsContent value="completed">{renderTable(completed)}</TabsContent>
                  <TabsContent value="overdue">{renderTable(overdue)}</TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Visit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Monitoring Visit</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Site *</Label>
                <Select value={form.site_id} onValueChange={v => setForm({...form, site_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                  <SelectContent>
                    {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.site_code} — {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Visit Code</Label><Input value={form.visit_code} onChange={e => setForm({...form, visit_code: e.target.value})} placeholder="e.g. MV-2026-001" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Visit Type</Label>
                <Select value={form.visit_type} onValueChange={v => setForm({...form, visit_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VISIT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VISIT_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Planned Date</Label><Input type="date" value={form.planned_date} onChange={e => setForm({...form, planned_date: e.target.value})} /></div>
              <div><Label>Actual Date</Label><Input type="date" value={form.actual_date} onChange={e => setForm({...form, actual_date: e.target.value})} /></div>
            </div>
            <div><Label>Monitor (CRA)</Label><Input value={form.monitor_name} onChange={e => setForm({...form, monitor_name: e.target.value})} /></div>
            <div><Label>Purpose / Objective</Label><Textarea rows={2} value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} /></div>
            <div><Label>Summary</Label><Textarea rows={3} value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} /></div>
            <div><Label>Follow-up Actions</Label><Textarea rows={2} value={form.follow_up_actions} onChange={e => setForm({...form, follow_up_actions: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Report Date</Label><Input type="date" value={form.report_date} onChange={e => setForm({...form, report_date: e.target.value})} /></div>
              <div><Label>Report Link</Label><Input type="url" value={form.report_link} onChange={e => setForm({...form, report_link: e.target.value})} placeholder="https://..." /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={saveVisit}>{editing ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Findings Dialog */}
      <Dialog open={findingDialogOpen} onOpenChange={setFindingDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Findings — {selectedVisit?.visit_type} {selectedVisit && `(${siteName(selectedVisit.site_id)})`}</DialogTitle>
          </DialogHeader>
          {selectedVisit && (
            <div className="grid gap-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-3">{editingFinding ? "Edit Finding" : "Add Finding"}</h4>
                <div className="grid gap-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Category</Label><Input value={findingForm.category} onChange={e => setFindingForm({...findingForm, category: e.target.value})} placeholder="e.g. Documentation" /></div>
                    <div><Label>Severity</Label>
                      <Select value={findingForm.severity} onValueChange={v => setFindingForm({...findingForm, severity: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{FINDING_SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Status</Label>
                      <Select value={findingForm.status} onValueChange={v => setFindingForm({...findingForm, status: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{FINDING_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Description *</Label><Textarea rows={2} value={findingForm.description} onChange={e => setFindingForm({...findingForm, description: e.target.value})} /></div>
                  <div><Label>Action Required</Label><Textarea rows={2} value={findingForm.action_required} onChange={e => setFindingForm({...findingForm, action_required: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Due Date</Label><Input type="date" value={findingForm.due_date} onChange={e => setFindingForm({...findingForm, due_date: e.target.value})} /></div>
                    <div><Label>Resolved Date</Label><Input type="date" value={findingForm.resolved_date} onChange={e => setFindingForm({...findingForm, resolved_date: e.target.value})} /></div>
                  </div>
                  <div><Label>Resolution Notes</Label><Textarea rows={2} value={findingForm.resolution_notes} onChange={e => setFindingForm({...findingForm, resolution_notes: e.target.value})} /></div>
                  <div className="flex gap-2 justify-end">
                    {editingFinding && <Button variant="outline" size="sm" onClick={cancelFindingEdit}>Cancel Edit</Button>}
                    <Button size="sm" onClick={saveFinding}>{editingFinding ? "Update Finding" : "Add Finding"}</Button>
                  </div>
                </div>
              </Card>

              <div>
                <h4 className="font-semibold mb-2">Existing Findings ({visitFindings(selectedVisit.id).length})</h4>
                {visitFindings(selectedVisit.id).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No findings recorded.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Category</TableHead><TableHead>Severity</TableHead><TableHead>Description</TableHead>
                      <TableHead>Status</TableHead><TableHead>Due</TableHead><TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {visitFindings(selectedVisit.id).map(f => (
                        <TableRow key={f.id}>
                          <TableCell>{f.category || "—"}</TableCell>
                          <TableCell><Badge className={severityColors[f.severity] || ""}>{f.severity}</Badge></TableCell>
                          <TableCell className="text-sm max-w-xs truncate" title={f.description}>{f.description}</TableCell>
                          <TableCell><Badge className={findingStatusColors[f.status] || ""}>{f.status.replace("_", " ")}</Badge></TableCell>
                          <TableCell>{f.due_date || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => editFinding(f)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteFinding(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ModulePageLayout>
  );
}
