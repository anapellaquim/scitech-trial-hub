import { parseLocalDate, formatDateOnly, todayDateOnly } , formatInBrasilia } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CTMSNav from "@/components/CTMSNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckSquare, Calendar, User, Clock, LayoutGrid, List, FolderOpen, Layers, ArrowUpDown, ArrowUp, ArrowDown, ListChecks, CheckCircle2, AlertTriangle, Flag } from "lucide-react";
import KpiCards from "@/components/shared/KpiCards";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import NewTaskDialog from "@/components/tasks/NewTaskDialog";
import EditTaskDialog from "@/components/tasks/EditTaskDialog";
import TaskKanban from "@/components/tasks/TaskKanban";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  project_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  priority: string | null;
  created_at: string;
  assignee?: { full_name: string } | null;
  project?: { title: string } | null;
  subtask_count?: number;
  subtask_completed?: number;
}

interface Profile {
  id: string;
  full_name: string;
}

interface Project {
  id: string;
  title: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/20 text-primary",
  completed: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning",
  high: "bg-destructive/20 text-destructive",
};

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "grouped">("list");
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  
  // Sorting
  type SortColumn = "title" | "status" | "priority" | "project" | "assignee" | "end_date" | "subtasks";
  const [sortColumn, setSortColumn] = useState<SortColumn>("end_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3.5 w-3.5" /> 
      : <ArrowDown className="h-3.5 w-3.5" />;
  };

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    fetchProfiles();
    fetchProjects();
    fetchTasks();
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");
    if (data) setProfiles(data);
  };

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, title")
      .order("title");
    if (data) setProjects(data);
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: isAdminData } = await supabase.rpc('has_role', {
        _user_id: authUser.id,
        _role: 'admin' as any,
      });

      let query = supabase
        .from("tasks")
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey(full_name),
          project:projects(title)
        `)
        .neq("status", "completed");

      if (!isAdminData) {
        query = query.or(`project_id.not.is.null,assigned_to.eq.${authUser.id}`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch subtask counts for each task
      const tasksWithCounts = await Promise.all(
        (data || []).map(async (task) => {
          const { data: subtasks } = await supabase
            .from("task_subtasks")
            .select("completed")
            .eq("task_id", task.id);
          
          const subtaskCount = subtasks?.length || 0;
          const subtaskCompleted = subtasks?.filter(s => s.completed).length || 0;
          
          return {
            ...task,
            subtask_count: subtaskCount,
            subtask_completed: subtaskCompleted,
          };
        })
      );

      setTasks(tasksWithCounts);
    } catch (error: any) {
      toast.error("Erro ao carregar tarefas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Status atualizado");
      fetchTasks();
    } catch (error: any) {
      toast.error("Erro ao atualizar status: " + error.message);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return parseLocalDate(date).toLocaleDateString("pt-BR");
  };

  const isOverdue = (endDate: string | null, status: string) => {
    if (!endDate || status === "completed" || status === "cancelled") return false;
    return parseLocalDate(endDate) < new Date();
  };

  // Apply filters
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
    if (assigneeFilter !== "all" && task.assigned_to !== assigneeFilter) return false;
    if (projectFilter !== "all") {
      if (projectFilter === "none" && task.project_id !== null) return false;
      if (projectFilter !== "none" && task.project_id !== projectFilter) return false;
    }
    return true;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, assigneeFilter, projectFilter, sortColumn, sortDirection, itemsPerPage]);

  // Group tasks by project
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const projectKey = task.project_id || "no_project";
    const projectLabel = task.project?.title || "Sem Projeto Vinculado";
    if (!acc[projectKey]) {
      acc[projectKey] = { label: projectLabel, tasks: [] };
    }
    acc[projectKey].tasks.push(task);
    return acc;
  }, {} as Record<string, { label: string; tasks: Task[] }>);

  // Sort groups: projects first (alphabetically), then "no_project" at the end
  const sortedGroups = Object.entries(groupedTasks).sort(([keyA], [keyB]) => {
    if (keyA === "no_project") return 1;
    if (keyB === "no_project") return -1;
    return groupedTasks[keyA].label.localeCompare(groupedTasks[keyB].label);
  });

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tarefas</h1>
            <p className="text-muted-foreground mt-1">Gerencie suas tarefas e delegações</p>
          </div>
          <Button onClick={() => setNewDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>

        {/* KPIs */}
        {(() => {
          const scope = projectFilter === "all" ? tasks : tasks.filter(t => t.project_id === projectFilter);
          const today = new Date(); today.setHours(0,0,0,0);
          const total = scope.length;
          const completed = scope.filter(t => t.status === "completed").length;
          const inProgress = scope.filter(t => t.status === "in_progress").length;
          const pending = scope.filter(t => t.status === "pending").length;
          const overdue = scope.filter(t => t.end_date && t.status !== "completed" && t.status !== "cancelled" && new Date(t.end_date) < today).length;
          const highPrio = scope.filter(t => t.priority === "high" && t.status !== "completed" && t.status !== "cancelled").length;
          const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
          return (
            <div className="mb-6">
              <KpiCards cols={6} items={[
                { label: "Total Tasks", value: total, icon: ListChecks, accent: "primary" },
                { label: "In Progress", value: inProgress, icon: Clock, accent: "primary" },
                { label: "Pending", value: pending, icon: Clock, accent: "muted" },
                { label: "Completed", value: completed, icon: CheckCircle2, accent: "success", hint: `${completionRate}% completion` },
                { label: "Overdue", value: overdue, icon: AlertTriangle, accent: "danger" },
                { label: "High Priority Open", value: highPrio, icon: Flag, accent: "warning" },
              ]} />
            </div>
          );
        })()}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Visualização:</span>
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-r-none"
                    title="Lista"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "kanban" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("kanban")}
                    className="rounded-none border-x"
                    title="Kanban"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grouped" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grouped")}
                    className="rounded-l-none"
                    title="Agrupado por Estudo"
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1" />

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Prioridades</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Responsáveis</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Projetos</SelectItem>
                  <SelectItem value="none">Sem Projeto</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted/50" />
                <CardContent className="h-32 bg-muted/30" />
              </Card>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {tasks.length === 0 ? "Comece criando sua primeira tarefa" : "Tente ajustar os filtros"}
            </p>
            {tasks.length === 0 && (
              <Button onClick={() => setNewDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Tarefa
              </Button>
            )}
          </Card>
        ) : viewMode === "kanban" ? (
          <TaskKanban
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            onStatusChange={handleStatusChange}
          />
        ) : viewMode === "grouped" ? (
          <div className="space-y-6">
            {sortedGroups.map(([projectKey, group]) => (
              <div key={projectKey}>
                <div className="flex items-center gap-2 mb-4">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{group.label}</h2>
                  <Badge variant="secondary" className="ml-2">
                    {group.tasks.length} {group.tasks.length === 1 ? "tarefa" : "tarefas"}
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {group.tasks.map((task) => (
                    <Card
                      key={task.id}
                      className={`cursor-pointer shadow-card hover:shadow-elevated transition-smooth border-border ${
                        isOverdue(task.end_date, task.status) ? "border-destructive/50" : ""
                      }`}
                      onClick={() => handleTaskClick(task)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
                          <Badge className={statusColors[task.status] || "bg-muted"}>
                            {statusLabels[task.status] || task.status}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(task.start_date)} - {formatDate(task.end_date)}
                          </span>
                          {isOverdue(task.end_date, task.status) && (
                            <Badge variant="destructive" className="text-xs">Atrasada</Badge>
                          )}
                        </div>

                        {task.assignee && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{task.assignee.full_name}</span>
                          </div>
                        )}

                        {task.priority && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Badge className={priorityColors[task.priority] || "bg-muted"}>
                              {priorityLabels[task.priority] || task.priority}
                            </Badge>
                          </div>
                        )}

                        {task.subtask_count !== undefined && task.subtask_count > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CheckSquare className="h-3 w-3" />
                                Subtarefas
                              </span>
                              <span>{task.subtask_completed}/{task.subtask_count}</span>
                            </div>
                            <Progress 
                              value={task.subtask_count > 0 ? (task.subtask_completed! / task.subtask_count) * 100 : 0} 
                              className="h-1.5"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="w-[300px] cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("title")}
                  >
                    <div className="flex items-center gap-1.5">
                      Título
                      <SortIcon column="title" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1.5">
                      Status
                      <SortIcon column="status" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("priority")}
                  >
                    <div className="flex items-center gap-1.5">
                      Prioridade
                      <SortIcon column="priority" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("project")}
                  >
                    <div className="flex items-center gap-1.5">
                      Projeto
                      <SortIcon column="project" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("assignee")}
                  >
                    <div className="flex items-center gap-1.5">
                      Responsável
                      <SortIcon column="assignee" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("end_date")}
                  >
                    <div className="flex items-center gap-1.5">
                      Prazo
                      <SortIcon column="end_date" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("subtasks")}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Subtarefas
                      <SortIcon column="subtasks" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const sortedTasks = [...filteredTasks].sort((a, b) => {
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    const statusOrder = { pending: 0, in_progress: 1, completed: 2, cancelled: 3 };
                    let comparison = 0;
                    
                    switch (sortColumn) {
                      case "title":
                        comparison = a.title.localeCompare(b.title);
                        break;
                      case "status":
                        comparison = (statusOrder[a.status as keyof typeof statusOrder] ?? 99) - (statusOrder[b.status as keyof typeof statusOrder] ?? 99);
                        break;
                      case "priority":
                        comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 99) - (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 99);
                        break;
                      case "project":
                        const projectA = a.project?.title || "";
                        const projectB = b.project?.title || "";
                        comparison = projectA.localeCompare(projectB);
                        break;
                      case "assignee":
                        const assigneeA = a.assignee?.full_name || "";
                        const assigneeB = b.assignee?.full_name || "";
                        comparison = assigneeA.localeCompare(assigneeB);
                        break;
                      case "end_date":
                        if (!a.end_date && !b.end_date) comparison = 0;
                        else if (!a.end_date) comparison = 1;
                        else if (!b.end_date) comparison = -1;
                        else comparison = parseLocalDate(a.end_date).getTime() - parseLocalDate(b.end_date).getTime();
                        break;
                      case "subtasks":
                        const subtasksA = a.subtask_count || 0;
                        const subtasksB = b.subtask_count || 0;
                        comparison = subtasksA - subtasksB;
                        break;
                    }
                    
                    return sortDirection === "asc" ? comparison : -comparison;
                  });
                  
                  const paginatedTasks = sortedTasks.slice(
                    (currentPage - 1) * itemsPerPage,
                    currentPage * itemsPerPage
                  );
                  
                  return paginatedTasks.map((task) => {
                    const overdue = isOverdue(task.end_date, task.status);
                    const dueSoon = !overdue && task.end_date && task.status !== "completed" && task.status !== "cancelled" && (() => {
                      const diffDays = (parseLocalDate(task.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
                      return diffDays >= 0 && diffDays <= 3;
                    })();
                    
                    return (
                      <TableRow 
                        key={task.id} 
                        className={`cursor-pointer hover:bg-muted/50 ${
                          overdue ? "bg-destructive/5" : dueSoon ? "bg-warning/5" : ""
                        }`}
                        onClick={() => handleTaskClick(task)}
                      >
                        <TableCell className="font-medium">
                          <div className="line-clamp-1">{task.title}</div>
                          {task.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {task.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[task.status] || "bg-muted"}>
                            {statusLabels[task.status] || task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.priority && (
                            <Badge className={priorityColors[task.priority] || "bg-muted"}>
                              {priorityLabels[task.priority] || task.priority}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.project ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate max-w-[150px]">{task.project.title}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.assignee ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate max-w-[120px]">{task.assignee.full_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className={overdue ? "text-destructive" : dueSoon ? "text-warning" : ""}>
                              {formatDate(task.end_date)}
                            </span>
                            {overdue && (
                              <Badge variant="destructive" className="text-xs">Atrasada</Badge>
                            )}
                            {dueSoon && (
                              <Badge className="text-xs bg-warning/20 text-warning border-warning/30">Próximo</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {task.subtask_count !== undefined && task.subtask_count > 0 ? (
                            <div className="flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
                              <CheckSquare className="h-3.5 w-3.5" />
                              <span>{task.subtask_completed}/{task.subtask_count}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {filteredTasks.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredTasks.length)} de {filteredTasks.length} tarefas
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Itens por página:</span>
                  <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {filteredTasks.length > itemsPerPage && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.ceil(filteredTasks.length / itemsPerPage) }, (_, i) => i + 1)
                      .filter(page => {
                        const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
                        if (totalPages <= 5) return true;
                        if (page === 1 || page === totalPages) return true;
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                      })
                      .map((page, idx, arr) => (
                        <>
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <PaginationItem key={`ellipsis-${page}`}>
                              <span className="px-2">...</span>
                            </PaginationItem>
                          )}
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </>
                      ))}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTasks.length / itemsPerPage), p + 1))}
                        className={currentPage === Math.ceil(filteredTasks.length / itemsPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </Card>
        )}
      </main>

      <NewTaskDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        onSuccess={() => {
          setNewDialogOpen(false);
          fetchTasks();
        }}
        userId={user?.id}
      />

      <EditTaskDialog
        task={selectedTask}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          setEditDialogOpen(false);
          setSelectedTask(null);
          fetchTasks();
        }}
      />
    </div>
  );
}