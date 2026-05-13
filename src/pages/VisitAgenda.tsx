import { parseLocalDate, formatDateOnly, todayDateOnly } from "@/lib/dateUtils";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CTMSNav from "@/components/CTMSNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar as CalendarIcon, List, MapPin, Clock, FileText, CheckSquare, CheckCircle2, AlertTriangle, Pencil, Trash2, ShieldCheck, StickyNote, History } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import KpiCards from "@/components/shared/KpiCards";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfYear, endOfYear, addYears, subYears, eachMonthOfInterval, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import NewVisitDialog from "@/components/visits/NewVisitDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuditTrail } from "@/components/shared/AuditTrail";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MonitoringVisit {
  id: string; project_id: string; site_id: string | null;
  visit_code: string | null; visit_type: string; status: string;
  planned_date: string | null; planned_date_end: string | null;
  actual_date: string | null; actual_date_end: string | null;
  monitor_name: string | null; purpose: string | null; summary: string | null;
  follow_up_actions: string | null; report_link: string | null; report_date: string | null;
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

interface Visit {
  id: string;
  visit_type: string;
  visit_number: number | null;
  scheduled_date: string;
  scheduled_date_end: string | null;
  scheduled_time: string | null;
  status: string;
  notes: string | null;
  project: { id: string; title: string } | null;
  research_center: { id: string; code: string; name: string | null } | null;
  source: 'study_visits' | 'site_monitoring';
}

interface Task {
  id: string;
  title: string;
  end_date: string | null;
  status: string;
  priority: string | null;
  project?: { title: string } | null;
}

interface Project {
  id: string;
  title: string;
}

const visitTypeColors: Record<string, string> = {
  SQV: "bg-info/20 text-info border-info/30",
  SIV: "bg-success/20 text-success border-success/30",
  IMV: "bg-primary/20 text-primary border-primary/30",
  COV: "bg-warning/20 text-warning border-warning/30",
};

const statusColors: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/20 text-primary",
  completed: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
};

const statusLabels: Record<string, string> = {
  scheduled: "Agendada",
  in_progress: "Em Andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const taskStatusColors: Record<string, string> = {
  pending: "bg-orange-500/20 text-orange-600 border-orange-500/30",
  in_progress: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  completed: "bg-green-500/20 text-green-600 border-green-500/30",
  cancelled: "bg-gray-500/20 text-gray-600 border-gray-500/30",
};

const VISIT_TYPES = ["SIV", "IMV", "COV", "Remote", "Other"];
const VISIT_STATUSES = ["planned", "scheduled", "in_progress", "completed", "cancelled", "postponed"];
const FINDING_SEVERITIES = ["low", "medium", "high", "critical"];
const FINDING_STATUSES = ["open", "in_progress", "resolved", "closed"];
const OVERSIGHT_CATEGORIES = [
  { value: "pending", label: "Pending Item" },
  { value: "ecrf_query", label: "eCRF Query" },
  { value: "protocol_deviation", label: "Protocol Deviation" },
  { value: "ae_deviation", label: "AE Deviation" },
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

const monStatusColors: Record<string, string> = {
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
  planned_date: "", planned_date_end: "",
  actual_date: "", actual_date_end: "",
  monitor_name: "", purpose: "",
  summary: "", follow_up_actions: "", report_link: "", report_date: "",
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

export default function VisitAgenda() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newVisitOpen, setNewVisitOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [timeRange, setTimeRange] = useState<"month" | "semester" | "year">("month");

  // Monitoring Edit Dialog States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MonitoringVisit | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sites, setSites] = useState<any[]>([]);
  const [findings, setFindings] = useState<OversightItem[]>([]);
  const [notes, setNotes] = useState<MonitorNote[]>([]);
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [findingDialogOpen, setFindingDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<MonitoringVisit | null>(null);
  const [editingFinding, setEditingFinding] = useState<OversightItem | null>(null);
  const [findingForm, setFindingForm] = useState(emptyFinding);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesVisit, setNotesVisit] = useState<MonitoringVisit | null>(null);
  const [editingNote, setEditingNote] = useState<MonitorNote | null>(null);
  const [noteForm, setNoteForm] = useState(emptyNote);

  const visitFindings = (vid: string) => findings.filter(f => f.monitoring_visit_id === vid);
  const visitNotes = (vid: string) => notes.filter(n => n.monitoring_visit_id === vid);

  const editFinding = (f: OversightItem) => {
    setEditingFinding(f);
    setFindingForm({
      category: f.category || "", severity: f.severity, quantity: f.quantity ?? 1, description: f.description,
      action_required: f.action_required || "", due_date: f.due_date || "", status: f.status,
      resolved_date: f.resolved_date || "", resolution_notes: f.resolution_notes || "",
    });
  };

  const editNote = (n: MonitorNote) => {
    setEditingNote(n);
    setNoteForm({
      category: n.category || "General",
      importance: n.importance,
      content: n.content,
    });
  };

  const openEdit = useCallback(async (visit: Visit) => {
    if (visit.source !== 'site_monitoring') {
      navigate(`/visits/${visit.id}`);
      return;
    }

    try {
      setLoading(true);
      const { data: v, error } = await supabase
        .from("site_monitoring_visits" as any)
        .select("*")
        .eq("id", visit.id)
        .single();
      
      if (error) throw error;
      
      const monVisit = v as any;
      setEditing(monVisit as MonitoringVisit);
      setForm({
        site_id: monVisit.site_id || "", 
        visit_code: monVisit.visit_code || "", 
        visit_type: monVisit.visit_type,
        status: monVisit.status, 
        planned_date: monVisit.planned_date || "", 
        planned_date_end: monVisit.planned_date_end || "",
        actual_date: monVisit.actual_date || "", 
        actual_date_end: monVisit.actual_date_end || "",
        monitor_name: monVisit.monitor_name || "", 
        purpose: monVisit.purpose || "", 
        summary: monVisit.summary || "",
        follow_up_actions: monVisit.follow_up_actions || "", 
        report_link: monVisit.report_link || "", 
        report_date: monVisit.report_date || "",
      });

      // Load related data
      const [{ data: f }, { data: n }, { data: rc }] = await Promise.all([
        supabase.from("site_monitoring_oversight" as any).select("*").eq("monitoring_visit_id", visit.id),
        supabase.from("monitor_notes" as any).select("*").eq("monitoring_visit_id", visit.id).order("created_at", { ascending: false }),
        supabase.from("research_centers").select("id, code, name").eq("project_id", monVisit.project_id)
      ]);

      setFindings((f as any) || []);
      setNotes((n as any) || []);
      setSites(rc || []);
      setDialogOpen(true);
    } catch (error: any) {
      toast.error("Erro ao carregar monitoria: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const saveVisit = async () => {
    if (!form.site_id || !editing) return;
    try {
      const payload = {
        site_id: form.site_id,
        visit_code: form.visit_code.trim() || null,
        visit_type: form.visit_type,
        status: form.status,
        planned_date: form.planned_date || null,
        planned_date_end: form.planned_date_end || null,
        actual_date: form.actual_date || null,
        actual_date_end: form.actual_date_end || null,
        monitor_name: form.monitor_name.trim() || null,
        purpose: form.purpose.trim() || null,
        summary: form.summary.trim() || null,
        follow_up_actions: form.follow_up_actions.trim() || null,
        report_link: form.report_link.trim() || null,
        report_date: form.report_date || null,
      };
      
      const { error } = await supabase.from("site_monitoring_visits" as any).update(payload).eq("id", editing.id);
      if (error) throw error;
      
      toast.success("Monitoring visit updated");
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const cancelFindingEdit = () => { setEditingFinding(null); setFindingForm(emptyFinding); };
  const saveFinding = async () => {
    if (!editing || !findingForm.description.trim()) return;
    try {
      const payload = {
        monitoring_visit_id: editing.id,
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
      } else {
        await supabase.from("site_monitoring_oversight" as any).insert(payload);
      }
      
      // Refresh findings
      const { data } = await supabase.from("site_monitoring_oversight" as any).select("*").eq("monitoring_visit_id", editing.id);
      setFindings((data as any) || []);
      cancelFindingEdit();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteFinding = async (id: string) => {
    await supabase.from("site_monitoring_oversight" as any).delete().eq("id", id);
    const { data } = await supabase.from("site_monitoring_oversight" as any).select("*").eq("monitoring_visit_id", editing?.id);
    setFindings((data as any) || []);
  };

  const cancelNoteEdit = () => { setEditingNote(null); setNoteForm(emptyNote); };
  const saveNote = async () => {
    if (!editing || !noteForm.content.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user?.id).maybeSingle();
      
      const payload = {
        monitoring_visit_id: editing.id,
        project_id: editing.project_id,
        author_id: user?.id || null,
        author_name: profile?.full_name || user?.email || null,
        category: noteForm.category || null,
        importance: noteForm.importance,
        content: noteForm.content.trim(),
      };
      
      if (editingNote) {
        await supabase.from("monitor_notes" as any).update({ category: payload.category, importance: payload.importance, content: payload.content }).eq("id", editingNote.id);
      } else {
        await supabase.from("monitor_notes" as any).insert(payload);
      }
      
      const { data } = await supabase.from("monitor_notes" as any).select("*").eq("monitoring_visit_id", editing.id).order("created_at", { ascending: false });
      setNotes((data as any) || []);
      cancelNoteEdit();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    await supabase.from("monitor_notes" as any).delete().eq("id", id);
    const { data } = await supabase.from("monitor_notes" as any).select("*").eq("monitoring_visit_id", editing?.id).order("created_at", { ascending: false });
    setNotes((data as any) || []);
  };

  const siteName = (id: string | null) => {
    if (!id) return "—";
    const s = sites.find(x => x.id === id);
    return s ? `${s.code} — ${s.name}` : "Unknown";
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const visitId = searchParams.get("visitId");
    const editMode = searchParams.get("edit") === "true";
    if (visitId && editMode && visits.length > 0) {
      const visitToEdit = visits.find(v => v.id === visitId);
      if (visitToEdit) {
        openEdit(visitToEdit);
      }
    }
  }, [searchParams, visits, openEdit]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: isAdminData } = await supabase.rpc('has_role', {
        _user_id: authUser.id,
        _role: 'admin' as any,
      });

      let tasksQuery = supabase
        .from("tasks")
        .select("id, title, end_date, status, priority, project:projects(title)")
        .not("end_date", "is", null)
        .not("status", "eq", "cancelled");

      if (!isAdminData) {
        tasksQuery = tasksQuery.eq("assigned_to", authUser.id);
      }

      const [visitsRes, projectsRes, tasksRes, monitoringRes] = await Promise.all([
        supabase
          .from("study_visits")
          .select("*, project:projects(id, title), research_center:research_centers(id, code, name)")
          .order("scheduled_date", { ascending: true }),
        supabase.from("projects").select("id, title").order("title"),
        tasksQuery.order("end_date", { ascending: true }),
        supabase
          .from("site_monitoring_agenda")
          .select("*")
          .order("scheduled_date", { ascending: true }),
      ]);

      if (visitsRes.error) throw visitsRes.error;
      if (projectsRes.error) throw projectsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (monitoringRes.error) throw monitoringRes.error;

      // Unify visits from both sources
      const studyVisits = (visitsRes.data as any[] || []).map(v => ({
        ...v,
        scheduled_date_end: null,
        source: 'study_visits'
      }));

      const siteMonitoringVisits = (monitoringRes.data as any[] || []).map(v => ({
        id: v.id,
        visit_type: v.visit_type,
        visit_number: null,
        scheduled_date: v.scheduled_date,
        scheduled_date_end: v.scheduled_date_end,
        scheduled_time: null,
        status: v.status,
        notes: null,
        project: { id: v.project_id, title: v.project_title },
        research_center: { id: v.site_id, code: v.site_code, name: v.site_name },
        source: 'site_monitoring'
      }));

      setVisits([...studyVisits, ...siteMonitoringVisits] as Visit[]);
      setProjects(projectsRes.data || []);
      setTasks(tasksRes.data as Task[] || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredVisits = visits.filter(v => {
    const matchProject = selectedProject === "all" || v.project?.id === selectedProject;
    const matchSite = selectedSite === "all" || v.research_center?.id === selectedSite;
    return matchProject && matchSite;
  });

  const availableSites = useMemo(() => {
    const sitesMap = new Map();
    const relevantVisits = selectedProject === "all" 
      ? visits 
      : visits.filter(v => v.project?.id === selectedProject);
      
    relevantVisits.forEach(v => {
      if (v.research_center) {
        sitesMap.set(v.research_center.id, v.research_center);
      }
    });
    return Array.from(sitesMap.values());
  }, [visits, selectedProject]);

  useEffect(() => {
    setSelectedSite("all");
  }, [selectedProject]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getVisitsForDay = (day: Date) => 
    filteredVisits.filter(v => {
      const start = parseLocalDate(v.scheduled_date);
      if (v.scheduled_date_end) {
        const end = parseLocalDate(v.scheduled_date_end);
        return day >= start && day <= end;
      }
      return isSameDay(start, day);
    });

  const getTasksForDay = (day: Date) => 
    tasks.filter(t => t.end_date && isSameDay(parseLocalDate(t.end_date), day));

  const upcomingVisits = filteredVisits
    .filter(v => parseLocalDate(v.scheduled_date) >= new Date() && v.status !== "cancelled")
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agenda de Visitas</h1>
            <p className="text-muted-foreground mt-1">Planeje e acompanhe visitas de monitoria</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os projetos</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por centro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os centros</SelectItem>
                {availableSites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.code} - {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(() => {
          const today = new Date(); today.setHours(0,0,0,0);
          const total = filteredVisits.length;
          const scheduled = filteredVisits.filter(v => v.status === "scheduled" || v.status === "planned").length;
          const completed = filteredVisits.filter(v => v.status === "completed").length;
          const upcoming = filteredVisits.filter(v => (v.status === "scheduled" || v.status === "planned") && v.scheduled_date && new Date(v.scheduled_date) >= today).length;
          const overdue = filteredVisits.filter(v => (v.status === "scheduled" || v.status === "planned") && v.scheduled_date && new Date(v.scheduled_date) < today).length;
          
          return (
            <div className="mb-6">
              <KpiCards cols={5} items={[
                { label: "Total Visits", value: total, icon: CalendarIcon, accent: "primary" },
                { label: "Scheduled/Planned", value: scheduled, icon: Clock, accent: "primary" },
                { label: "Upcoming", value: upcoming, icon: CalendarIcon, accent: "primary" },
                { label: "Overdue", value: overdue, icon: AlertTriangle, accent: "danger" },
                { label: "Completed", value: completed, icon: CheckCircle2, accent: "success" },
              ]} />
            </div>
          );
        })()}

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "list")}>
          <TabsList className="mb-6">
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <Card>
              <CardHeader className="flex flex-col md:flex-row items-center justify-between pb-4 space-y-4 md:space-y-0">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <CardTitle className="text-lg min-w-[150px]">
                    {timeRange === "month" && format(currentDate, "MMMM yyyy", { locale: ptBR })}
                    {timeRange === "semester" && `${format(currentDate, "yyyy")} - ${currentDate.getMonth() < 6 ? '1º Semestre' : '2º Semestre'}`}
                    {timeRange === "year" && format(currentDate, "yyyy")}
                  </CardTitle>
                  <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Visualização" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Mensal</SelectItem>
                      <SelectItem value="semester">Semestral</SelectItem>
                      <SelectItem value="year">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    if (timeRange === "month") setCurrentDate(subMonths(currentDate, 1));
                    else if (timeRange === "semester") setCurrentDate(subMonths(currentDate, 6));
                    else setCurrentDate(subYears(currentDate, 1));
                  }}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                    Hoje
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    if (timeRange === "month") setCurrentDate(addMonths(currentDate, 1));
                    else if (timeRange === "semester") setCurrentDate(addMonths(currentDate, 6));
                    else setCurrentDate(addYears(currentDate, 1));
                  }}>
                    Próximo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {(() => {
                    const months = timeRange === "month" 
                      ? [startOfMonth(currentDate)]
                      : timeRange === "semester"
                        ? eachMonthOfInterval({
                            start: currentDate.getMonth() < 6 ? startOfYear(currentDate) : addMonths(startOfYear(currentDate), 6),
                            end: currentDate.getMonth() < 6 ? addMonths(startOfYear(currentDate), 5) : endOfYear(currentDate)
                          })
                        : eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) });

                    return (
                      <div className={cn(
                        "grid gap-8",
                        timeRange === "month" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      )}>
                        {months.map((month) => {
                          const monthDays = eachDayOfInterval({
                            start: startOfMonth(month),
                            end: endOfMonth(month),
                          });
                          
                          return (
                            <div key={month.toISOString()} className="space-y-3">
                              <h3 className="text-sm font-semibold text-center border-b pb-1 capitalize">
                                {format(month, "MMMM yyyy", { locale: ptBR })}
                              </h3>
                              <div className="grid grid-cols-7 gap-px bg-muted border rounded-sm overflow-hidden">
                                {["D", "S", "T", "Q", "Q", "S", "S"].map((day) => (
                                  <div key={day} className="bg-background p-1 text-center text-[10px] font-bold text-muted-foreground">
                                    {day}
                                  </div>
                                ))}
                                
                                {Array.from({ length: startOfMonth(month).getDay() }).map((_, i) => (
                                  <div key={`empty-${i}`} className="bg-background/50 p-1 h-12 md:h-16" />
                                ))}
                                
                                {monthDays.map((day) => {
                                  const dayVisits = filteredVisits.filter(v => {
                                    const start = parseLocalDate(v.scheduled_date);
                                    if (v.scheduled_date_end) {
                                      const end = parseLocalDate(v.scheduled_date_end);
                                      return day >= start && day <= end;
                                    }
                                    return isSameDay(start, day);
                                  });
                                  
                                  return (
                                    <div
                                      key={day.toISOString()}
                                      className={cn(
                                        "bg-background p-1 h-20 md:h-24 flex flex-col items-start border-t border-l",
                                        isToday(day) && "bg-primary/5"
                                      )}
                                    >
                                      <span className={cn(
                                        "text-[9px] font-bold px-1 mb-1 rounded-sm",
                                        isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                                      )}>
                                        {format(day, "d")}
                                      </span>
                                      <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                                        {dayVisits.slice(0, 4).map((visit) => (
                                          <div 
                                            key={visit.id}
                                            onClick={() => openEdit(visit)}
                                            className={cn(
                                              "text-[8px] leading-tight px-1 py-0.5 rounded-sm cursor-pointer truncate font-medium border",
                                              visit.visit_type === "SQV" && "bg-blue-100 text-blue-800 border-blue-200",
                                              visit.visit_type === "SIV" && "bg-green-100 text-green-800 border-green-200",
                                              visit.visit_type === "IMV" && "bg-primary/10 text-primary border-primary/20",
                                              visit.visit_type === "COV" && "bg-orange-100 text-orange-800 border-orange-200",
                                              !["SQV", "SIV", "IMV", "COV"].includes(visit.visit_type) && "bg-slate-100 text-slate-800 border-slate-200"
                                            )}
                                          >
                                            {visit.visit_type}: {visit.research_center?.code}
                                          </div>
                                        ))}
                                        {dayVisits.length > 4 && (
                                          <span className="text-[7px] font-bold text-muted-foreground pl-1">+{dayVisits.length - 4}</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredVisits.length === 0 ? (
                <Card className="col-span-full p-12 text-center">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma visita agendada</h3>
                  <p className="text-muted-foreground mb-4">Comece agendando sua primeira visita</p>
                  <Button onClick={() => setNewVisitOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agendar Visita
                  </Button>
                </Card>
              ) : (
                filteredVisits.map((visit) => (
                  <Card
                    key={visit.id}
                    className="cursor-pointer hover:shadow-elevated transition-smooth"
                    onClick={() => openEdit(visit)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <Badge className={visitTypeColors[visit.visit_type]}>
                          {visit.visit_type}
                          {visit.visit_number && ` #${visit.visit_number}`}
                        </Badge>
                        <Badge className={statusColors[visit.status]}>
                          {statusLabels[visit.status]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(parseLocalDate(visit.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                          {visit.scheduled_date_end && ` - ${format(parseLocalDate(visit.scheduled_date_end), "dd/MM/yyyy", { locale: ptBR })}`}
                        </span>
                        {visit.scheduled_time && (
                          <>
                            <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                            <span>{visit.scheduled_time.slice(0, 5)}</span>
                          </>
                        )}
                      </div>
                      {visit.research_center && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{visit.research_center.code} - {visit.research_center.name}</span>
                        </div>
                      )}
                      {visit.project && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>{visit.project.title}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Upcoming visits sidebar */}
        {viewMode === "calendar" && upcomingVisits.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Próximas Visitas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingVisits.map((visit) => (
                  <div
                    key={visit.id}
                    onClick={() => openEdit(visit)}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={visitTypeColors[visit.visit_type]}>{visit.visit_type}</Badge>
                      <div>
                        <p className="font-medium text-sm">{visit.research_center?.name || visit.research_center?.code}</p>
                        <p className="text-xs text-muted-foreground">{visit.project?.title}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(parseLocalDate(visit.scheduled_date), "dd/MM", { locale: ptBR })}
                        {visit.scheduled_date_end && ` - ${format(parseLocalDate(visit.scheduled_date_end), "dd/MM", { locale: ptBR })}`}
                      </p>
                      {visit.scheduled_time && (
                        <p className="text-xs text-muted-foreground">{visit.scheduled_time.slice(0, 5)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <NewVisitDialog
        open={newVisitOpen}
        onOpenChange={setNewVisitOpen}
        projects={projects}
        onSuccess={() => {
          setNewVisitOpen(false);
          fetchData();
        }}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Monitoring Visit</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Site *</Label>
                <Select value={form.site_id} onValueChange={v => setForm({...form, site_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                  <SelectContent>
                    {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}
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
            <div><Label>Purpose / Objective</Label><Textarea rows={2} value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} /></div>
            <div><Label>Summary</Label><Textarea rows={3} value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} /></div>
            <div><Label>Follow-up Actions</Label><Textarea rows={2} value={form.follow_up_actions} onChange={e => setForm({...form, follow_up_actions: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Report Date</Label><Input type="date" value={form.report_date} onChange={e => setForm({...form, report_date: e.target.value})} /></div>
              <div><Label>Report Link</Label><Input type="url" value={form.report_link} onChange={e => setForm({...form, report_link: e.target.value})} placeholder="https://..." /></div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 gap-2" 
                onClick={() => setFindingDialogOpen(true)}
                disabled={!editing}
              >
                <ShieldCheck className="h-4 w-4" />
                Oversight ({findings.length})
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 gap-2" 
                onClick={() => setNotesDialogOpen(true)}
                disabled={!editing}
              >
                <StickyNote className="h-4 w-4" />
                Notes ({notes.length})
              </Button>
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
            <DialogTitle>Oversight — {editing?.visit_type} {editing && `(${siteName(editing.site_id)})`}</DialogTitle>
          </DialogHeader>
          {editing && (
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
                <h4 className="font-semibold mb-2">Existing Oversight Items ({visitFindings(editing.id).length})</h4>
                {visitFindings(editing.id).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No oversight items recorded.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Category</TableHead><TableHead>Severity</TableHead><TableHead>Description</TableHead>
                      <TableHead>Status</TableHead><TableHead>Due</TableHead><TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {visitFindings(editing.id).map(f => {
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
              Monitor Notes {editing && (
                <span className="text-sm font-normal text-muted-foreground">
                  — {siteName(editing.site_id)} {editing.visit_code ? `(${editing.visit_code})` : ""}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {editing && (
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
                      <Select value={noteForm.category || "General"} onValueChange={v => setNoteForm({ ...noteForm, category: v })}>
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
                <h4 className="font-semibold mb-2">History ({visitNotes(editing.id).length})</h4>
                {visitNotes(editing.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No notes yet for this visit.</p>
                ) : (
                  <div className="space-y-3">
                    {visitNotes(editing.id).map(n => {
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
                                    {n.author_name || "—"} · {new Date(n.created_at).toLocaleString("en-US")}
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
    </div>
  );
}
