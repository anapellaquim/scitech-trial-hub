import { parseLocalDate, formatDateOnly, todayDateOnly } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CTMSNav from "@/components/CTMSNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar as CalendarIcon, List, MapPin, Clock, FileText, CheckSquare, CheckCircle2, AlertTriangle } from "lucide-react";
import KpiCards from "@/components/shared/KpiCards";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import NewVisitDialog from "@/components/visits/NewVisitDialog";

interface Visit {
  id: string;
  visit_type: "SQV" | "SIV" | "IMV" | "COV";
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

export default function VisitAgenda() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newVisitOpen, setNewVisitOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [showTasks, setShowTasks] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

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

  const filteredVisits = selectedProject === "all" 
    ? visits 
    : visits.filter(v => v.project?.id === selectedProject);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
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
              <SelectTrigger className="w-[200px]">
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
          </div>
        </div>

        {(() => {
          const today = new Date(); today.setHours(0,0,0,0);
          const total = filteredVisits.length;
          const scheduled = filteredVisits.filter(v => v.status === "scheduled").length;
          const completed = filteredVisits.filter(v => v.status === "completed").length;
          const upcoming = filteredVisits.filter(v => v.status === "scheduled" && v.scheduled_date && new Date(v.scheduled_date) >= today).length;
          const overdue = filteredVisits.filter(v => v.status === "scheduled" && v.scheduled_date && new Date(v.scheduled_date) < today).length;
          const openTasks = (selectedProject === "all" ? tasks : tasks.filter(t => t.project?.title && filteredVisits.some(v => v.project?.title === t.project?.title))).filter(t => t.status !== "completed").length;
          return (
            <div className="mb-6">
              <KpiCards cols={6} items={[
                { label: "Total Visits", value: total, icon: CalendarIcon, accent: "primary" },
                { label: "Scheduled", value: scheduled, icon: Clock, accent: "primary" },
                { label: "Upcoming", value: upcoming, icon: CalendarIcon, accent: "primary" },
                { label: "Overdue", value: overdue, icon: AlertTriangle, accent: "danger" },
                { label: "Completed", value: completed, icon: CheckCircle2, accent: "success" },
                { label: "Open Tasks", value: openTasks, icon: CheckSquare, accent: "warning" },
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
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                    Hoje
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    Próximo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                  
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-2 min-h-[100px] bg-muted/20" />
                  ))}
                  
                  {daysInMonth.map((day) => {
                    const dayVisits = getVisitsForDay(day);
                    const dayTasks = showTasks ? getTasksForDay(day) : [];
                    const totalItems = dayVisits.length + dayTasks.length;
                    
                    return (
                      <div
                        key={day.toISOString()}
                        className={`p-2 min-h-[100px] border rounded-lg ${
                          isToday(day) ? "bg-primary/5 border-primary" : "border-border"
                        }`}
                      >
                        <span className={`text-sm font-medium ${isToday(day) ? "text-primary" : ""}`}>
                          {format(day, "d")}
                        </span>
                        <div className="mt-1 space-y-1">
                          {dayVisits.slice(0, showTasks ? 2 : 3).map((visit) => (
                            <div
                              key={visit.id}
                              onClick={() => {
                                if (visit.source === 'site_monitoring') {
                                  navigate(`/site-monitoring?visitId=${visit.id}`);
                                } else {
                                  navigate(`/visits/${visit.id}`);
                                }
                              }}
                              className={`text-xs p-1 rounded cursor-pointer truncate ${visitTypeColors[visit.visit_type] || "bg-muted"}`}
                            >
                              {visit.visit_type} - {visit.research_center?.code || "N/A"}
                            </div>
                          ))}
                          {dayTasks.slice(0, 2).map((task) => (
                            <div
                              key={task.id}
                              onClick={() => navigate(`/tasks`)}
                              className={`text-xs p-1 rounded cursor-pointer truncate ${taskStatusColors[task.status] || "bg-muted"}`}
                            >
                              <CheckSquare className="h-3 w-3 inline mr-1" />
                              {task.title}
                            </div>
                          ))}
                          {totalItems > 4 && (
                            <div className="text-xs text-muted-foreground">
                              +{totalItems - 4} mais
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                    onClick={() => {
                      if (visit.source === 'site_monitoring') {
                        navigate(`/site-monitoring?visitId=${visit.id}`);
                      } else {
                        navigate(`/visits/${visit.id}`);
                      }
                    }}
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
                    onClick={() => navigate(visit.source === 'site_monitoring' ? '/site-monitoring' : `/visits/${visit.id}`)}
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
    </div>
  );
}
