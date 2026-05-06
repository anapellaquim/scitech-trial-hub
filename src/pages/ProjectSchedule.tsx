import { parseLocalDate, formatDateOnly, todayDateOnly } from "@/lib/dateUtils";
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CTMSNav from "@/components/CTMSNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Plus, GanttChart as GanttIcon, Table2, Calendar, Download, FileSpreadsheet, FileText, LayoutTemplate, Settings, Layers } from "lucide-react";
import { toast } from "sonner";
import { GanttChart } from "@/components/schedule/GanttChart";
import { TaskListView } from "@/components/schedule/TaskListView";
import { ScheduleTaskDialog } from "@/components/schedule/ScheduleTaskDialog";
import ApplyProjectTemplateDialog from "@/components/ApplyProjectTemplateDialog";
import ManageProjectTemplatesDialog from "@/components/ManageProjectTemplatesDialog";
import { ManagePhasesDialog } from "@/components/schedule/ManagePhasesDialog";
import { ScheduleTask, TaskDependency, Profile, Project, Stakeholder, StudySite } from "@/types/schedule";
import { useScheduleExport } from "@/hooks/useScheduleExport";
import { usePhases } from "@/hooks/usePhases";
const ProjectSchedule = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [sites, setSites] = useState<StudySite[]>([]);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isManageTemplatesOpen, setIsManageTemplatesOpen] = useState(false);
  const [isManagePhasesOpen, setIsManagePhasesOpen] = useState(false);
  const { phases, refresh: refreshPhases } = usePhases(projectId);

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch tasks for this project, sorted by display_order
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("planned_start_date", { ascending: true });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch dependencies for these tasks
      if (tasksData && tasksData.length > 0) {
        const taskIds = tasksData.map(t => t.id);
        const { data: depsData, error: depsError } = await supabase
          .from("task_dependencies")
          .select("*")
          .in("task_id", taskIds);

        if (depsError) throw depsError;
        setDependencies(depsData || []);

      }

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Fetch project stakeholders (used as task assignees)
      const { data: stakeholdersData, error: stakeholdersError } = await supabase
        .from("communication_stakeholders")
        .select("id, name, organization, stakeholder_type, project_id")
        .eq("project_id", projectId)
        .order("name");

      if (stakeholdersError) throw stakeholdersError;
      setStakeholders(stakeholdersData || []);

      // Fetch study sites for this project (used as task assignees)
      const { data: sitesData, error: sitesError } = await supabase
        .from("study_sites")
        .select("id, name, site_code, project_id")
        .eq("project_id", projectId)
        .order("name");

      if (sitesError) throw sitesError;
      setSites(sitesData || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: ScheduleTask) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsTaskDialogOpen(true);
  };

  const handleTaskSaved = () => {
    setIsTaskDialogOpen(false);
    setSelectedTask(null);
    fetchData();
  };

  const handleOrderChange = async (taskIds: string[]) => {
    try {
      // Update display_order for each task
      const updates = taskIds.map((id, index) => 
        supabase
          .from("tasks")
          .update({ display_order: index })
          .eq("id", id)
      );
      
      await Promise.all(updates);
      
      // Optimistically update local state
      setTasks(prev => {
        const taskMap = new Map(prev.map(t => [t.id, t]));
        return taskIds
          .filter(id => taskMap.has(id))
          .map((id, index) => ({
            ...taskMap.get(id)!,
            display_order: index
          }));
      });
      
      toast.success("Ordem das tarefas atualizada");
    } catch (error: any) {
      toast.error("Erro ao salvar ordem: " + error.message);
      fetchData(); // Revert on error
    }
  };

  const { exportToExcel, exportToPDF } = useScheduleExport();

  const handleExport = (type: 'excel' | 'pdf') => {
    if (!project) return;
    const exportData = { project, tasks, dependencies, raciAssignments: [], profiles };
    if (type === 'excel') {
      exportToExcel(exportData);
      toast.success('Cronograma exportado para Excel');
    } else {
      exportToPDF(exportData);
      toast.success('Cronograma exportado para PDF');
    }
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const inProgress = tasks.filter(t => t.status === "in_progress").length;
    const overdue = tasks.filter(t => {
      const endDate = t.planned_end_date || t.end_date;
      return endDate && parseLocalDate(endDate) < new Date() && t.status !== "completed";
    }).length;
    const avgProgress = total > 0 
      ? Math.round(tasks.reduce((acc, t) => acc + (t.progress_percentage || 0), 0) / total)
      : 0;
    
    return { total, completed, inProgress, overdue, avgProgress };
  }, [tasks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CTMSNav />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-[500px]" />
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <CTMSNav />
        <main className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Projeto não encontrado</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <p className="text-muted-foreground">Cronograma do Projeto</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setIsTemplateDialogOpen(true)}>
            <LayoutTemplate className="h-4 w-4 mr-2" />
            Aplicar Modelo
          </Button>
          <Button variant="outline" onClick={() => setIsManageTemplatesOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurar Modelos
          </Button>
          <Button variant="outline" onClick={() => setIsManagePhasesOpen(true)}>
            <Layers className="h-4 w-4 mr-2" />
            Fases
          </Button>
          <Button onClick={handleNewTask}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total de Tarefas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Concluídas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              <div className="text-sm text-muted-foreground">Em Progresso</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-sm text-muted-foreground">Atrasadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.avgProgress}%</div>
              <div className="text-sm text-muted-foreground">Progresso Médio</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="gantt" className="space-y-4">
          <TabsList>
            <TabsTrigger value="gantt" className="gap-2">
              <GanttIcon className="h-4 w-4" />
              Gantt
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <Table2 className="h-4 w-4" />
              Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gantt">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Visualização Gantt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GanttChart 
                  tasks={tasks} 
                  dependencies={dependencies}
                  profiles={profiles}
                  stakeholders={stakeholders}
                  sites={sites}
                  phases={phases}
                  onTaskClick={handleTaskClick}
                  onOrderChange={handleOrderChange}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Table2 className="h-5 w-5" />
                  Lista de Tarefas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TaskListView 
                  tasks={tasks}
                  dependencies={dependencies}
                  profiles={profiles}
                  stakeholders={stakeholders}
                  sites={sites}
                  phases={phases}
                  onTaskClick={handleTaskClick}
                  onRefresh={fetchData}
                />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Task Dialog */}
        <ScheduleTaskDialog
          open={isTaskDialogOpen}
          onOpenChange={setIsTaskDialogOpen}
          task={selectedTask}
          projectId={projectId!}
          tasks={tasks}
          profiles={profiles}
          dependencies={dependencies.filter(d => selectedTask ? d.task_id === selectedTask.id : false)}
          onSave={handleTaskSaved}
        />

        {/* Template Dialog */}
        <ApplyProjectTemplateDialog
          open={isTemplateDialogOpen}
          onOpenChange={setIsTemplateDialogOpen}
          projectId={projectId!}
          onTemplateApplied={fetchData}
        />

        {/* Manage Templates Dialog */}
        <ManageProjectTemplatesDialog
          open={isManageTemplatesOpen}
          onOpenChange={setIsManageTemplatesOpen}
        />

        <ManagePhasesDialog
          open={isManagePhasesOpen}
          onOpenChange={setIsManagePhasesOpen}
          projectId={projectId!}
          onChanged={fetchData}
        />
      </main>
    </div>
  );
};

export default ProjectSchedule;
