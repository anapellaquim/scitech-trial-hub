import { parseLocalDate, formatDateOnly, todayDateOnly } from "@/lib/dateUtils";
import { useMemo, useState } from "react";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, GripVertical, Filter, X } from "lucide-react";
import { ScheduleTask, TaskDependency, Profile, Stakeholder } from "@/types/schedule";
import { Badge as BadgeUI } from "@/components/ui/badge";

type ZoomLevel = "xxxs" | "xxs" | "xs" | "sm" | "md" | "lg" | "xl";

const ZOOM_CONFIG: Record<ZoomLevel, { cellWidth: number; label: string }> = {
  xxxs: { cellWidth: 4, label: "Anual" },
  xxs: { cellWidth: 8, label: "Semestral" },
  xs: { cellWidth: 12, label: "Trimestral" },
  sm: { cellWidth: 20, label: "Pequeno" },
  md: { cellWidth: 30, label: "Médio" },
  lg: { cellWidth: 40, label: "Grande" },
  xl: { cellWidth: 50, label: "Muito grande" },
};

const ZOOM_LEVELS: ZoomLevel[] = ["xxxs", "xxs", "xs", "sm", "md", "lg", "xl"];

interface GanttChartProps {
  tasks: ScheduleTask[];
  dependencies: TaskDependency[];
  profiles: Profile[];
  stakeholders?: Stakeholder[];
  onTaskClick: (task: ScheduleTask) => void;
  onOrderChange?: (taskIds: string[]) => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-muted",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  blocked: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Progresso",
  completed: "Concluído",
  blocked: "Bloqueado",
};

// Calculate critical path using forward/backward pass algorithm
const calculateCriticalPath = (tasks: ScheduleTask[], dependencies: TaskDependency[]): Set<string> => {
  if (tasks.length === 0) return new Set();

  // Build task map and adjacency lists
  const taskMap = new Map<string, ScheduleTask>();
  const successors = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();
  
  tasks.forEach(task => {
    taskMap.set(task.id, task);
    successors.set(task.id, []);
    predecessors.set(task.id, []);
  });

  dependencies.forEach(dep => {
    if (taskMap.has(dep.task_id) && taskMap.has(dep.depends_on_task_id)) {
      successors.get(dep.depends_on_task_id)?.push(dep.task_id);
      predecessors.get(dep.task_id)?.push(dep.depends_on_task_id);
    }
  });

  // Calculate duration for each task
  const getDuration = (task: ScheduleTask): number => {
    const start = task.planned_start_date || task.start_date;
    const end = task.planned_end_date || task.end_date;
    if (!start || !end) return 1;
    return Math.max(1, differenceInDays(parseLocalDate(end), parseLocalDate(start)) + 1);
  };

  // Forward pass - calculate earliest start (ES) and earliest finish (EF)
  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();
  
  // Find tasks with no predecessors (start tasks)
  const startTasks = tasks.filter(t => (predecessors.get(t.id)?.length || 0) === 0);
  
  // Topological sort for forward pass
  const visited = new Set<string>();
  const sortedTasks: string[] = [];
  
  const topologicalSort = (taskId: string) => {
    if (visited.has(taskId)) return;
    visited.add(taskId);
    
    predecessors.get(taskId)?.forEach(predId => {
      topologicalSort(predId);
    });
    
    sortedTasks.push(taskId);
  };
  
  tasks.forEach(t => topologicalSort(t.id));
  
  // Forward pass
  sortedTasks.forEach(taskId => {
    const task = taskMap.get(taskId)!;
    const preds = predecessors.get(taskId) || [];
    
    if (preds.length === 0) {
      earlyStart.set(taskId, 0);
    } else {
      const maxPredFinish = Math.max(...preds.map(p => earlyFinish.get(p) || 0));
      earlyStart.set(taskId, maxPredFinish);
    }
    
    earlyFinish.set(taskId, (earlyStart.get(taskId) || 0) + getDuration(task));
  });

  // Find project end time
  const projectEnd = Math.max(...Array.from(earlyFinish.values()));

  // Backward pass - calculate latest start (LS) and latest finish (LF)
  const lateStart = new Map<string, number>();
  const lateFinish = new Map<string, number>();
  
  // Reverse order for backward pass
  const reversedTasks = [...sortedTasks].reverse();
  
  reversedTasks.forEach(taskId => {
    const task = taskMap.get(taskId)!;
    const succs = successors.get(taskId) || [];
    
    if (succs.length === 0) {
      lateFinish.set(taskId, projectEnd);
    } else {
      const minSuccStart = Math.min(...succs.map(s => lateStart.get(s) || projectEnd));
      lateFinish.set(taskId, minSuccStart);
    }
    
    lateStart.set(taskId, (lateFinish.get(taskId) || projectEnd) - getDuration(task));
  });

  // Calculate slack and identify critical path
  const criticalTasks = new Set<string>();
  
  tasks.forEach(task => {
    const slack = (lateStart.get(task.id) || 0) - (earlyStart.get(task.id) || 0);
    // Critical path tasks have zero slack (or very close to zero due to floating point)
    if (Math.abs(slack) < 0.001) {
      criticalTasks.add(task.id);
    }
  });

  // If no dependencies exist, mark all incomplete tasks as potentially critical
  if (dependencies.length === 0 && tasks.length > 0) {
    const incompleteTasks = tasks.filter(t => t.status !== "completed");
    // Find the task(s) with the latest end date
    const latestEndDate = Math.max(
      ...incompleteTasks.map(t => {
        const end = t.planned_end_date || t.end_date;
        return end ? parseLocalDate(end).getTime() : 0;
      })
    );
    
    incompleteTasks.forEach(task => {
      const end = task.planned_end_date || task.end_date;
      if (end && parseLocalDate(end).getTime() === latestEndDate) {
        criticalTasks.add(task.id);
      }
    });
  }

  return criticalTasks;
};

type PeriodType = "all" | "1m" | "3m" | "6m" | "custom";

export const GanttChart = ({ tasks, dependencies, profiles, stakeholders = [], onTaskClick, onOrderChange }: GanttChartProps) => {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("md");
  const cellWidth = ZOOM_CONFIG[zoomLevel].cellWidth;
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [periodType, setPeriodType] = useState<PeriodType>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [viewOffset, setViewOffset] = useState(0); // For navigation in period modes
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  
  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  // Initialize task order based on display_order from database
  const taskOrder = useMemo(() => {
    // Sort by display_order, fallback to planned_start_date order
    return [...tasks]
      .sort((a, b) => {
        const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        // Fallback to date sorting
        const dateA = a.planned_start_date || a.start_date || '';
        const dateB = b.planned_start_date || b.start_date || '';
        return dateA.localeCompare(dateB);
      })
      .map(t => t.id);
  }, [tasks]);

  // Calculate critical path
  const criticalPathTasks = useMemo(() => {
    return calculateCriticalPath(tasks, dependencies);
  }, [tasks, dependencies]);

  // Calculate date range based on period selection
  const { startDate, endDate, months } = useMemo(() => {
    const today = new Date();
    let start: Date;
    let end: Date;

    if (periodType === "custom" && customStartDate && customEndDate) {
      start = parseLocalDate(customStartDate);
      end = parseLocalDate(customEndDate);
    } else if (periodType === "1m") {
      const baseDate = addMonths(today, viewOffset);
      start = startOfMonth(baseDate);
      end = endOfMonth(baseDate);
    } else if (periodType === "3m") {
      const baseDate = addMonths(today, viewOffset * 3);
      start = startOfMonth(baseDate);
      end = endOfMonth(addMonths(baseDate, 2));
    } else if (periodType === "6m") {
      const baseDate = addMonths(today, viewOffset * 6);
      start = startOfMonth(baseDate);
      end = endOfMonth(addMonths(baseDate, 5));
    } else {
      // "all" - show based on tasks
      if (tasks.length === 0) {
        return {
          startDate: startOfMonth(today),
          endDate: endOfMonth(addDays(today, 60)),
          totalDays: 90,
          months: []
        };
      }

      const dates = tasks.flatMap(t => [
        t.planned_start_date || t.start_date,
        t.planned_end_date || t.end_date,
        t.actual_start_date,
        t.actual_end_date
      ]).filter(Boolean).map(d => parseLocalDate(d!));

      if (dates.length === 0) {
        return {
          startDate: startOfMonth(today),
          endDate: endOfMonth(addDays(today, 60)),
          totalDays: 90,
          months: []
        };
      }

      const minDate = parseLocalDate(Math.min(...dates.map(d => d.getTime())));
      const maxDate = parseLocalDate(Math.max(...dates.map(d => d.getTime())));
      
      start = startOfMonth(addDays(minDate, -7));
      end = endOfMonth(addDays(maxDate, 14));
    }

    // Generate months
    const monthsList: { name: string; days: number; startCol: number }[] = [];
    let currentMonth = start;
    let col = 0;
    while (currentMonth <= end) {
      const monthEnd = endOfMonth(currentMonth);
      const daysInMonth = Math.min(
        differenceInDays(monthEnd, currentMonth) + 1,
        differenceInDays(end, currentMonth) + 1
      );
      monthsList.push({
        name: format(currentMonth, "MMMM yyyy", { locale: ptBR }),
        days: daysInMonth,
        startCol: col
      });
      col += daysInMonth;
      currentMonth = startOfMonth(addDays(monthEnd, 1));
    }

    return { startDate: start, endDate: end, totalDays: col, months: monthsList };
  }, [tasks, periodType, customStartDate, customEndDate, viewOffset]);

  // Filter and order tasks that are visible in current period
  const visibleTasks = useMemo(() => {
    let filtered = tasks;
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    // Apply assignee filter (uses stakeholder assignment, with legacy profile fallback)
    if (assigneeFilter !== "all") {
      if (assigneeFilter === "unassigned") {
        filtered = filtered.filter(task => !(task as any).assigned_stakeholder_id && !task.assigned_to);
      } else {
        filtered = filtered.filter(task => (task as any).assigned_stakeholder_id === assigneeFilter);
      }
    }
    
    // Apply period filter
    if (periodType !== "all") {
      filtered = filtered.filter(task => {
        const taskStart = task.planned_start_date || task.start_date || task.actual_start_date;
        const taskEnd = task.planned_end_date || task.end_date || task.actual_end_date;
        
        if (!taskStart && !taskEnd) return false;
        
        const start = taskStart ? parseLocalDate(taskStart) : null;
        const end = taskEnd ? parseLocalDate(taskEnd) : null;
        
        // Check if task overlaps with current period
        if (start && end) {
          return start <= endDate && end >= startDate;
        } else if (start) {
          return start <= endDate && start >= startDate;
        } else if (end) {
          return end >= startDate && end <= endDate;
        }
        return false;
      });
    }
    
    // Apply custom order
    if (taskOrder.length > 0) {
      const taskMap = new Map(filtered.map(t => [t.id, t]));
      const ordered = taskOrder
        .filter(id => taskMap.has(id))
        .map(id => taskMap.get(id)!);
      const remaining = filtered.filter(t => !taskOrder.includes(t.id));
      return [...ordered, ...remaining];
    }
    
    return filtered;
  }, [tasks, periodType, startDate, endDate, taskOrder, statusFilter, assigneeFilter]);
  
  // Check if any filter is active
  const hasActiveFilters = statusFilter !== "all" || assigneeFilter !== "all" || periodType !== "all";
  
  const clearAllFilters = () => {
    setStatusFilter("all");
    setAssigneeFilter("all");
    setPeriodType("all");
    setViewOffset(0);
  };

  // Generate days array
  const days = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  // Calculate today's position
  const todayPosition = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (today < startDate || today > endDate) return null;
    
    const dayIndex = differenceInDays(today, startDate);
    return dayIndex * cellWidth + cellWidth / 2;
  }, [startDate, endDate, cellWidth]);

  // Calculate task positions
  const getTaskPosition = (task: ScheduleTask) => {
    const taskStart = task.planned_start_date || task.start_date || task.actual_start_date;
    const taskEnd = task.planned_end_date || task.end_date || task.actual_end_date;
    
    if (!taskStart || !taskEnd) return null;

    const startCol = differenceInDays(parseLocalDate(taskStart), startDate);
    const duration = differenceInDays(parseLocalDate(taskEnd), parseLocalDate(taskStart)) + 1;

    return {
      left: startCol * cellWidth,
      width: Math.max(duration * cellWidth - 4, cellWidth - 4)
    };
  };

  // Calculate actual task position (for comparison)
  const getActualTaskPosition = (task: ScheduleTask) => {
    if (!task.actual_start_date || !task.actual_end_date) return null;

    const startCol = differenceInDays(parseLocalDate(task.actual_start_date), startDate);
    const duration = differenceInDays(parseLocalDate(task.actual_end_date), parseLocalDate(task.actual_start_date)) + 1;

    return {
      left: startCol * cellWidth,
      width: Math.max(duration * cellWidth - 4, cellWidth - 4)
    };
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return "Não atribuído";
    return profiles.find(p => p.id === userId)?.full_name || "Desconhecido";
  };

  const isOverdue = (task: ScheduleTask) => {
    const endDate = task.planned_end_date || task.end_date;
    return endDate && parseLocalDate(endDate) < new Date() && task.status !== "completed";
  };

  const isCritical = (taskId: string) => showCriticalPath && criticalPathTasks.has(taskId);

  const handlePeriodChange = (value: PeriodType) => {
    setPeriodType(value);
    setViewOffset(0);
  };

  const navigatePeriod = (direction: "prev" | "next") => {
    setViewOffset(prev => direction === "next" ? prev + 1 : prev - 1);
  };

  const getPeriodLabel = () => {
    if (periodType === "all") return "Todas as tarefas";
    if (periodType === "custom") return "Período personalizado";
    return format(startDate, "MMM yyyy", { locale: ptBR }) + " - " + format(endDate, "MMM yyyy", { locale: ptBR });
  };

  const zoomIn = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
    }
  };

  const zoomOut = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
    }
  };

  const resetZoom = () => {
    setZoomLevel("md");
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (taskId !== draggedTaskId) {
      setDragOverTaskId(taskId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTaskId(null);
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const currentOrder = taskOrder.length > 0 
      ? [...taskOrder] 
      : visibleTasks.map(t => t.id);
    
    const draggedIndex = currentOrder.indexOf(draggedTaskId);
    const targetIndex = currentOrder.indexOf(targetTaskId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedTaskId);
    
    // Notify parent to persist the order
    onOrderChange?.(newOrder);
    
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma tarefa encontrada. Crie uma nova tarefa para visualizar o cronograma.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="border rounded-lg overflow-hidden">
        {/* Period Filter & Critical Path Toggle */}
        <div className="p-3 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={periodType} onValueChange={(v) => handlePeriodChange(v as PeriodType)}>
                <SelectTrigger className="w-36 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo período</SelectItem>
                  <SelectItem value="1m">1 mês</SelectItem>
                  <SelectItem value="3m">3 meses</SelectItem>
                  <SelectItem value="6m">6 meses</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodType !== "all" && periodType !== "custom" && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigatePeriod("prev")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground min-w-32 text-center">
                  {getPeriodLabel()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigatePeriod("next")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {periodType === "custom" && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-8 w-36"
                />
                <span className="text-muted-foreground">até</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-8 w-36"
                />
              </div>
            )}

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignee Filter */}
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos responsáveis</SelectItem>
                <SelectItem value="unassigned">Não atribuído</SelectItem>
                {profiles.map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Active filters indicator */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <BadgeUI variant="secondary" className="text-xs">
                  {visibleTasks.length} de {tasks.length} tarefas
                </BadgeUI>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={clearAllFilters}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border-r pr-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={zoomOut}
                    disabled={zoomLevel === "xs"}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Diminuir zoom</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs min-w-16"
                    onClick={resetZoom}
                  >
                    {ZOOM_CONFIG[zoomLevel].label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clique para resetar zoom</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={zoomIn}
                    disabled={zoomLevel === "xl"}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Aumentar zoom</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm">Caminho Crítico</span>
              <Badge variant="secondary" className="text-xs">
                {criticalPathTasks.size}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="critical-path"
                checked={showCriticalPath}
                onCheckedChange={setShowCriticalPath}
              />
              <Label htmlFor="critical-path" className="text-sm cursor-pointer">
                Destacar
              </Label>
            </div>
          </div>
        </div>

        <ScrollArea className="w-full">
          <div className="min-w-max relative">
            {/* Header - Months */}
            <div className="flex border-b bg-muted/50">
              <div className="w-64 min-w-64 p-2 font-medium border-r sticky left-0 bg-muted/50 z-10">
                Tarefa
              </div>
              <div className="flex">
                {months.map((month, idx) => (
                  <div
                    key={idx}
                    className="text-center text-sm font-medium py-2 border-r capitalize"
                    style={{ width: month.days * cellWidth }}
                  >
                    {month.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Header - Days */}
            <div className="flex border-b bg-muted/30">
              <div className="w-64 min-w-64 p-2 text-sm text-muted-foreground border-r sticky left-0 bg-muted/30 z-10">
                Responsável
              </div>
              <div className="flex">
                {days.map((day, idx) => (
                  <div
                    key={idx}
                    className={`text-center text-xs py-1 border-r ${
                      isWeekend(day) ? "bg-muted/50" : ""
                    }`}
                    style={{ width: cellWidth }}
                  >
                    <div className="font-medium">{format(day, "d")}</div>
                    <div className="text-muted-foreground">{format(day, "EEE", { locale: ptBR })}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks */}
            {visibleTasks.map((task, index) => {
              const position = getTaskPosition(task);
              const actualPosition = getActualTaskPosition(task);
              const overdue = isOverdue(task);
              const critical = isCritical(task.id);
              const isDragging = draggedTaskId === task.id;
              const isDragOver = dragOverTaskId === task.id;

              return (
                <div 
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragOver={(e) => handleDragOver(e, task.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, task.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex border-b transition-all ${
                    critical 
                      ? "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50" 
                      : "hover:bg-muted/20"
                  } ${isDragging ? "opacity-50" : ""} ${
                    isDragOver ? "border-t-2 border-t-primary" : ""
                  }`}
                >
                  <div 
                    className={`w-64 min-w-64 p-2 border-r sticky left-0 z-10 ${
                      critical 
                        ? "bg-amber-50 dark:bg-amber-950/30" 
                        : "bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 hover:bg-muted rounded">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {critical && (
                        <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      )}
                      <span 
                        className={`font-medium text-sm truncate flex-1 cursor-pointer hover:underline ${critical ? "text-amber-700 dark:text-amber-400" : ""}`}
                        onClick={() => onTaskClick(task)}
                      >
                        {task.title}
                      </span>
                      {overdue && (
                        <Badge variant="destructive" className="text-xs">Atrasado</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate ml-6">
                      {getProfileName(task.assigned_to)}
                    </div>
                  </div>
                  <div className="flex-1 relative" style={{ height: 56 }}>
                    {/* Day grid */}
                    <div className="absolute inset-0 flex">
                      {days.map((day, idx) => (
                        <div
                          key={idx}
                          className={`border-r ${isWeekend(day) ? "bg-muted/30" : ""}`}
                          style={{ width: cellWidth }}
                        />
                      ))}
                    </div>

                    {/* Planned bar */}
                    {position && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute top-2 h-5 rounded cursor-pointer transition-all hover:opacity-80 ${
                              critical 
                                ? "bg-amber-500 ring-2 ring-amber-600 shadow-lg shadow-amber-500/30" 
                                : statusColors[task.status] || "bg-muted"
                            } ${overdue && !critical ? "ring-2 ring-red-500" : ""}`}
                            style={{ left: position.left + 2, width: position.width }}
                            onClick={() => onTaskClick(task)}
                          >
                            {/* Progress bar inside */}
                            <div 
                              className="h-full bg-black/20 rounded-l"
                              style={{ width: `${task.progress_percentage}%` }}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-1">
                              {critical && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                              {task.title}
                            </div>
                            {critical && (
                              <div className="text-xs text-amber-500 font-medium">
                                ⚠ Tarefa no caminho crítico - impacta prazo final
                              </div>
                            )}
                            <div className="text-xs">Status: {statusLabels[task.status] || task.status}</div>
                            <div className="text-xs">Progresso: {task.progress_percentage}%</div>
                            {task.planned_start_date && (
                              <div className="text-xs">
                                Planejado: {format(parseLocalDate(task.planned_start_date), "dd/MM")} - {task.planned_end_date ? format(parseLocalDate(task.planned_end_date), "dd/MM") : "?"}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Actual bar (if different from planned) */}
                    {actualPosition && position && (
                      actualPosition.left !== position.left || actualPosition.width !== position.width
                    ) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute top-8 h-3 rounded bg-orange-400/70 cursor-pointer border border-orange-500"
                            style={{ left: actualPosition.left + 2, width: actualPosition.width }}
                            onClick={() => onTaskClick(task)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            Real: {format(parseLocalDate(task.actual_start_date!), "dd/MM")} - {format(parseLocalDate(task.actual_end_date!), "dd/MM")}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Today line */}
            {todayPosition !== null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-auto cursor-pointer"
                    style={{ left: 256 + todayPosition }}
                  >
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-b font-medium whitespace-nowrap">
                      Hoje
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-xs">{format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Legend */}
        <div className="p-3 border-t bg-muted/30 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded bg-amber-500 ring-1 ring-amber-600" />
            <span className="font-medium text-amber-700 dark:text-amber-400">Caminho Crítico</span>
          </div>
          <div className="border-l pl-4 flex items-center gap-2">
            <div className="w-4 h-3 rounded bg-muted" />
            <span>Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded bg-blue-500" />
            <span>Em Progresso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded bg-green-500" />
            <span>Concluído</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded bg-red-500" />
            <span>Bloqueado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 rounded bg-orange-400 border border-orange-500" />
            <span>Data Real</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-red-500" />
            <span>Hoje</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};