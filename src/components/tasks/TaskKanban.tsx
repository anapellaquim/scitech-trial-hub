import { parseLocalDate, formatDateOnly, todayDateOnly , formatInBrasilia } from "@/lib/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, User, CheckSquare } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  priority: string | null;
  assignee?: { full_name: string } | null;
  subtask_count?: number;
  subtask_completed?: number;
}

interface TaskKanbanProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

const columns = [
  { id: "pending", title: "Pendente", color: "bg-muted" },
  { id: "in_progress", title: "Em Andamento", color: "bg-primary/20" },
  { id: "completed", title: "Concluída", color: "bg-success/20" },
  { id: "cancelled", title: "Cancelada", color: "bg-destructive/20" },
];

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

export default function TaskKanban({ tasks, onTaskClick, onStatusChange }: TaskKanbanProps) {
  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return parseLocalDate(date).toLocaleDateString("pt-BR");
  };

  const isOverdue = (endDate: string | null, status: string) => {
    if (!endDate || status === "completed" || status === "cancelled") return false;
    return parseLocalDate(endDate) < new Date();
  };

  const isDueSoon = (endDate: string | null, status: string) => {
    if (!endDate || status === "completed" || status === "cancelled") return false;
    const now = new Date();
    const dueDate = parseLocalDate(endDate);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 3;
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      onStatusChange(taskId, newStatus);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => (
        <div
          key={column.id}
          className="flex flex-col"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <div className={`rounded-t-lg px-4 py-2 ${column.color}`}>
            <h3 className="font-semibold text-sm">
              {column.title} ({tasks.filter((t) => t.status === column.id).length})
            </h3>
          </div>
          <div className="flex-1 bg-muted/30 rounded-b-lg p-2 min-h-[300px] space-y-2">
            {tasks
              .filter((task) => task.status === column.id)
              .sort((a, b) => {
                if (!a.end_date && !b.end_date) return 0;
                if (!a.end_date) return 1;
                if (!b.end_date) return -1;
                return parseLocalDate(a.end_date).getTime() - parseLocalDate(b.end_date).getTime();
              })
              .map((task) => (
                <Card
                  key={task.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    isOverdue(task.end_date, task.status) 
                      ? "border-destructive/50 bg-destructive/5" 
                      : isDueSoon(task.end_date, task.status)
                        ? "border-warning/50 bg-warning/5"
                        : ""
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onClick={() => onTaskClick(task)}
                >
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm line-clamp-2">{task.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1 space-y-2">
                    {task.priority && (
                      <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                        {priorityLabels[task.priority]}
                      </Badge>
                    )}
                    
                    {task.end_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(task.end_date)}</span>
                        {isOverdue(task.end_date, task.status) && (
                          <Badge variant="destructive" className="text-xs ml-1">Atrasada</Badge>
                        )}
                        {!isOverdue(task.end_date, task.status) && isDueSoon(task.end_date, task.status) && (
                          <Badge className="text-xs ml-1 bg-warning/20 text-warning border-warning/30">Próximo</Badge>
                        )}
                      </div>
                    )}

                    {task.assignee && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="truncate">{task.assignee.full_name}</span>
                      </div>
                    )}

                    {/* Subtask Progress */}
                    {task.subtask_count !== undefined && task.subtask_count > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <CheckSquare className="h-3 w-3" />
                          <span>{task.subtask_completed}/{task.subtask_count}</span>
                        </div>
                        <Progress 
                          value={task.subtask_count > 0 ? (task.subtask_completed! / task.subtask_count) * 100 : 0} 
                          className="h-1"
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
  );
}