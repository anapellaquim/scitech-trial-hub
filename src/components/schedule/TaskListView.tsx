import { parseLocalDate, formatDateOnly, todayDateOnly } from "@/lib/dateUtils";
import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ScheduleTask, TaskDependency, Profile, Stakeholder } from "@/types/schedule";
import { ArrowRight, AlertCircle, CheckCircle2, Clock, Ban } from "lucide-react";

interface TaskListViewProps {
  tasks: ScheduleTask[];
  dependencies: TaskDependency[];
  profiles: Profile[];
  stakeholders?: Stakeholder[];
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

export const TaskListView = ({ tasks, dependencies, profiles, stakeholders = [], onTaskClick, onRefresh }: TaskListViewProps) => {
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  const getResponsibleName = (task: ScheduleTask) => {
    const stId = (task as any).assigned_stakeholder_id as string | null | undefined;
    if (stId) {
      const s = stakeholders.find(x => x.id === stId);
      if (s) return s.organization ? `${s.name} (${s.organization})` : s.name;
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
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Status atualizado");
      onRefresh();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setUpdatingTask(null);
    }
  };

  const handleProgressChange = async (taskId: string, progress: number) => {
    setUpdatingTask(taskId);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ progress_percentage: progress })
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Progresso atualizado");
      onRefresh();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setUpdatingTask(null);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma tarefa encontrada. Crie uma nova tarefa para começar.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Tarefa</TableHead>
            <TableHead className="min-w-[120px]">Status</TableHead>
            <TableHead className="min-w-[80px]">Prioridade</TableHead>
            <TableHead className="min-w-[100px]">Progresso</TableHead>
            <TableHead className="min-w-[120px]">Planejado</TableHead>
            <TableHead className="min-w-[120px]">Real</TableHead>
            <TableHead className="min-w-[120px]">Responsável</TableHead>
            <TableHead className="min-w-[150px]">Dependências</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => {
            const status = statusConfig[task.status] || statusConfig.pending;
            const priority = priorityConfig[task.priority || "medium"] || priorityConfig.medium;
            const overdue = isOverdue(task);
            const isUpdating = updatingTask === task.id;

            return (
              <TableRow 
                key={task.id} 
                className={`cursor-pointer hover:bg-muted/50 ${overdue ? "bg-red-50 dark:bg-red-950/20" : ""}`}
              >
                <TableCell onClick={() => onTaskClick(task)}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{task.title}</span>
                    {overdue && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  {task.description && (
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {task.description}
                    </div>
                  )}
                </TableCell>
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
                <TableCell>
                  <span className={`font-medium ${priority.color}`}>
                    {priority.label}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <Progress value={task.progress_percentage} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-8">
                      {task.progress_percentage}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div>{formatDate(task.planned_start_date)}</div>
                  <div className="text-muted-foreground">{formatDate(task.planned_end_date)}</div>
                </TableCell>
                <TableCell className="text-sm">
                  <div>{formatDate(task.actual_start_date)}</div>
                  <div className="text-muted-foreground">{formatDate(task.actual_end_date)}</div>
                </TableCell>
                <TableCell className="text-sm">
                  {getProfileName(task.assigned_to)}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="truncate max-w-[150px]" title={getDependencyNames(task.id)}>
                    {getDependencyNames(task.id)}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
