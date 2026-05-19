import { parseLocalDate, formatDateOnly, todayDateOnly } from "@/lib/dateUtils";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CTMSNav from "@/components/CTMSNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  FlaskConical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar as CalendarIcon,
  CalendarClock,
  ListChecks,
  TrendingUp,
  AlertCircle,
  MapPin,
  Filter,
  X,
  UserCheck,
  FileText,
  DollarSign,
  ShieldAlert,
  GitBranch,
  Gavel,
  Package,
  GraduationCap,
  Award,
  Bell,
  Activity,
} from "lucide-react";
import { format, addDays, differenceInDays, isAfter, isBefore, startOfToday, subDays, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Project {
  id: string;
  title: string;
  protocol_number: string | null;
  status: string;
}

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  overdueTasks: number;
  tasksNext7Days: number;
  tasksNext30Days: number;
  totalVisits: number;
  overdueVisits: number;
  visitsNext7Days: number;
  visitsNext30Days: number;
  completedVisits: number;
  openFindings: number;
  criticalFindings: number;
  totalPatients: number;
  randomizedPatients: number;
  findingsAging: { range: string; count: number }[];
  siteChecklistCompletion: { siteCode: string; siteName: string; completion: number; total: number; completed: number }[];
  // Regulatory
  regOpenSubmissions: number;
  regUpcoming30d: number;
  regReportsOverdue: number;
  // Financial
  budgetTotal: number;
  paidAmount: number;
  pendingPayments: number;
  overduePayments: number;
  // Risk & Quality
  highRisks: number;
  openChangeControls: number;
  pendingSteeringDecisions: number;
  ipLotsExpiring60d: number;
  // Operations
  qualificationsPending: number;
  trainingsOverdue: number;
  trainingsNext30d: number;
  // Communications
  unreadCriticalNotifications: number;
}

interface ProjectHealth {
  id: string;
  title: string;
  protocol: string | null;
  status: string;
  overdueTasks: number;
  overdueVisits: number;
  criticalFindings: number;
  overduePayments: number;
  overdueSubmissions: number;
  highRisks: number;
  scheduleCompletion: number;
  health: "green" | "yellow" | "red";
}

interface UpcomingItem {
  id: string;
  title: string;
  type: "task" | "visit";
  dueDate: string;
  projectCode: string;
  siteCode?: string;
  priority?: string;
  visitType?: string;
}

type PeriodPreset = "7d" | "30d" | "90d" | "custom";

const locale = ptBR;
const dateFormat = "dd/MM/yyyy";
const shortDateFormat = "dd/MM";

const Dashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("30d");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(startOfToday(), 30),
    to: addDays(startOfToday(), 30),
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0, activeProjects: 0, totalTasks: 0, overdueTasks: 0,
    tasksNext7Days: 0, tasksNext30Days: 0, totalVisits: 0, overdueVisits: 0,
    visitsNext7Days: 0, visitsNext30Days: 0, completedVisits: 0,
    openFindings: 0, criticalFindings: 0, totalPatients: 0, randomizedPatients: 0,
    findingsAging: [], siteChecklistCompletion: [],
    regOpenSubmissions: 0, regUpcoming30d: 0, regReportsOverdue: 0,
    budgetTotal: 0, paidAmount: 0, pendingPayments: 0, overduePayments: 0,
    highRisks: 0, openChangeControls: 0, pendingSteeringDecisions: 0, ipLotsExpiring60d: 0,
    qualificationsPending: 0, trainingsOverdue: 0, trainingsNext30d: 0,
    unreadCriticalNotifications: 0,
  });
  const [projectHealth, setProjectHealth] = useState<ProjectHealth[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>([]);

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => {
    if (projects.length > 0 || !loading) loadDashboardData();
  }, [selectedProject, dateRange]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    await fetchProjects();
    await loadDashboardData();
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("id, title, protocol_number, status").order("title");
    setProjects(data || []);
  };

  const handlePeriodChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const today = startOfToday();
    switch (preset) {
      case "7d": setDateRange({ from: subDays(today, 7), to: addDays(today, 7) }); break;
      case "30d": setDateRange({ from: subDays(today, 30), to: addDays(today, 30) }); break;
      case "90d": setDateRange({ from: subDays(today, 90), to: addDays(today, 90) }); break;
      case "custom": setCalendarOpen(true); break;
    }
  };

  const clearFilters = () => {
    setSelectedProject("all");
    setPeriodPreset("30d");
    setDateRange({ from: subDays(startOfToday(), 30), to: addDays(startOfToday(), 30) });
  };

  const hasActiveFilters = selectedProject !== "all" || periodPreset !== "30d";

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const today = startOfToday();
      const in7Days = addDays(today, 7);
      const in30Days = addDays(today, 30);

      let tasksQuery = supabase.from("study_tasks").select("*, site:study_sites(site_code)");
      let visitsQuery = supabase.from("study_visits").select("*, site:study_sites(id, site_code, name), project:projects(id, title, protocol_number)");
      let findingsQuery = supabase.from("visit_findings").select("*, visit:study_visits(id, site_id, project_id)");
      let checklistQuery = supabase.from("visit_checklist_items").select("*, visit:study_visits(site_id, project_id)");
      let patientsQuery = supabase.from("patients").select("*");

      if (selectedProject !== "all") {
        tasksQuery = tasksQuery.eq("project_id", selectedProject);
        visitsQuery = visitsQuery.eq("project_id", selectedProject);
        patientsQuery = patientsQuery.eq("project_id", selectedProject);
      }

      const pid = selectedProject !== "all" ? selectedProject : null;
      const mk = <T,>(builder: () => any) => builder();
      const regSubsQ = pid ? supabase.from("regulatory_submissions").select("id, project_id, status, planned_date, submission_date").eq("project_id", pid) : supabase.from("regulatory_submissions").select("id, project_id, status, planned_date, submission_date");
      const paymentsQ = pid ? supabase.from("vendor_payments").select("id, project_id, amount, status, payment_date, paid_at").eq("project_id", pid) : supabase.from("vendor_payments").select("id, project_id, amount, status, payment_date, paid_at");
      const budgetQ = pid ? supabase.from("project_budget_items").select("project_id, total_value").eq("project_id", pid) : supabase.from("project_budget_items").select("project_id, total_value");
      const risksQ = pid ? supabase.from("risks").select("id, project_id, status, risk_score").eq("project_id", pid) : supabase.from("risks").select("id, project_id, status, risk_score");
      const ccQ = pid ? supabase.from("change_controls").select("id, project_id, status").eq("project_id", pid) : supabase.from("change_controls").select("id, project_id, status");
      const steeringQ = pid ? supabase.from("steering_decisions").select("id, project_id, status, deadline").eq("project_id", pid) : supabase.from("steering_decisions").select("id, project_id, status, deadline");
      const ipQ = pid ? supabase.from("investigational_products").select("id, project_id, expiration_date").eq("project_id", pid) : supabase.from("investigational_products").select("id, project_id, expiration_date");
      const trainingsQ = pid ? supabase.from("trainings").select("id, project_id, status, due_date").eq("project_id", pid) : supabase.from("trainings").select("id, project_id, status, due_date");
      const qualQ = pid ? supabase.from("site_vendor_qualifications").select("id, project_id, qualification_status").eq("project_id", pid) : supabase.from("site_vendor_qualifications").select("id, project_id, qualification_status");
      const phasesQ = pid ? supabase.from("project_phases").select("project_id, status").eq("project_id", pid) : supabase.from("project_phases").select("project_id, status");

      const [
        projectsRes, tasksRes, visitsRes, findingsRes, checklistRes, patientsRes, patientVisitsRes,
        regSubsRes, regReportsRes, paymentsRes, budgetRes, risksRes, ccRes,
        steeringRes, ipRes, trainingsRes, qualRes, notifRes, phasesRes,
      ] = await Promise.all([
        supabase.from("projects").select("id, title, protocol_number, status"),
        tasksQuery, visitsQuery, findingsQuery, checklistQuery, patientsQuery,
        supabase.from("patient_visits").select("id, status"),
        regSubsQ,
        supabase.from("regulatory_reports").select("id, status, due_date, submitted_date, submission_id, submission:regulatory_submissions(project_id)"),
        paymentsQ, budgetQ, risksQ, ccQ, steeringQ, ipQ, trainingsQ, qualQ,
        supabase.from("notifications").select("id, severity, is_read, dismissed, project_id"),
        phasesQ,
      ]);

      let projectsData = projectsRes.data || [];
      let tasks = tasksRes.data || [];
      let visits = visitsRes.data || [];
      let findings = findingsRes.data || [];
      let checklistItems = checklistRes.data || [];
      let patientsData = patientsRes.data || [];

      if (selectedProject !== "all") {
        findings = findings.filter(f => f.visit?.project_id === selectedProject);
        checklistItems = checklistItems.filter(c => c.visit?.project_id === selectedProject);
        projectsData = projectsData.filter(s => s.id === selectedProject);
      }

      const isInDateRange = (dateStr: string) => {
        if (!dateStr) return false;
        return isWithinInterval(parseLocalDate(dateStr), { start: dateRange.from, end: dateRange.to });
      };

      const incompleteTasks = tasks.filter(t => t.status !== "completed");
      const tasksInRange = incompleteTasks.filter(t => t.due_date && isInDateRange(t.due_date));
      const overdueTasks = incompleteTasks.filter(t => t.due_date && isBefore(parseLocalDate(t.due_date), today));
      const tasksNext7Days = incompleteTasks.filter(t => t.due_date && isAfter(parseLocalDate(t.due_date), today) && isBefore(parseLocalDate(t.due_date), in7Days));
      const tasksNext30Days = incompleteTasks.filter(t => t.due_date && isAfter(parseLocalDate(t.due_date), today) && isBefore(parseLocalDate(t.due_date), in30Days));

      const visitsInRange = visits.filter(v => isInDateRange(v.scheduled_date));
      const pendingVisits = visits.filter(v => v.status !== "completed" && v.status !== "cancelled");
      const overdueVisits = pendingVisits.filter(v => isBefore(parseLocalDate(v.scheduled_date), today));
      const visitsNext7Days = pendingVisits.filter(v => isAfter(parseLocalDate(v.scheduled_date), today) && isBefore(parseLocalDate(v.scheduled_date), in7Days));
      const visitsNext30Days = pendingVisits.filter(v => isAfter(parseLocalDate(v.scheduled_date), today) && isBefore(parseLocalDate(v.scheduled_date), in30Days));
      const completedVisits = visitsInRange.filter(v => v.status === "completed").length;

      const openFindings = findings.filter(f => f.status === "open");
      const criticalFindings = openFindings.filter(f => f.severity === "critical");
      
      const findingsAging = [
        { range: "0–7 days", count: openFindings.filter(f => differenceInDays(today, parseLocalDate(f.created_at)) <= 7).length },
        { range: "8–30 days", count: openFindings.filter(f => { const d = differenceInDays(today, parseLocalDate(f.created_at)); return d > 7 && d <= 30; }).length },
        { range: "31–60 days", count: openFindings.filter(f => { const d = differenceInDays(today, parseLocalDate(f.created_at)); return d > 30 && d <= 60; }).length },
        { range: "> 60 days", count: openFindings.filter(f => differenceInDays(today, parseLocalDate(f.created_at)) > 60).length },
      ];

      const siteChecklistMap = new Map<string, { siteCode: string; siteName: string; total: number; completed: number }>();
      for (const item of checklistItems) {
        const siteId = item.visit?.site_id;
        if (!siteId) continue;
        if (!siteChecklistMap.has(siteId)) {
          const visitWithSite = visits.find(v => v.site?.site_code && v.site?.id === siteId);
          siteChecklistMap.set(siteId, { siteCode: visitWithSite?.site?.site_code || "Unknown", siteName: visitWithSite?.site?.name || "Unknown", total: 0, completed: 0 });
        }
        const siteData = siteChecklistMap.get(siteId)!;
        siteData.total++;
        if (item.completed) siteData.completed++;
      }

      const siteChecklistCompletion = Array.from(siteChecklistMap.values())
        .map(s => ({ ...s, completion: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0 }))
        .sort((a, b) => a.completion - b.completion);

      const upcoming: UpcomingItem[] = [];
      [...overdueTasks, ...tasksNext7Days].slice(0, 5).forEach(task => {
        upcoming.push({ id: task.id, title: task.title, type: "task", dueDate: task.due_date, projectCode: "", siteCode: task.site?.site_code, priority: task.priority });
      });
      [...overdueVisits, ...visitsNext7Days].slice(0, 5).forEach(visit => {
        upcoming.push({ id: visit.id, title: `${visit.visit_type} - ${visit.site?.name || "Site"}`, type: "visit", dueDate: visit.scheduled_date, projectCode: visit.project?.protocol_number || visit.project?.title || "", siteCode: visit.site?.site_code, visitType: visit.visit_type });
      });
      upcoming.sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime());

      // ====== Cross-module KPIs ======
      const regSubs = (regSubsRes.data || []) as any[];
      let regReports = (regReportsRes.data || []) as any[];
      if (pid) regReports = regReports.filter(r => r.submission?.project_id === pid);
      let payments = (paymentsRes.data || []) as any[];
      const budget = (budgetRes.data || []) as any[];
      const risks = (risksRes.data || []) as any[];
      const ccs = (ccRes.data || []) as any[];
      const steering = (steeringRes.data || []) as any[];
      const ips = (ipRes.data || []) as any[];
      const trainings = (trainingsRes.data || []) as any[];
      const quals = (qualRes.data || []) as any[];
      let notifs = (notifRes.data || []) as any[];
      if (pid) notifs = notifs.filter(n => n.project_id === pid);
      const phases = (phasesRes.data || []) as any[];

      const regOpenSubmissions = regSubs.filter(s => s.status !== "approved" && s.status !== "completed").length;
      const regUpcoming30d = regSubs.filter(s => s.planned_date && !s.submission_date && isAfter(parseLocalDate(s.planned_date), today) && isBefore(parseLocalDate(s.planned_date), in30Days)).length;
      const regReportsOverdue = regReports.filter(r => r.due_date && !r.submitted_date && isBefore(parseLocalDate(r.due_date), today)).length;

      const budgetTotal = budget.reduce((sum, b) => sum + Number(b.total_value || 0), 0);
      const paidAmount = payments.filter(p => p.status === "paid" || p.paid_at).reduce((s, p) => s + Number(p.amount || 0), 0);
      const pendingPayments = payments.filter(p => p.status !== "paid" && !p.paid_at).length;
      const overduePayments = payments.filter(p => p.status !== "paid" && !p.paid_at && p.payment_date && isBefore(parseLocalDate(p.payment_date), today)).length;

      const highRisks = risks.filter(r => r.status !== "closed" && r.status !== "mitigated" && Number(r.risk_score || 0) >= 15).length;
      const openChangeControls = ccs.filter(c => c.status !== "closed" && c.status !== "implemented").length;
      const pendingSteeringDecisions = steering.filter(d => d.status !== "completed" && d.status !== "closed").length;
      const ipLotsExpiring60d = ips.filter(i => i.expiration_date && isAfter(parseLocalDate(i.expiration_date), today) && isBefore(parseLocalDate(i.expiration_date), addDays(today, 60))).length;

      const qualificationsPending = quals.filter(q => q.qualification_status && q.qualification_status !== "qualified" && q.qualification_status !== "approved").length;
      const trainingsOverdue = trainings.filter(t => t.status !== "completed" && t.due_date && isBefore(parseLocalDate(t.due_date), today)).length;
      const trainingsNext30d = trainings.filter(t => t.status !== "completed" && t.due_date && isAfter(parseLocalDate(t.due_date), today) && isBefore(parseLocalDate(t.due_date), in30Days)).length;

      const unreadCriticalNotifications = notifs.filter(n => !n.dismissed && !n.is_read && n.severity === "critical").length;

      // ====== Per-project health ======
      const allProjects = (projectsRes.data || []) as any[];
      const scopedProjects = pid ? allProjects.filter(p => p.id === pid) : allProjects.filter(p => p.status === "active").slice(0, 8);
      const health: ProjectHealth[] = scopedProjects.map(p => {
        const pTasks = tasks.filter((t: any) => t.project_id === p.id);
        const pVisits = visits.filter((v: any) => v.project_id === p.id);
        const pFindings = findings.filter((f: any) => f.visit?.project_id === p.id);
        const pPayments = payments.filter(pay => pay.project_id === p.id);
        const pSubs = regSubs.filter(s => s.project_id === p.id);
        const pRisks = risks.filter(r => r.project_id === p.id);
        const pPhases = phases.filter(ph => ph.project_id === p.id);
        const od = pTasks.filter((t: any) => t.status !== "completed" && t.due_date && isBefore(parseLocalDate(t.due_date), today)).length;
        const ov = pVisits.filter((v: any) => v.status !== "completed" && v.status !== "cancelled" && isBefore(parseLocalDate(v.scheduled_date), today)).length;
        const cf = pFindings.filter((f: any) => f.status === "open" && f.severity === "critical").length;
        const op = pPayments.filter(pay => pay.status !== "paid" && !pay.paid_at && pay.payment_date && isBefore(parseLocalDate(pay.payment_date), today)).length;
        const os = pSubs.filter(s => s.planned_date && !s.submission_date && isBefore(parseLocalDate(s.planned_date), today)).length;
        const hr = pRisks.filter(r => r.status !== "closed" && r.status !== "mitigated" && Number(r.risk_score || 0) >= 15).length;
        const sc = pPhases.length > 0 ? Math.round((pPhases.filter(ph => ph.status === "completed").length / pPhases.length) * 100) : 0;
        let healthColor: "green" | "yellow" | "red" = "green";
        if (cf > 0 || op > 0 || os > 0) healthColor = "red";
        else if (od > 0 || hr > 0 || ov > 0) healthColor = "yellow";
        return {
          id: p.id, title: p.title, protocol: p.protocol_number, status: p.status,
          overdueTasks: od, overdueVisits: ov, criticalFindings: cf, overduePayments: op,
          overdueSubmissions: os, highRisks: hr, scheduleCompletion: sc, health: healthColor,
        };
      });
      setProjectHealth(health);

      setStats({
        totalProjects: projectsData.length, activeProjects: projectsData.filter(s => s.status === "active").length,
        totalTasks: tasksInRange.length, overdueTasks: overdueTasks.length,
        tasksNext7Days: tasksNext7Days.length, tasksNext30Days: tasksNext30Days.length,
        totalVisits: visitsInRange.length, overdueVisits: overdueVisits.length,
        visitsNext7Days: visitsNext7Days.length, visitsNext30Days: visitsNext30Days.length,
        completedVisits: (patientVisitsRes.data || []).filter(v => v.status === "Completed").length,
        openFindings: openFindings.length, criticalFindings: criticalFindings.length,
        totalPatients: patientsData.length,
        randomizedPatients: patientsData.filter(p => p.status === 'Randomized').length,
        findingsAging, siteChecklistCompletion,
        regOpenSubmissions, regUpcoming30d, regReportsOverdue,
        budgetTotal, paidAmount, pendingPayments, overduePayments,
        highRisks, openChangeControls, pendingSteeringDecisions, ipLotsExpiring60d,
        qualificationsPending, trainingsOverdue, trainingsNext30d,
        unreadCriticalNotifications,
      });
      setUpcomingItems(upcoming.slice(0, 8));
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (dateStr: string) => isBefore(parseLocalDate(dateStr), startOfToday());
  const selectedProjectData = projects.find(s => s.id === selectedProject);

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <CTMSNav />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-1">Dashboard</h2>
            <p className="text-muted-foreground">
              {selectedProject !== "all" 
                ? `Filtering: ${selectedProjectData?.protocol_number || selectedProjectData?.title}` 
                : "Overview of all studies and activities"}
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <div className="flex flex-wrap gap-3 flex-1">
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select study" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Studies</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.protocol_number || project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-1 border rounded-lg p-1">
                  {[
                    { value: "7d", label: "7 days" },
                    { value: "30d", label: "30 days" },
                    { value: "90d", label: "90 days" },
                  ].map((preset) => (
                    <Button
                      key={preset.value}
                      variant={periodPreset === preset.value ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handlePeriodChange(preset.value as PeriodPreset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant={periodPreset === "custom" ? "default" : "ghost"} size="sm" className="gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        {periodPreset === "custom" 
                          ? `${format(dateRange.from, shortDateFormat)} - ${format(dateRange.to, shortDateFormat)}`
                          : "Custom"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => {
                          if (range?.from && range?.to) {
                            setDateRange({ from: range.from, to: range.to });
                            setPeriodPreset("custom");
                            setCalendarOpen(false);
                          }
                        }}
                        numberOfMonths={2}
                        locale={locale}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(dateRange.from, dateFormat, { locale })} - {format(dateRange.to, dateFormat, { locale })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert Cards */}
        {(stats.overdueTasks > 0 || stats.overdueVisits > 0 || stats.criticalFindings > 0) && (
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {stats.overdueTasks > 0 && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-destructive">{stats.overdueTasks}</p>
                    <p className="text-sm text-muted-foreground">Overdue Tasks</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {stats.overdueVisits > 0 && (
              <Card className="border-warning/50 bg-warning/5">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-3 rounded-full bg-warning/10">
                    <CalendarClock className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-warning">{stats.overdueVisits}</p>
                    <p className="text-sm text-muted-foreground">Overdue Visits</p>
                  </div>
                </CardContent>
              </Card>
        )}

        {/* Project Health Score */}
        {projectHealth.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Study Health
              </CardTitle>
              <CardDescription>
                {selectedProject !== "all" ? "Health snapshot for the selected study" : "Top active studies — color reflects open issues"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 max-h-[420px] overflow-y-auto pr-1">
                {projectHealth.map(p => {
                  const color = p.health === "red" ? "border-destructive/60 bg-destructive/5" : p.health === "yellow" ? "border-warning/60 bg-warning/5" : "border-success/60 bg-success/5";
                  const dot = p.health === "red" ? "bg-destructive" : p.health === "yellow" ? "bg-warning" : "bg-success";
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProject(p.id); }}
                      className={cn("h-full flex flex-col text-left rounded-lg border-2 p-3 transition-smooth hover:shadow-elevated", color)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2 min-h-[42px]">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{p.protocol || p.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.title}</p>
                        </div>
                        <span className={cn("h-3 w-3 rounded-full shrink-0 mt-1", dot)} />
                      </div>
                      <div className="space-y-1.5 mt-auto">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Schedule</span>
                          <span className="font-medium">{p.scheduleCompletion}%</span>
                        </div>
                        <Progress value={p.scheduleCompletion} className="h-1.5" />
                        <div className="grid grid-cols-3 gap-1 text-[11px] pt-1">
                          <div className="text-center">
                            <p className={cn("font-bold", p.overdueTasks > 0 ? "text-destructive" : "text-muted-foreground")}>{p.overdueTasks}</p>
                            <p className="text-muted-foreground">Tasks</p>
                          </div>
                          <div className="text-center">
                            <p className={cn("font-bold", p.criticalFindings > 0 ? "text-destructive" : "text-muted-foreground")}>{p.criticalFindings}</p>
                            <p className="text-muted-foreground">Crit.</p>
                          </div>
                          <div className="text-center">
                            <p className={cn("font-bold", p.overduePayments > 0 ? "text-destructive" : "text-muted-foreground")}>{p.overduePayments}</p>
                            <p className="text-muted-foreground">Pay</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Groups by Area */}
        <div className="grid gap-4 lg:grid-cols-4 mb-6">
          {/* Regulatory */}
          <Card className="cursor-pointer transition-smooth hover:shadow-elevated" onClick={() => navigate("/regulatory")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Regulatory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Open submissions</span><span className="font-bold">{stats.regOpenSubmissions}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Due in 30d</span><span className="font-bold text-warning">{stats.regUpcoming30d}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Reports overdue</span><span className={cn("font-bold", stats.regReportsOverdue > 0 ? "text-destructive" : "")}>{stats.regReportsOverdue}</span></div>
            </CardContent>
          </Card>

          {/* Financial */}
          <Card className="cursor-pointer transition-smooth hover:shadow-elevated" onClick={() => navigate("/payments")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" /> Financial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Budget total</span><span className="font-bold">{stats.budgetTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Paid</span><span className="font-bold text-success">{stats.paidAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pending / Overdue</span><span className="font-bold">{stats.pendingPayments} / <span className={stats.overduePayments > 0 ? "text-destructive" : ""}>{stats.overduePayments}</span></span></div>
            </CardContent>
          </Card>

          {/* Risk & Quality */}
          <Card className="cursor-pointer transition-smooth hover:shadow-elevated" onClick={() => navigate("/risks")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" /> Risk & Quality
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">High risks</span><span className={cn("font-bold", stats.highRisks > 0 ? "text-warning" : "")}>{stats.highRisks}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Open change controls</span><span className="font-bold">{stats.openChangeControls}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Steering pending</span><span className="font-bold">{stats.pendingSteeringDecisions}</span></div>
            </CardContent>
          </Card>

          {/* Operations */}
          <Card className="cursor-pointer transition-smooth hover:shadow-elevated" onClick={() => navigate("/trainings")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" /> Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Trainings overdue</span><span className={cn("font-bold", stats.trainingsOverdue > 0 ? "text-destructive" : "")}>{stats.trainingsOverdue}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Trainings in 30d</span><span className="font-bold">{stats.trainingsNext30d}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Qualifications pending</span><span className="font-bold">{stats.qualificationsPending}</span></div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary KPI row */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="cursor-pointer transition-smooth hover:shadow-elevated" onClick={() => navigate("/ip")}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.ipLotsExpiring60d}</p>
                <p className="text-xs text-muted-foreground">IP lots expiring in 60d</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer transition-smooth hover:shadow-elevated" onClick={() => navigate("/communications")}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-lg bg-primary/10"><Bell className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.unreadCriticalNotifications}</p>
                <p className="text-xs text-muted-foreground">Critical unread notifications</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer transition-smooth hover:shadow-elevated" onClick={() => navigate("/steering")}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-lg bg-primary/10"><Gavel className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingSteeringDecisions}</p>
                <p className="text-xs text-muted-foreground">Pending steering decisions</p>
              </div>
            </CardContent>
          </Card>
        </div>

            {stats.criticalFindings > 0 && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-destructive">{stats.criticalFindings}</p>
                    <p className="text-sm text-muted-foreground">Critical Findings</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Patients</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPatients}</div>
              <p className="text-xs text-muted-foreground">{stats.randomizedPatients} Randomized</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Studies</CardTitle>
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">{stats.activeProjects} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visits in Period</CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedVisits}</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-success">Visits Completed</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-warning">{stats.visitsNext7Days} in 7d</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-destructive">{stats.overdueTasks} overdue</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-warning">{stats.tasksNext7Days} in 7d</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Findings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openFindings}</div>
              <p className="text-xs text-muted-foreground">{stats.criticalFindings} critical</p>
            </CardContent>
          </Card>
        </div>

        {/* Site Checklist Completion */}
        {stats.siteChecklistCompletion.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Site Checklist Completion
              </CardTitle>
              <CardDescription>Completion rate per site</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stats.siteChecklistCompletion.slice(0, 6).map((site) => (
                  <div key={site.siteCode} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{site.siteCode}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{site.siteName}</p>
                      </div>
                      <span className={cn(
                        "text-sm font-bold",
                        site.completion >= 80 ? "text-success" : site.completion >= 50 ? "text-warning" : "text-destructive"
                      )}>
                        {site.completion}%
                      </span>
                    </div>
                    <Progress value={site.completion} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{site.completed}/{site.total} items</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
