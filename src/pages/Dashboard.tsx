import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
} from "lucide-react";
import { format, addDays, differenceInDays, isAfter, isBefore, startOfToday, subDays, isWithinInterval } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";

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
  findingsAging: { range: string; count: number }[];
  siteChecklistCompletion: { siteCode: string; siteName: string; completion: number; total: number; completed: number }[];
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common");
  
  const locale = i18n.language === 'pt-BR' ? ptBR : enUS;
  const dateFormat = i18n.language === 'pt-BR' ? "dd/MM/yyyy" : "MM/dd/yyyy";
  const shortDateFormat = i18n.language === 'pt-BR' ? "dd/MM" : "MM/dd";

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
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    overdueTasks: 0,
    tasksNext7Days: 0,
    tasksNext30Days: 0,
    totalVisits: 0,
    overdueVisits: 0,
    visitsNext7Days: 0,
    visitsNext30Days: 0,
    completedVisits: 0,
    openFindings: 0,
    criticalFindings: 0,
    findingsAging: [],
    siteChecklistCompletion: [],
  });
  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (projects.length > 0 || !loading) {
      loadDashboardData();
    }
  }, [selectedProject, dateRange]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await fetchProjects();
    await loadDashboardData();
  };

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, title, protocol_number, status")
      .order("title");
    setProjects(data || []);
  };

  const handlePeriodChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const today = startOfToday();
    
    switch (preset) {
      case "7d":
        setDateRange({ from: subDays(today, 7), to: addDays(today, 7) });
        break;
      case "30d":
        setDateRange({ from: subDays(today, 30), to: addDays(today, 30) });
        break;
      case "90d":
        setDateRange({ from: subDays(today, 90), to: addDays(today, 90) });
        break;
      case "custom":
        setCalendarOpen(true);
        break;
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

      if (selectedProject !== "all") {
        tasksQuery = tasksQuery.eq("project_id", selectedProject);
        visitsQuery = visitsQuery.eq("project_id", selectedProject);
      }

      const [projectsRes, tasksRes, visitsRes, findingsRes, checklistRes] = await Promise.all([
        supabase.from("projects").select("id, status"),
        tasksQuery,
        visitsQuery,
        findingsQuery,
        checklistQuery,
      ]);

      let projectsData = projectsRes.data || [];
      let tasks = tasksRes.data || [];
      let visits = visitsRes.data || [];
      let findings = findingsRes.data || [];
      let checklistItems = checklistRes.data || [];

      if (selectedProject !== "all") {
        findings = findings.filter(f => f.visit?.project_id === selectedProject);
        checklistItems = checklistItems.filter(c => c.visit?.project_id === selectedProject);
        projectsData = projectsData.filter(s => s.id === selectedProject);
      }

      const isInDateRange = (dateStr: string) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
      };

      const incompleteTasks = tasks.filter(t => t.status !== "completed");
      const tasksInRange = incompleteTasks.filter(t => t.due_date && isInDateRange(t.due_date));
      const overdueTasks = incompleteTasks.filter(t => t.due_date && isBefore(new Date(t.due_date), today));
      const tasksNext7Days = incompleteTasks.filter(t => 
        t.due_date && isAfter(new Date(t.due_date), today) && isBefore(new Date(t.due_date), in7Days)
      );
      const tasksNext30Days = incompleteTasks.filter(t => 
        t.due_date && isAfter(new Date(t.due_date), today) && isBefore(new Date(t.due_date), in30Days)
      );

      const visitsInRange = visits.filter(v => isInDateRange(v.scheduled_date));
      const pendingVisits = visits.filter(v => v.status !== "completed" && v.status !== "cancelled");
      const overdueVisits = pendingVisits.filter(v => isBefore(new Date(v.scheduled_date), today));
      const visitsNext7Days = pendingVisits.filter(v => 
        isAfter(new Date(v.scheduled_date), today) && isBefore(new Date(v.scheduled_date), in7Days)
      );
      const visitsNext30Days = pendingVisits.filter(v => 
        isAfter(new Date(v.scheduled_date), today) && isBefore(new Date(v.scheduled_date), in30Days)
      );
      const completedVisits = visitsInRange.filter(v => v.status === "completed").length;

      const openFindings = findings.filter(f => f.status === "open");
      const criticalFindings = openFindings.filter(f => f.severity === "critical");
      
      const findingsAging = [
        { range: t("findingsAging.ranges.0to7"), count: openFindings.filter(f => differenceInDays(today, new Date(f.created_at)) <= 7).length },
        { range: t("findingsAging.ranges.8to30"), count: openFindings.filter(f => { const days = differenceInDays(today, new Date(f.created_at)); return days > 7 && days <= 30; }).length },
        { range: t("findingsAging.ranges.31to60"), count: openFindings.filter(f => { const days = differenceInDays(today, new Date(f.created_at)); return days > 30 && days <= 60; }).length },
        { range: t("findingsAging.ranges.over60"), count: openFindings.filter(f => differenceInDays(today, new Date(f.created_at)) > 60).length },
      ];

      const siteChecklistMap = new Map<string, { siteCode: string; siteName: string; total: number; completed: number }>();
      
      for (const item of checklistItems) {
        const siteId = item.visit?.site_id;
        if (!siteId) continue;
        
        if (!siteChecklistMap.has(siteId)) {
          const visitWithSite = visits.find(v => v.site?.site_code && v.site?.id === siteId);
          siteChecklistMap.set(siteId, {
            siteCode: visitWithSite?.site?.site_code || "Unknown",
            siteName: visitWithSite?.site?.name || "Unknown",
            total: 0,
            completed: 0,
          });
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
        upcoming.push({
          id: task.id,
          title: task.title,
          type: "task",
          dueDate: task.due_date,
          projectCode: "",
          siteCode: task.site?.site_code,
          priority: task.priority,
        });
      });

      [...overdueVisits, ...visitsNext7Days].slice(0, 5).forEach(visit => {
        upcoming.push({
          id: visit.id,
          title: `${visit.visit_type} - ${visit.site?.name || "Site"}`,
          type: "visit",
          dueDate: visit.scheduled_date,
          projectCode: visit.project?.protocol_number || visit.project?.title || "",
          siteCode: visit.site?.site_code,
          visitType: visit.visit_type,
        });
      });

      upcoming.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      setStats({
        totalProjects: projectsData.length,
        activeProjects: projectsData.filter(s => s.status === "active").length,
        totalTasks: tasksInRange.length,
        overdueTasks: overdueTasks.length,
        tasksNext7Days: tasksNext7Days.length,
        tasksNext30Days: tasksNext30Days.length,
        totalVisits: visitsInRange.length,
        overdueVisits: overdueVisits.length,
        visitsNext7Days: visitsNext7Days.length,
        visitsNext30Days: visitsNext30Days.length,
        completedVisits,
        openFindings: openFindings.length,
        criticalFindings: criticalFindings.length,
        findingsAging,
        siteChecklistCompletion,
      });

      setUpcomingItems(upcoming.slice(0, 8));
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (dateStr: string) => isBefore(new Date(dateStr), startOfToday());

  const selectedProjectData = projects.find(s => s.id === selectedProject);

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-background">
      <CTMSNav />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-pulse text-muted-foreground">{tCommon("messages.loading")}</div>
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
            <h2 className="text-3xl font-bold text-foreground mb-1">{t("title")}</h2>
            <p className="text-muted-foreground">
              {selectedProject !== "all" 
                ? `${t("filtering")}: ${selectedProjectData?.protocol_number || selectedProjectData?.title}` 
                : t("subtitle")}
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t("filters.label")}:</span>
              </div>
              
              <div className="flex flex-wrap gap-3 flex-1">
                {/* Project Filter */}
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder={t("filters.selectStudy")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allStudies")}</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.protocol_number || project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Period Presets */}
                <div className="flex gap-1 border rounded-lg p-1">
                  {[
                    { value: "7d", label: t("filters.periods.7days") },
                    { value: "30d", label: t("filters.periods.30days") },
                    { value: "90d", label: t("filters.periods.90days") },
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
                  
                  {/* Custom Date Range */}
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={periodPreset === "custom" ? "default" : "ghost"}
                        size="sm"
                        className="gap-1"
                      >
                        <CalendarIcon className="h-4 w-4" />
                        {periodPreset === "custom" 
                          ? `${format(dateRange.from, shortDateFormat)} - ${format(dateRange.to, shortDateFormat)}`
                          : t("filters.periods.custom")
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

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                    <X className="h-4 w-4" />
                    {tCommon("buttons.clear")}
                  </Button>
                )}
              </div>

              {/* Period Label */}
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
                    <p className="text-sm text-muted-foreground">{t("alerts.overdueTasks")}</p>
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
                    <p className="text-sm text-muted-foreground">{t("alerts.overdueVisits")}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {stats.criticalFindings > 0 && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-destructive">{stats.criticalFindings}</p>
                    <p className="text-sm text-muted-foreground">{t("alerts.criticalFindings")}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.studies")}</CardTitle>
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeProjects} {t("stats.active")}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.visitsInPeriod")}</CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVisits}</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-success">{stats.completedVisits} {t("stats.completed")}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-warning">{stats.visitsNext7Days} {t("stats.in7d")}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.pendingTasks")}</CardTitle>
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-destructive">{stats.overdueTasks} {t("stats.overdue")}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-warning">{stats.tasksNext7Days} {t("stats.in7d")}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.openFindings")}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openFindings}</div>
              <p className="text-xs text-muted-foreground">
                {stats.criticalFindings} {t("stats.critical")}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Upcoming Items */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                {t("upcoming.title")}
              </CardTitle>
              <CardDescription>
                {t("upcoming.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t("upcoming.noItems")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingItems.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        isOverdue(item.dueDate) && "border-destructive/50 bg-destructive/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          item.type === "visit" ? "bg-primary/10" : "bg-secondary/50"
                        )}>
                          {item.type === "visit" ? (
                            <CalendarClock className="h-4 w-4 text-primary" />
                          ) : (
                            <ListChecks className="h-4 w-4 text-secondary-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {item.projectCode && <span>{item.projectCode}</span>}
                            {item.siteCode && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {item.siteCode}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-medium",
                          isOverdue(item.dueDate) ? "text-destructive" : "text-foreground"
                        )}>
                          {format(new Date(item.dueDate), shortDateFormat, { locale })}
                        </p>
                        {item.priority && (
                          <Badge variant={item.priority === "high" ? "destructive" : "secondary"} className="text-xs">
                            {item.priority === "high" ? tCommon("priority.high") : item.priority === "medium" ? tCommon("priority.medium") : tCommon("priority.low")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Findings Aging */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t("findingsAging.title")}
              </CardTitle>
              <CardDescription>
                {t("findingsAging.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.findingsAging.map((aging) => (
                  <div key={aging.range} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{aging.range}</span>
                      <span className="font-medium">{aging.count}</span>
                    </div>
                    <Progress 
                      value={stats.openFindings > 0 ? (aging.count / stats.openFindings) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Site Checklist Completion */}
        {stats.siteChecklistCompletion.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {t("checklist.title")}
              </CardTitle>
              <CardDescription>
                {t("checklist.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stats.siteChecklistCompletion.slice(0, 6).map((site) => (
                  <div key={site.siteCode} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{site.siteCode}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {site.siteName}
                        </p>
                      </div>
                      <span className={cn(
                        "text-sm font-bold",
                        site.completion >= 80 ? "text-success" :
                        site.completion >= 50 ? "text-warning" : "text-destructive"
                      )}>
                        {site.completion}%
                      </span>
                    </div>
                    <Progress value={site.completion} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">
                      {site.completed}/{site.total} {t("checklist.items")}
                    </p>
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
