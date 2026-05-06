import { parseLocalDate, formatDateOnly, todayDateOnly } from "@/lib/dateUtils";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ScheduleTask, TaskDependency, Profile, Stakeholder, StudySite } from "@/types/schedule";
import { ArrowRight, AlertCircle, CheckCircle2, Clock, Ban, Columns3, Filter, X, ChevronRight, ChevronDown } from "lucide-react";
import { ProjectPhase } from "@/hooks/usePhases";
import { buildPhaseNumbering, contrastText } from "@/lib/phaseNumbering";
import { useTaskSubtasks } from "@/hooks/useTaskSubtasks";

interface TaskListViewProps {
  tasks: ScheduleTask[];
  dependencies: TaskDependency[];
  profiles: Profile[];
  stakeholders?: Stakeholder[];
  sites?: StudySite[];
  phases?: ProjectPhase[];
  onTaskClick: (task: ScheduleTask) => void;
  onRefresh: () => void;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", icon: <Clock className="h-3 w-3" />, variant: "secondary" },
  in_progress: { label: "Em Progresso", icon: <ArrowRight className="h-3 w-3" />, variant: "default" },
  completed: { label: "Concluído", icon: <CheckCircle2 className="h-3 w-3" />, variant: "outline" },
  blocked: { label: "Bloqueado", icon: <Ban className="h-3 w-3" />, variant: "destructive" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "text-green-600" },
  medium: { label: "Média", color: "text-yellow-600" },
  high: { label: "Alta", color: "text-orange-600" },
  critical: { label: "Crítica", color: "text-red-600" },
};

type ColKey = "code" | "phase" | "task" | "status" | "priority" | "progress" | "planned" | "actual" | "responsible" | "dependencies";
const COLUMNS: { key: ColKey; label: string }[] = [
  { key: "code", label: "#" },
  { key: "phase", label: "Fase" },
  { key: "task", label: "Tarefa" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Prioridade" },
  { key: "progress", label: "Progresso" },
  { key: "planned", label: "Planejado" },
  { key: "actual", label: "Real" },
  { key: "responsible", label: "Responsável" },
  { key: "dependencies", label: "Dependências" },
];

export const TaskListView = ({ tasks, dependencies, profiles, stakeholders = [], sites = [], phases = [], onTaskClick, onRefresh }: TaskListViewProps) => {
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>({
    code: true, phase: true, task: true, status: true, priority: true,
    progress: true, planned: true, actual: true, responsible: true, dependencies: true,
  });

  const phaseOrderMap = useMemo(() => {
    const m = new Map<string, number>();
    [...phases].sort((a, b) => a.display_order - b.display_order).forEach((p, i) => m.set(p.id, i + 1));
    return m;
  }, [phases]);

  const orderedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const pa = a.phase_id ? phaseOrderMap.get(a.phase_id) ?? 9999 : 0;
      const pb = b.phase_id ? phaseOrderMap.get(b.phase_id) ?? 9999 : 0;
      if (pa !== pb) return pa - pb;
      const dateA = a.planned_start_date || a.start_date || "";
      const dateB = b.planned_start_date || b.start_date || "";
      if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB);
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;
      return (a.title || "").localeCompare(b.title || "");
    });
  }, [tasks, phaseOrderMap]);

  const numbering = useMemo(() => buildPhaseNumbering(orderedTasks, phases), [orderedTasks, phases]);

  const filteredTasks = useMemo(() => {
    return orderedTasks.filter(t => {
      if (phaseFilter === "none" && t.phase_id) return false;
      if (phaseFilter !== "all" && phaseFilter !== "none" && t.phase_id !== phaseFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    });
  }, [orderedTasks, phaseFilter, statusFilter]);

  const hasActiveFilters = phaseFilter !== "all" || statusFilter !== "all";

  const getResponsibleName = (task: ScheduleTask) => {
    const t = task as any;
    if (t.assigned_stakeholder_id) {
      const s = stakeholders.find(x => x.id === t.assigned_stakeholder_id);
      if (s) return s.organization ? `${s.name} (${s.organization})` : s.name;
    }
    if (t.assigned_site_id) {
      const site = sites.find(x => x.id === t.assigned_site_id);
      if (site) return `Centro: ${site.site_code ? `[${site.site_code}] ` : ""}${site.name}`;
    }
    if (task.assigned_to) {
      return profiles.find(p => p.id === task.assigned_to)?.full_name || "Desconhecido";
    }
    return "Não atribuído";
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(parseLocalDate(date), "dd/MM/yyyy");
  };

  const getDependencyNames = (taskId: string) => {
    const taskDeps = dependencies.filter(d => d.task_id === taskId);
    if (taskDeps.length === 0) return "-";
    return taskDeps.map(dep => {
      const depTask = tasks.find(t => t.id === dep.depends_on_task_id);
      return depTask?.title || "Tarefa desconhecida";
    }).join(", ");
  };

  const isOverdue = (task: ScheduleTask) => {
    const endDate = task.planned_end_date || task.end_date;
    return endDate && parseLocalDate(endDate) < new Date() && task.status !== "completed";
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setUpdatingTask(taskId);
    try {
      const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
      if (error) throw error;
      toast.success("Status atualizado");
      onRefresh();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setUpdatingTask(null);
    }
  };

  const isVis = (k: ColKey) => visibleCols[k];

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma tarefa encontrada. Crie uma nova tarefa para começar.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />

        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-40 h-8">
            <SelectValue placeholder="Fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fases</SelectItem>
            <SelectItem value="none">Sem fase</SelectItem>
            {[...phases].sort((a, b) => a.display_order - b.display_order).map(p => (
              <SelectItem key={p.id} value={p.id}>
                <span className="inline-flex items-center gap-2">
                  {p.color && <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />}
                  {p.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Columns3 className="h-4 w-4 mr-1" />
              Colunas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {COLUMNS.map(c => (
              <DropdownMenuCheckboxItem
                key={c.key}
                checked={visibleCols[c.key]}
                onCheckedChange={(v) => setVisibleCols(prev => ({ ...prev, [c.key]: !!v }))}
                onSelect={(e) => e.preventDefault()}
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <>
            <Badge variant="secondary" className="text-xs">
              {filteredTasks.length} de {tasks.length} tarefas
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setPhaseFilter("all"); setStatusFilter("all"); }}>
              <X className="h-3 w-3 mr-1" /> Limpar
            </Button>
          </>
        )}
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {isVis("code") && <TableHead className="w-16">#</TableHead>}
              {isVis("phase") && <TableHead className="min-w-[120px]">Fase</TableHead>}
              {isVis("task") && <TableHead className="min-w-[200px]">Tarefa</TableHead>}
              {isVis("status") && <TableHead className="min-w-[120px]">Status</TableHead>}
              {isVis("priority") && <TableHead className="min-w-[80px]">Prioridade</TableHead>}
              {isVis("progress") && <TableHead className="min-w-[100px]">Progresso</TableHead>}
              {isVis("planned") && <TableHead className="min-w-[120px]">Planejado</TableHead>}
              {isVis("actual") && <TableHead className="min-w-[120px]">Real</TableHead>}
              {isVis("responsible") && <TableHead className="min-w-[120px]">Responsável</TableHead>}
              {isVis("dependencies") && <TableHead className="min-w-[150px]">Dependências</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map(task => {
              const status = statusConfig[task.status] || statusConfig.pending;
              const priority = priorityConfig[task.priority || "medium"] || priorityConfig.medium;
              const overdue = isOverdue(task);
              const isUpdating = updatingTask === task.id;
              const info = numbering.get(task.id);

              return (
                <TableRow
                  key={task.id}
                  className={`cursor-pointer hover:bg-muted/50 ${overdue ? "bg-red-50 dark:bg-red-950/20" : ""}`}
                >
                  {isVis("code") && (
                    <TableCell className="font-mono text-xs text-muted-foreground" onClick={() => onTaskClick(task)}>
                      {info?.code ?? "-"}
                    </TableCell>
                  )}
                  {isVis("phase") && (
                    <TableCell onClick={() => onTaskClick(task)}>
                      {info?.phase ? (
                        <span
                          className="inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                          style={{
                            backgroundColor: info.phase.color ?? "hsl(var(--muted))",
                            color: contrastText(info.phase.color),
                          }}
                        >
                          {info.phase.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem fase</span>
                      )}
                    </TableCell>
                  )}
                  {isVis("task") && (
                    <TableCell onClick={() => onTaskClick(task)}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{task.title}</span>
                        {overdue && <AlertCircle className="h-4 w-4 text-red-500" />}
                      </div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {task.description}
                        </div>
                      )}
                    </TableCell>
                  )}
                  {isVis("status") && (
                    <TableCell>
                      <Select
                        value={task.status}
                        onValueChange={(value) => handleStatusChange(task.id, value)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                {config.icon}
                                {config.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  {isVis("priority") && (
                    <TableCell>
                      <span className={`font-medium ${priority.color}`}>{priority.label}</span>
                    </TableCell>
                  )}
                  {isVis("progress") && (
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress value={task.progress_percentage} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-8">
                          {task.progress_percentage}%
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {isVis("planned") && (
                    <TableCell className="text-sm">
                      <div>{formatDate(task.planned_start_date)}</div>
                      <div className="text-muted-foreground">{formatDate(task.planned_end_date)}</div>
                    </TableCell>
                  )}
                  {isVis("actual") && (
                    <TableCell className="text-sm">
                      <div>{formatDate(task.actual_start_date)}</div>
                      <div className="text-muted-foreground">{formatDate(task.actual_end_date)}</div>
                    </TableCell>
                  )}
                  {isVis("responsible") && (
                    <TableCell className="text-sm">{getResponsibleName(task)}</TableCell>
                  )}
                  {isVis("dependencies") && (
                    <TableCell className="text-sm">
                      <div className="truncate max-w-[150px]" title={getDependencyNames(task.id)}>
                        {getDependencyNames(task.id)}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
