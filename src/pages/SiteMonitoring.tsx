import { parseLocalDate } from "@/lib/dateUtils";
import { useState, useEffect, useCallback, useMemo } from "react";
import { formatInBrasilia, todayDateOnly } from "@/lib/dateUtils";
import { useSearchParams, Link } from "react-router-dom";
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
import { Plus, Pencil, Trash2, Search, ExternalLink, ClipboardList, AlertCircle, CalendarClock, CheckCircle2, AlertTriangle, HeartPulse, Hourglass, History, ShieldCheck, StickyNote, FileQuestion } from "lucide-react";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";
import { AuditTrail } from "@/components/shared/AuditTrail";
import { Checkbox } from "@/components/ui/checkbox";

interface Site { id: string; project_id: string | null; site_code: string; name: string; }
interface MonitoringVisit {
  id: string; project_id: string; site_id: string | null;
  visit_code: string | null; visit_type: string; status: string;
  planned_date: string | null; planned_date_end: string | null;
  actual_date: string | null; actual_date_end: string | null;
  monitor_name: string | null; summary: string | null;
  report_link: string | null; report_date: string | null;
  checklist?: Record<string, { checked: boolean; link?: string }>;
}
interface OversightItem {
  id: string; monitoring_visit_id: string; category: string | null; severity: string;
  quantity: number; description: string; action_required: string | null; due_date: string | null;
  status: string; resolved_date: string | null; resolution_notes: string | null;
}
interface MonitorNote {
  id: string; monitoring_visit_id: string; project_id: string;
  author_id: string | null; author_name: string | null;
  category: string | null; importance: string; content: string;
  created_at: string; updated_at: string;
}

const VISIT_TYPES = ["SIV", "IMV", "COV", "Remote", "Other"];
const DEFAULT_CHECKLIST_ITEMS = [
  "Confirm availability of PI and study staff",
  "Review Subject Enrollment and Screening logs",
  "Verify Source Documentation (SDV)",
  "Review Informed Consent Forms (ICFs)",
  "Perform Drug/Device Accountability",
  "Review Investigator Site File (ISF)",
  "Discuss deviations/findings with PI",
  "Tour facilities (if applicable)",
];

const VISIT_STATUSES = ["planned", "scheduled", "in_progress", "completed", "pending_report"];
const FINDING_SEVERITIES = ["low", "medium", "high", "critical"];
const FINDING_STATUSES = ["open", "in_progress", "resolved", "closed"];
const OVERSIGHT_CATEGORIES = [
  { value: "pending", label: "Pending Item" },
  { value: "other", label: "Other" },
];
const categoryLabel = (c: string | null) =>
  OVERSIGHT_CATEGORIES.find(o => o.value === c)?.label || (c || "—");
const categoryColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  ecrf_query: "bg-purple-100 text-purple-800",
  protocol_deviation: "bg-red-100 text-red-800",
  ae_deviation: "bg-pink-100 text-pink-800",
  other: "bg-gray-100 text-gray-800",
};
const NOTE_CATEGORIES = ["General", "Site staff", "Subjects", "Documents", "Drug accountability", "Protocol deviation", "Action item", "Other"];
const NOTE_IMPORTANCE = ["low", "medium", "high"];

const statusColors: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800",
  scheduled: "bg-cyan-100 text-cyan-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  pending_report: "bg-orange-100 text-orange-800",
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
  planned_date: "", planned_date_end: "",
  actual_date: "", actual_date_end: "",
  monitor_name: "", 
  summary: "", report_link: "", report_date: "",
  checklist: {} as Record<string, { checked: boolean; link?: string }>,
};

const emptyFinding = {
  category: "pending", severity: "medium", quantity: 1, description: "", action_required: "",
  due_date: "", status: "open", resolved_date: "", resolution_notes: "",
};

const emptyNote = {
  category: "General", importance: "medium", content: "",
};

const importanceColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

export default function SiteMonitoring() {
  const navigate = (path: string) => window.location.assign(path);
  const [searchParams] = useSearchParams();
  const { projectId: persistedProjectId, setProjectId } = usePersistedFilters();
  const [selectedProject, setSelectedProject] = useState(persistedProjectId || "");
  const [sites, setSites] = useState<Site[]>([]);
  const [visits, setVisits] = useState<MonitoringVisit[]>([]);
  const [findings, setFindings] = useState<OversightItem[]>([]);
  const [notes, setNotes] = useState<MonitorNote[]>([]);
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
  const [editingFinding, setEditingFinding] = useState<OversightItem | null>(null);
  const [findingForm, setFindingForm] = useState(emptyFinding);

  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesVisit, setNotesVisit] = useState<MonitoringVisit | null>(null);
  const [editingNote, setEditingNote] = useState<MonitorNote | null>(null);
  const [noteForm, setNoteForm] = useState(emptyNote);

  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const openEdit = useCallback((v: MonitoringVisit) => {
    setEditing(v);
    setForm({
      site_id: v.site_id || "", visit_code: v.visit_code || "", visit_type: v.visit_type,
      status: v.status, 
      planned_date: v.planned_date || "", planned_date_end: v.planned_date_end || "",
      actual_date: v.actual_date || "", actual_date_end: v.actual_date_end || "",
      monitor_name: v.monitor_name || "", summary: v.summary || "",
      report_link: v.report_link || "", report_date: v.report_date || "",
      checklist: v.checklist || {},
    });
    setDialogOpen(true);
  }, []);

  useEffect(() => {
    const visitId = searchParams.get("visitId");
    if (visitId) {
      setExpandedVisitId(visitId);
      

      // Wait for data to load then scroll to it
      setTimeout(() => {
        const element = document.getElementById(`visit-${visitId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [searchParams, visits, openEdit]);

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
      const [{ data: f }, { data: n }] = await Promise.all([
        supabase.from("site_monitoring_oversight" as any).select("*").in("monitoring_visit_id", ids),
        supabase.from("monitor_notes" as any).select("*").in("monitoring_visit_id", ids).order("created_at", { ascending: false }),
      ]);
      setFindings((f as any) || []);
      setNotes((n as any) || []);
    } else {
      setFindings([]);
      setNotes([]);
    }
    setLoading(false);
  }, [selectedProject]);

  const siteName = (id: string | null) => {
    if (!id) return "—";
    const s = sites.find(x => x.id === id);
    return s ? `${s.site_code} — ${s.name}` : "Unknown";
  };

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, site_id: sites[0]?.id || "" }); setDialogOpen(true); };

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
      planned_date_end: form.planned_date_end || null,
      actual_date: form.actual_date || null,
      actual_date_end: form.actual_date_end || null,
      monitor_name: form.monitor_name.trim() || null,
      summary: form.summary.trim() || null,
      checklist: form.checklist,
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
    if (!confirm("Delete this monitoring visit and all its oversight items?")) return;
    await supabase.from("site_monitoring_visits" as any).delete().eq("id", id);
    toast.success("Deleted"); loadData();
  };

  // Findings
  const openFindings = (v: MonitoringVisit) => { setSelectedVisit(v); setEditingFinding(null); setFindingForm(emptyFinding); setFindingDialogOpen(true); };
  const editFinding = (f: OversightItem) => {
    setEditingFinding(f);
    setFindingForm({
      category: f.category || "", severity: f.severity, quantity: f.quantity ?? 1, description: f.description,
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
      quantity: Math.max(1, Number(findingForm.quantity) || 1),
      description: findingForm.description.trim(),
      action_required: findingForm.action_required.trim() || null,
      due_date: findingForm.due_date || null,
      status: findingForm.status,
      resolved_date: findingForm.resolved_date || null,
      resolution_notes: findingForm.resolution_notes.trim() || null,
    };
    if (editingFinding) {
      await supabase.from("site_monitoring_oversight" as any).update(payload).eq("id", editingFinding.id);
      toast.success("Oversight item updated");
    } else {
      await supabase.from("site_monitoring_oversight" as any).insert(payload);
      toast.success("Oversight item added");
    }
    cancelFindingEdit(); loadData();
  };
  const deleteFinding = async (id: string) => {
    await supabase.from("site_monitoring_oversight" as any).delete().eq("id", id);
    toast.success("Oversight item deleted"); loadData();
  };

  const visitFindings = (vid: string) => findings.filter(f => f.monitoring_visit_id === vid);
  const visitNotes = (vid: string) => notes.filter(n => n.monitoring_visit_id === vid);

  // Monitor Notes CRUD
  const openNotes = (v: MonitoringVisit) => {
    setNotesVisit(v);
    setEditingNote(null);
    setNoteForm(emptyNote);
    setNotesDialogOpen(true);
  };
  const editNote = (n: MonitorNote) => {
    setEditingNote(n);
    setNoteForm({
      category: n.category || "General",
      importance: n.importance,
      content: n.content,
    });
  };
  const cancelNoteEdit = () => { setEditingNote(null); setNoteForm(emptyNote); };
  const saveNote = async () => {
    if (!notesVisit) return;
    if (!noteForm.content.trim()) { toast.error("Content is required"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      : { data: null as any };
    const payload = {
      monitoring_visit_id: notesVisit.id,
      project_id: notesVisit.project_id,
      author_id: user?.id || null,
      author_name: (profile as any)?.full_name || user?.email || null,
      category: noteForm.category || null,
      importance: noteForm.importance,
      content: noteForm.content.trim(),
    };
    if (editingNote) {
      const { error } = await supabase.from("monitor_notes" as any)
        .update({ category: payload.category, importance: payload.importance, content: payload.content })
        .eq("id", editingNote.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Note updated");
    } else {
      const { error } = await supabase.from("monitor_notes" as any).insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Note added");
    }
    cancelNoteEdit();
    loadData();
  };
  const deleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    const { error } = await supabase.from("monitor_notes" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Note deleted");
    loadData();
  };

  const filtered = useMemo(() => visits.filter(v => {
    const matchSearch = !search || (v.monitor_name || "").toLowerCase().includes(search.toLowerCase())
      || (v.visit_code || "").toLowerCase().includes(search.toLowerCase())
      || (v.summary || "").toLowerCase().includes(search.toLowerCase());
    const matchSite = siteFilter === "all" || v.site_id === siteFilter;
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    const matchType = typeFilter === "all" || v.visit_type === typeFilter;
    return matchSearch && matchSite && matchStatus && matchType;
  }), [visits, search, siteFilter, statusFilter, typeFilter]);

  const today = todayDateOnly();
  const planned = filtered.filter(v => ["planned", "scheduled"].includes(v.status));
  const completed = filtered.filter(v => v.status === "completed");
  const overdue = filtered.filter(v => ["planned", "scheduled"].includes(v.status) && v.planned_date && v.planned_date < today);

  const filteredVisitIds = useMemo(() => new Set(filtered.map(v => v.id)), [filtered]);
  const filteredFindings = useMemo(
    () => findings.filter(f => filteredVisitIds.has(f.monitoring_visit_id)),
    [findings, filteredVisitIds]
  );
  const filteredNotes = useMemo(
    () => notes.filter(n => filteredVisitIds.has(n.monitoring_visit_id)),
    [notes, filteredVisitIds]
  );

  const exportData = filtered.map(v => ({
    Site: siteName(v.site_id), Code: v.visit_code || "", Type: v.visit_type,
    Status: v.status, "Planned Date": v.planned_date || "", "Actual Date": v.actual_date || "",
    Monitor: v.monitor_name || "", Summary: v.summary || "",
    "Report Date": v.report_date || "",
    "Report Link": v.report_link || "", Oversight: visitFindings(v.id).length,
  }));

  const renderTable = (rows: MonitoringVisit[]) => (
    rows.length === 0 ? <p className="text-muted-foreground text-center py-8">No monitoring visits found.</p> : (
      <Table>
        <TableHeader><TableRow>
          <TableHead className="w-[30px]"></TableHead>
          <TableHead>Site</TableHead><TableHead>Code</TableHead><TableHead>Type</TableHead>
          <TableHead>Status</TableHead><TableHead>Planned</TableHead><TableHead>Actual</TableHead>
          <TableHead>Monitor</TableHead><TableHead>Oversight</TableHead><TableHead>Report</TableHead>
          <TableHead className="w-[160px]">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map(v => {
            const fs = visitFindings(v.id);
            const open = fs.filter(f => f.status === "open" || f.status === "in_progress").length;
            const isExpanded = expandedVisitId === v.id;
            return (
              <>
                <TableRow key={v.id} id={`visit-${v.id}`} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setExpandedVisitId(isExpanded ? null : v.id)}>
                  <TableCell>
                    <History className={`h-4 w-4 text-muted-foreground transition-colors ${isExpanded ? "text-primary" : ""}`} />
                  </TableCell>
                  <TableCell className="text-sm">{siteName(v.site_id)}</TableCell>
                  <TableCell className="font-mono text-xs">{v.visit_code || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{v.visit_type}</Badge></TableCell>
                  <TableCell><Badge className={statusColors[v.status] || ""}>{v.status.replace("_", " ")}</Badge></TableCell>
                  <TableCell>
                    {v.planned_date || "—"}
                    {v.planned_date_end && v.planned_date_end !== v.planned_date && ` to ${v.planned_date_end}`}
                  </TableCell>
                  <TableCell>
                    {v.actual_date || "—"}
                    {v.actual_date_end && v.actual_date_end !== v.actual_date && ` to ${v.actual_date_end}`}
                  </TableCell>
                  <TableCell>{v.monitor_name || "—"}</TableCell>
                  <TableCell>
                    {fs.length === 0 ? "—" : (
                      <span className="text-sm">{fs.length} <span className="text-muted-foreground">({open} open)</span></span>
                    )}
                  </TableCell>
                  <TableCell>{v.report_link ? <a href={v.report_link} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline" onClick={e => e.stopPropagation()}><ExternalLink className="h-3.5 w-3.5" />Open</a> : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Oversight"
                        onClick={() => {
                          setSelectedVisit(v);
                          setEditingFinding(null);
                          setFindingForm(emptyFinding);
                          setFindingDialogOpen(true);
                        }}
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Monitor Notes"
                        onClick={() => {
                          setNotesVisit(v);
                          setEditingNote(null);
                          setNoteForm(emptyNote);
                          setNotesDialogOpen(true);
                        }}
                      >
                        <span className="relative inline-flex">
                          <StickyNote className="h-4 w-4" />
                          {visitNotes(v.id).length > 0 && (
                            <span className="absolute -top-1 -right-2 text-[9px] font-semibold bg-primary text-primary-foreground rounded-full px-1 leading-none py-[1px]">
                              {visitNotes(v.id).length}
                            </span>
                          )}
                        </span>
                      </Button>
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => deleteVisit(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={11} className="p-4">
                      <div className="max-w-4xl mx-auto">
                        <AuditTrail entityId={v.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    )
  );

  return (
    <ModulePageLayout
      title="Site Monitoring"
      subtitle="Plan visits and supervise pending items"
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
          {(() => {
            const openItems = filteredFindings.filter(f => f.status === "open" || f.status === "in_progress");
            const byCat = (cat: string) => openItems.filter(f => f.category === cat).length;
            const todayMs = Date.now();
            const dueDays = openItems
              .filter(f => f.due_date)
              .map(f => Math.round((new Date(f.due_date as string).getTime() - todayMs) / 86400000));
            const avgDays = dueDays.length ? Math.round(dueDays.reduce((a, b) => a + b, 0) / dueDays.length) : null;
            const criticalOpen = openItems.filter(f => f.severity === "critical").length;
            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <Card><CardContent className="py-4"><div className="flex items-center gap-3"><CalendarClock className="h-5 w-5 text-blue-600" /><div><p className="text-xs text-muted-foreground">Planned Visits</p><p className="text-2xl font-semibold">{planned.length}</p></div></div></CardContent></Card>
                  <Card><CardContent className="py-4"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-600" /><div><p className="text-xs text-muted-foreground">Completed Visits</p><p className="text-2xl font-semibold">{completed.length}</p></div></div></CardContent></Card>
                  <Card><CardContent className="py-4"><div className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-red-600" /><div><p className="text-xs text-muted-foreground">Overdue</p><p className="text-2xl font-semibold">{overdue.length}</p></div></div></CardContent></Card>
                  <Card><CardContent className="py-4"><div className="flex items-center gap-3"><ClipboardList className="h-5 w-5 text-purple-600" /><div><p className="text-xs text-muted-foreground">Total Visits</p><p className="text-2xl font-semibold">{filtered.length}</p></div></div></CardContent></Card>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <Card><CardContent className="py-4"><div className="flex items-center gap-3"><ClipboardList className="h-5 w-5 text-amber-600" /><div><p className="text-xs text-muted-foreground">Pending Items</p><p className="text-2xl font-semibold">{byCat("pending")}</p></div></div></CardContent></Card>
                  <Card><CardContent className="py-4"><div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-700" /><div><p className="text-xs text-muted-foreground">Critical Open</p><p className="text-2xl font-semibold">{criticalOpen}</p></div></div></CardContent></Card>
                  <Card><CardContent className="py-4"><div className="flex items-center gap-3"><Hourglass className="h-5 w-5 text-blue-600" /><div><p className="text-xs text-muted-foreground">Avg Days to Due</p><p className="text-2xl font-semibold">{avgDays === null ? "—" : avgDays}</p></div></div></CardContent></Card>
                </div>
              </>
            );
          })()}

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
                    <TabsTrigger value="findings">Oversight ({filteredFindings.length})</TabsTrigger>
                    <TabsTrigger value="notes">Notes ({filteredNotes.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all">{renderTable(filtered)}</TabsContent>
                  <TabsContent value="planned">{renderTable(planned)}</TabsContent>
                  <TabsContent value="completed">{renderTable(completed)}</TabsContent>

                  <TabsContent value="findings">
                    {filteredFindings.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No oversight items match the current filters.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[30px]"></TableHead>
                            <TableHead>Site</TableHead>
                            <TableHead>Visit</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Action Required</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Days Left</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Resolved</TableHead>
                            <TableHead className="w-[60px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredFindings
                            .slice()
                            .sort((a, b) => {
                              const va = visits.find(v => v.id === a.monitoring_visit_id);
                              const vb = visits.find(v => v.id === b.monitoring_visit_id);
                              return (vb?.planned_date || "").localeCompare(va?.planned_date || "");
                            })
                            .map(f => {
                              const v = visits.find(x => x.id === f.monitoring_visit_id);
                              const daysLeft = f.due_date
                                ? Math.round((new Date(f.due_date).getTime() - Date.now()) / 86400000)
                                : null;
                              const isOpen = f.status === "open" || f.status === "in_progress";
                              const isExpanded = expandedFindingId === f.id;
                              return (
                                <>
                                  <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setExpandedFindingId(isExpanded ? null : f.id)}>
                                    <TableCell>
                                      <History className={`h-4 w-4 text-muted-foreground transition-colors ${isExpanded ? "text-primary" : ""}`} />
                                    </TableCell>
                                    <TableCell className="text-sm">{v ? siteName(v.site_id) : "—"}</TableCell>
                                    <TableCell className="font-mono text-xs">{v?.visit_code || "—"}</TableCell>
                                    <TableCell><Badge className={categoryColors[f.category || "other"] || ""}>{categoryLabel(f.category)}</Badge></TableCell>
                                    <TableCell><Badge className={severityColors[f.severity] || ""}>{f.severity}</Badge></TableCell>
                                    <TableCell className="max-w-[260px] text-sm whitespace-pre-wrap">{f.description}</TableCell>
                                    <TableCell className="max-w-[200px] text-sm whitespace-pre-wrap">{f.action_required || "—"}</TableCell>
                                    <TableCell>{f.due_date || "—"}</TableCell>
                                    <TableCell className={isOpen && daysLeft !== null && daysLeft < 0 ? "text-destructive font-semibold" : ""}>
                                      {daysLeft === null ? "—" : `${daysLeft}d`}
                                    </TableCell>
                                    <TableCell><Badge className={findingStatusColors[f.status] || ""}>{f.status.replace("_", " ")}</Badge></TableCell>
                                    <TableCell>{f.resolved_date || "—"}</TableCell>
                                    <TableCell>
                                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          title="Edit"
                                          onClick={() => {
                                            setSelectedVisit(v || null);
                                            editFinding(f);
                                            setFindingDialogOpen(true);
                                          }}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          title="Delete"
                                          onClick={() => deleteFinding(f.id)}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded && (
                                    <TableRow className="bg-muted/30">
                                      <TableCell colSpan={12} className="p-4">
                                        <div className="max-w-4xl mx-auto">
                                          <AuditTrail entityId={f.id} />
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </>
                              );
                            })}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  <TabsContent value="notes">
                    {filteredNotes.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No monitor notes match the current filters.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[30px]"></TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Site</TableHead>
                            <TableHead>Visit</TableHead>
                            <TableHead>Author</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Importance</TableHead>
                            <TableHead>Note</TableHead>
                            <TableHead className="w-[60px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredNotes.map(n => {
                            const v = visits.find(x => x.id === n.monitoring_visit_id);
                            const isExpanded = expandedNoteId === n.id;
                            return (
                              <>
                                <TableRow key={n.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setExpandedNoteId(isExpanded ? null : n.id)}>
                                  <TableCell>
                                    <History className={`h-4 w-4 text-muted-foreground transition-colors ${isExpanded ? "text-primary" : ""}`} />
                                  </TableCell>
                                  <TableCell className="text-xs whitespace-nowrap">{formatInBrasilia(n.created_at, "dd/MM/yyyy, HH:mm")}</TableCell>
                                  <TableCell className="text-sm">{v ? siteName(v.site_id) : "—"}</TableCell>
                                  <TableCell className="font-mono text-xs">{v?.visit_code || "—"}</TableCell>
                                  <TableCell className="text-sm">{n.author_name || "—"}</TableCell>
                                  <TableCell>{n.category || "—"}</TableCell>
                                  <TableCell><Badge className={importanceColors[n.importance] || ""}>{n.importance}</Badge></TableCell>
                                  <TableCell className="max-w-[420px] text-sm whitespace-pre-wrap">{n.content}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Edit"
                                        onClick={() => {
                                          setNotesVisit(v || null);
                                          editNote(n);
                                          setNotesDialogOpen(true);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Delete"
                                        onClick={() => deleteNote(n.id)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                                {isExpanded && (
                                  <TableRow className="bg-muted/30">
                                    <TableCell colSpan={9} className="p-4">
                                      <div className="max-w-4xl mx-auto">
                                        <AuditTrail entityId={n.id} />
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
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
              <div><Label>Planned Date (Start)</Label><Input type="date" value={form.planned_date} onChange={e => setForm({...form, planned_date: e.target.value})} /></div>
              <div><Label>Planned Date (End)</Label><Input type="date" value={form.planned_date_end} onChange={e => setForm({...form, planned_date_end: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Actual Date (Start)</Label><Input type="date" value={form.actual_date} onChange={e => setForm({...form, actual_date: e.target.value})} /></div>
              <div><Label>Actual Date (End)</Label><Input type="date" value={form.actual_date_end} onChange={e => setForm({...form, actual_date_end: e.target.value})} /></div>
            </div>
            <div><Label>Monitor (CRA)</Label><Input value={form.monitor_name} onChange={e => setForm({...form, monitor_name: e.target.value})} /></div>
            <div><Label>Summary</Label><Textarea rows={3} value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} /></div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Monitoring Checklist</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1"
                  onClick={() => {
                    const tempId = `New Item ${Object.keys(form.checklist).length + 1}`;
                    setForm({
                      ...form,
                      checklist: { ...form.checklist, [tempId]: { checked: false, link: "" } }
                    });
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Add Item
                </Button>
              </div>
              <div className="grid gap-2 border rounded-md p-3 bg-muted/20">
                {Object.keys(form.checklist).length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-muted-foreground mb-2">No items in checklist.</p>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => {
                        const newChecklist = { ...form.checklist };
                        DEFAULT_CHECKLIST_ITEMS.forEach(item => {
                          if (!newChecklist[item]) {
                            newChecklist[item] = { checked: false, link: "" };
                          }
                        });
                        setForm({ ...form, checklist: newChecklist });
                      }}
                    >
                      Load Default Items
                    </Button>
                  </div>
                ) : (
                  Object.entries(form.checklist).map(([itemText, data]) => (
                    <div key={itemText} className="space-y-2 py-2 border-b last:border-0 border-muted-foreground/10 group">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 flex-1">
                          <Checkbox 
                            id={`sm-chk-${itemText}`} 
                            checked={!!data.checked} 
                            onCheckedChange={(val) => {
                              setForm({
                                ...form,
                                checklist: { 
                                  ...form.checklist, 
                                  [itemText]: { ...data, checked: !!val } 
                                }
                              });
                            }}
                          />
                          <Input
                            className="h-8 text-sm font-medium border-transparent bg-transparent hover:border-muted focus:bg-background transition-colors"
                            value={itemText}
                            onChange={(e) => {
                              const newText = e.target.value;
                              if (newText === itemText) return;
                              const newChecklist = { ...form.checklist };
                              delete newChecklist[itemText];
                              newChecklist[newText] = data;
                              setForm({ ...form, checklist: newChecklist });
                            }}
                          />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            const newChecklist = { ...form.checklist };
                            delete newChecklist[itemText];
                            setForm({ ...form, checklist: newChecklist });
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div><Label>Summary</Label><Textarea rows={3} value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} /></div>
            <div><Label>Summary</Label><Textarea rows={3} value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Report Date</Label><Input type="date" value={form.report_date} onChange={e => setForm({...form, report_date: e.target.value})} /></div>
              <div><Label>Report Link</Label><Input type="url" value={form.report_link} onChange={e => setForm({...form, report_link: e.target.value})} placeholder="https://..." /></div>
            </div>
            {editing && <AuditTrail entityId={editing.id} />}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={saveVisit}>{editing ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Oversight Dialog */}
      <Dialog open={findingDialogOpen} onOpenChange={setFindingDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Oversight — {selectedVisit?.visit_type} {selectedVisit && `(${siteName(selectedVisit.site_id)})`}</DialogTitle>
          </DialogHeader>
          {selectedVisit && (
            <div className="grid gap-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-3">{editingFinding ? "Edit Oversight Item" : "Add Oversight Item"}</h4>
                <div className="grid gap-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Category</Label>
                      <Select value={findingForm.category || "other"} onValueChange={v => setFindingForm({...findingForm, category: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{OVERSIGHT_CATEGORIES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Quantity</Label>
                      <Input
                        type="number"
                        min={1}
                        value={findingForm.quantity}
                        onChange={e => setFindingForm({...findingForm, quantity: Math.max(1, parseInt(e.target.value) || 1)})}
                      />
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
                    <div><Label>Resolution Deadline</Label><Input type="date" value={findingForm.due_date} onChange={e => setFindingForm({...findingForm, due_date: e.target.value})} /></div>
                    <div><Label>Resolved Date</Label><Input type="date" value={findingForm.resolved_date} onChange={e => setFindingForm({...findingForm, resolved_date: e.target.value})} /></div>
                  </div>
                  <div><Label>Resolution Notes</Label><Textarea rows={2} value={findingForm.resolution_notes} onChange={e => setFindingForm({...findingForm, resolution_notes: e.target.value})} /></div>
                  <div className="flex gap-2 justify-end">
                    {editingFinding && <Button variant="outline" size="sm" onClick={cancelFindingEdit}>Cancel Edit</Button>}
                    <Button size="sm" onClick={saveFinding}>{editingFinding ? "Update Item" : "Add Item"}</Button>
                  </div>
                </div>
              </Card>

              <div>
                <h4 className="font-semibold mb-2">Existing Oversight Items ({visitFindings(selectedVisit.id).length})</h4>
                {visitFindings(selectedVisit.id).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No oversight items recorded.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Category</TableHead><TableHead>Severity</TableHead><TableHead>Description</TableHead>
                      <TableHead>Status</TableHead><TableHead>Due</TableHead><TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {visitFindings(selectedVisit.id).map(f => {
                        const isExpanded = expandedFindingId === f.id;
                        return (
                          <>
                            <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedFindingId(isExpanded ? null : f.id)}>
                              <TableCell><Badge className={categoryColors[f.category || "other"] || ""}>{categoryLabel(f.category)}</Badge></TableCell>
                              <TableCell><Badge className={severityColors[f.severity] || ""}>{f.severity}</Badge></TableCell>
                              <TableCell className="text-sm max-w-xs truncate" title={f.description}>{f.description}</TableCell>
                              <TableCell><Badge className={findingStatusColors[f.status] || ""}>{f.status.replace("_", " ")}</Badge></TableCell>
                              <TableCell>{f.due_date || "—"}</TableCell>
                              <TableCell>
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setExpandedFindingId(isExpanded ? null : f.id)}
                                    title="View History"
                                  >
                                    <History className={`h-4 w-4 ${isExpanded ? "text-primary" : ""}`} />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => editFinding(f)}><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => deleteFinding(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow className="bg-muted/30">
                                <TableCell colSpan={6} className="p-4">
                                  <AuditTrail entityId={f.id} />
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Monitor Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={(open) => { setNotesDialogOpen(open); if (!open) cancelNoteEdit(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Monitor Notes {notesVisit && (
                <span className="text-sm font-normal text-muted-foreground">
                  — {siteName(notesVisit.site_id)} {notesVisit.visit_code ? `(${notesVisit.visit_code})` : ""}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {notesVisit && (
            <div className="space-y-6">
              {/* Note form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{editingNote ? "Edit note" : "Add new note"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Category</Label>
                      <Select value={noteForm.category} onValueChange={v => setNoteForm({ ...noteForm, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{NOTE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Importance</Label>
                      <Select value={noteForm.importance} onValueChange={v => setNoteForm({ ...noteForm, importance: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{NOTE_IMPORTANCE.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Note *</Label>
                    <Textarea
                      rows={4}
                      value={noteForm.content}
                      onChange={e => setNoteForm({ ...noteForm, content: e.target.value })}
                      placeholder="Record observations, follow-ups, conversations with site staff, action items, etc."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    {editingNote && <Button variant="outline" size="sm" onClick={cancelNoteEdit}>Cancel</Button>}
                    <Button size="sm" onClick={saveNote}>
                      <Plus className="h-4 w-4 mr-1" />{editingNote ? "Update note" : "Add note"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Notes history */}
              <div>
                <h4 className="font-semibold mb-2">History ({visitNotes(notesVisit.id).length})</h4>
                {visitNotes(notesVisit.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No notes yet for this visit.</p>
                ) : (
                  <div className="space-y-3">
                    {visitNotes(notesVisit.id).map(n => {
                      const isExpanded = expandedNoteId === n.id;
                      return (
                        <Card key={n.id}>
                          <CardContent className="py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <Badge className={importanceColors[n.importance] || ""}>{n.importance}</Badge>
                                  {n.category && <Badge variant="outline">{n.category}</Badge>}
                                  <span className="text-xs text-muted-foreground">
                                    {n.author_name || "—"} · {formatInBrasilia(n.created_at, "dd/MM/yyyy, HH:mm")}
                                    {n.updated_at !== n.created_at && " (edited)"}
                                  </span>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 px-1 text-muted-foreground"
                                    onClick={() => setExpandedNoteId(isExpanded ? null : n.id)}
                                  >
                                    <History className={`h-3 w-3 mr-1 ${isExpanded ? "text-primary" : ""}`} />
                                    {isExpanded ? "Hide History" : "Show History"}
                                  </Button>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                                {isExpanded && <AuditTrail entityId={n.id} />}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" title="Edit" onClick={() => editNote(n)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" title="Delete" onClick={() => deleteNote(n.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ModulePageLayout>
  );
}
