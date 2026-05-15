import { parseLocalDate, formatDateOnly, todayDateOnly } , formatInBrasilia } from "@/lib/dateUtils";
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  format,
  differenceInDays,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfQuarter,
  endOfQuarter,
  addWeeks,
  addQuarters,
  startOfYear,
  endOfYear,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  GripVertical,
  Filter,
  X,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
} from "lucide-react";
import { ScheduleTask, TaskDependency, Profile, Stakeholder, StudySite } from "@/types/schedule";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectPhase } from "@/hooks/usePhases";
import { buildPhaseNumbering, contrastText } from "@/lib/phaseNumbering";
import { useTaskSubtasks } from "@/hooks/useTaskSubtasks";

type ZoomLevel = "xxxs" | "xxs" | "xs" | "sm" | "md" | "lg" | "xl";
type ScaleUnit = "quarter" | "month" | "week" | "day";

const ZOOM_CONFIG: Record<
  ZoomLevel,
  { unitWidth: number; unit: ScaleUnit; label: string }
> = {
  xxxs: { unitWidth: 60, unit: "quarter", label: "Anual" },
  xxs: { unitWidth: 50, unit: "month", label: "Semestral" },
  xs: { unitWidth: 32, unit: "week", label: "Trimestral" },
  sm: { unitWidth: 20, unit: "day", label: "Pequeno" },
  md: { unitWidth: 30, unit: "day", label: "Médio" },
  lg: { unitWidth: 40, unit: "day", label: "Grande" },
  xl: { unitWidth: 56, unit: "day", label: "Muito grande" },
};

const ZOOM_LEVELS: ZoomLevel[] = ["xxxs", "xxs", "xs", "sm", "md", "lg", "xl"];

// Average days-per-unit, used to convert unitWidth -> pxPerDay
const UNIT_AVG_DAYS: Record<ScaleUnit, number> = {
  day: 1,
  week: 7,
  month: 30.4375,
  quarter: 91.3125,
};

interface GanttChartProps {
  tasks: ScheduleTask[];
  dependencies: TaskDependency[];
  profiles: Profile[];
  stakeholders?: Stakeholder[];
  sites?: StudySite[];
  phases?: ProjectPhase[];
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
  const getDuration = (task: ScheduleTask): number => {
    const start = task.planned_start_date || task.start_date;
    const end = task.planned_end_date || task.end_date;
    if (!start || !end) return 1;
    return Math.max(1, differenceInDays(parseLocalDate(end), parseLocalDate(start)) + 1);
  };
  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();
  const visited = new Set<string>();
  const sortedTasks: string[] = [];
  const topologicalSort = (taskId: string) => {
    if (visited.has(taskId)) return;
    visited.add(taskId);
    predecessors.get(taskId)?.forEach(predId => topologicalSort(predId));
    sortedTasks.push(taskId);
  };
  tasks.forEach(t => topologicalSort(t.id));
  sortedTasks.forEach(taskId => {
    const task = taskMap.get(taskId)!;
    const preds = predecessors.get(taskId) || [];
    if (preds.length === 0) earlyStart.set(taskId, 0);
    else earlyStart.set(taskId, Math.max(...preds.map(p => earlyFinish.get(p) || 0)));
    earlyFinish.set(taskId, (earlyStart.get(taskId) || 0) + getDuration(task));
  });
  const projectEnd = Math.max(...Array.from(earlyFinish.values()));
  const lateStart = new Map<string, number>();
  const lateFinish = new Map<string, number>();
  const reversedTasks = [...sortedTasks].reverse();
  reversedTasks.forEach(taskId => {
    const task = taskMap.get(taskId)!;
    const succs = successors.get(taskId) || [];
    if (succs.length === 0) lateFinish.set(taskId, projectEnd);
    else lateFinish.set(taskId, Math.min(...succs.map(s => lateStart.get(s) || projectEnd)));
    lateStart.set(taskId, (lateFinish.get(taskId) || projectEnd) - getDuration(task));
  });
  const criticalTasks = new Set<string>();
  tasks.forEach(task => {
    const slack = (lateStart.get(task.id) || 0) - (earlyStart.get(task.id) || 0);
    if (Math.abs(slack) < 0.001) criticalTasks.add(task.id);
  });
  if (dependencies.length === 0 && tasks.length > 0) {
    const incompleteTasks = tasks.filter(t => t.status !== "completed");
    const latestEndDate = Math.max(
      ...incompleteTasks.map(t => {
        const end = t.planned_end_date || t.end_date;
        return end ? parseLocalDate(end).getTime() : 0;
      })
    );
    incompleteTasks.forEach(task => {
      const end = task.planned_end_date || task.end_date;
      if (end && parseLocalDate(end).getTime() === latestEndDate) criticalTasks.add(task.id);
    });
  }
  return criticalTasks;
};

type PeriodType = "all" | "1m" | "3m" | "6m" | "custom";

type TimelineUnit = { startDate: Date; days: number; label: string; isWeekend?: boolean };
type TimelineGroup = { label: string; days: number };

export const GanttChart = ({
  tasks,
  dependencies,
  profiles,
  stakeholders = [],
  sites = [],
  phases = [],
  onTaskClick,
  onOrderChange,
}: GanttChartProps) => {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("md");
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [periodType, setPeriodType] = useState<PeriodType>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [viewOffset, setViewOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [taskColCollapsed, setTaskColCollapsed] = useState(false);
  const subtasksApi = useTaskSubtasks();

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolled = useRef(false);

  const numCol = 56;
  const phaseCol = 140;
  const taskNameCol = 240;
  const taskColWidth = taskColCollapsed ? 44 : numCol + phaseCol + taskNameCol;
  const unitConfig = ZOOM_CONFIG[zoomLevel];
  const pxPerDay = unitConfig.unitWidth / UNIT_AVG_DAYS[unitConfig.unit];

  const phaseOrderMap = useMemo(() => {
    const m = new Map<string, number>();
    [...phases]
      .sort((a, b) => a.display_order - b.display_order)
      .forEach((p, i) => m.set(p.id, i + 1));
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

  const taskOrder = useMemo(() => orderedTasks.map(t => t.id), [orderedTasks]);

  const numbering = useMemo(() => buildPhaseNumbering(orderedTasks, phases), [orderedTasks, phases]);

  const criticalPathTasks = useMemo(() => calculateCriticalPath(tasks, dependencies), [tasks, dependencies]);

  // Date range
  const { startDate, endDate } = useMemo(() => {
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
      if (tasks.length === 0) {
        return { startDate: startOfMonth(today), endDate: endOfMonth(addDays(today, 60)) };
      }
      const dates = tasks
        .flatMap(t => [
          t.planned_start_date || t.start_date,
          t.planned_end_date || t.end_date,
          t.actual_start_date,
          t.actual_end_date,
        ])
        .filter(Boolean)
        .map(d => parseLocalDate(d!));
      if (dates.length === 0) {
        return { startDate: startOfMonth(today), endDate: endOfMonth(addDays(today, 60)) };
      }
      const minDate = parseLocalDate(Math.min(...dates.map(d => d.getTime())));
      const maxDate = parseLocalDate(Math.max(...dates.map(d => d.getTime())));
      start = startOfMonth(addDays(minDate, -7));
      end = endOfMonth(addDays(maxDate, 14));
    }
    return { startDate: start, endDate: end };
  }, [tasks, periodType, customStartDate, customEndDate, viewOffset]);

  // Build timeline (units + groups) based on scale
  const { units, groups, totalDays, totalWidth } = useMemo(() => {
    const unit = unitConfig.unit;
    const totalDays = differenceInDays(endDate, startDate) + 1;

    const units: TimelineUnit[] = [];
    const groups: TimelineGroup[] = [];

    if (unit === "day") {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      days.forEach(d => {
        units.push({
          startDate: d,
          days: 1,
          label: format(d, "d"),
          isWeekend: isWeekend(d),
        });
      });
      // group by month
      let cursor = startOfMonth(startDate);
      while (cursor <= endDate) {
        const monthEnd = endOfMonth(cursor);
        const segStart = cursor < startDate ? startDate : cursor;
        const segEnd = monthEnd > endDate ? endDate : monthEnd;
        const days = differenceInDays(segEnd, segStart) + 1;
        groups.push({
          label: format(cursor, "MMMM yyyy", { locale: ptBR }),
          days,
        });
        cursor = startOfMonth(addDays(monthEnd, 1));
      }
    } else if (unit === "week") {
      let cursor = startOfWeek(startDate, { weekStartsOn: 1 });
      while (cursor <= endDate) {
        const weekEnd = endOfWeek(cursor, { weekStartsOn: 1 });
        const segStart = cursor < startDate ? startDate : cursor;
        const segEnd = weekEnd > endDate ? endDate : weekEnd;
        const days = differenceInDays(segEnd, segStart) + 1;
        units.push({
          startDate: segStart,
          days,
          label: format(segStart, "d/MM"),
        });
        cursor = addDays(weekEnd, 1);
      }
      let mCursor = startOfMonth(startDate);
      while (mCursor <= endDate) {
        const mEnd = endOfMonth(mCursor);
        const segStart = mCursor < startDate ? startDate : mCursor;
        const segEnd = mEnd > endDate ? endDate : mEnd;
        const days = differenceInDays(segEnd, segStart) + 1;
        groups.push({
          label: format(mCursor, "MMM yyyy", { locale: ptBR }),
          days,
        });
        mCursor = startOfMonth(addDays(mEnd, 1));
      }
    } else if (unit === "month") {
      let cursor = startOfMonth(startDate);
      while (cursor <= endDate) {
        const mEnd = endOfMonth(cursor);
        const segStart = cursor < startDate ? startDate : cursor;
        const segEnd = mEnd > endDate ? endDate : mEnd;
        const days = differenceInDays(segEnd, segStart) + 1;
        units.push({
          startDate: segStart,
          days,
          label: format(cursor, "MMM", { locale: ptBR }),
        });
        cursor = startOfMonth(addDays(mEnd, 1));
      }
      let yCursor = startOfYear(startDate);
      while (yCursor <= endDate) {
        const yEnd = endOfYear(yCursor);
        const segStart = yCursor < startDate ? startDate : yCursor;
        const segEnd = yEnd > endDate ? endDate : yEnd;
        const days = differenceInDays(segEnd, segStart) + 1;
        groups.push({ label: format(yCursor, "yyyy"), days });
        yCursor = startOfYear(addDays(yEnd, 1));
      }
    } else {
      // quarter
      let cursor = startOfQuarter(startDate);
      while (cursor <= endDate) {
        const qEnd = endOfQuarter(cursor);
        const segStart = cursor < startDate ? startDate : cursor;
        const segEnd = qEnd > endDate ? endDate : qEnd;
        const days = differenceInDays(segEnd, segStart) + 1;
        const q = Math.floor(cursor.getMonth() / 3) + 1;
        units.push({
          startDate: segStart,
          days,
          label: `T${q}`,
        });
        cursor = startOfQuarter(addDays(qEnd, 1));
      }
      let yCursor = startOfYear(startDate);
      while (yCursor <= endDate) {
        const yEnd = endOfYear(yCursor);
        const segStart = yCursor < startDate ? startDate : yCursor;
        const segEnd = yEnd > endDate ? endDate : yEnd;
        const days = differenceInDays(segEnd, segStart) + 1;
        groups.push({ label: format(yCursor, "yyyy"), days });
        yCursor = startOfYear(addDays(yEnd, 1));
      }
    }

    const totalWidth = totalDays * pxPerDay;
    return { units, groups, totalDays, totalWidth };
  }, [startDate, endDate, unitConfig.unit, pxPerDay]);

  const visibleTasks = useMemo(() => {
    let filtered = tasks;
    if (statusFilter !== "all") filtered = filtered.filter(task => task.status === statusFilter);
    if (phaseFilter !== "all") {
      if (phaseFilter === "none") filtered = filtered.filter(t => !t.phase_id);
      else filtered = filtered.filter(t => t.phase_id === phaseFilter);
    }
    if (assigneeFilter !== "all") {
      if (assigneeFilter === "unassigned") {
        filtered = filtered.filter(task => {
          const t = task as any;
          return !t.assigned_stakeholder_id && !t.assigned_site_id && !task.assigned_to;
        });
      } else {
        const [type, id] = assigneeFilter.split(":");
        filtered = filtered.filter(task => {
          const t = task as any;
          if (type === "user") return task.assigned_to === id;
          if (type === "stakeholder") return t.assigned_stakeholder_id === id;
          if (type === "site") return t.assigned_site_id === id;
          return false;
        });
      }
    }
    if (periodType !== "all") {
      filtered = filtered.filter(task => {
        const taskStart = task.planned_start_date || task.start_date || task.actual_start_date;
        const taskEnd = task.planned_end_date || task.end_date || task.actual_end_date;
        if (!taskStart && !taskEnd) return false;
        const start = taskStart ? parseLocalDate(taskStart) : null;
        const end = taskEnd ? parseLocalDate(taskEnd) : null;
        if (start && end) return start <= endDate && end >= startDate;
        if (start) return start <= endDate && start >= startDate;
        if (end) return end >= startDate && end <= endDate;
        return false;
      });
    }
    if (taskOrder.length > 0) {
      const taskMap = new Map(filtered.map(t => [t.id, t]));
      const ordered = taskOrder.filter(id => taskMap.has(id)).map(id => taskMap.get(id)!);
      const remaining = filtered.filter(t => !taskOrder.includes(t.id));
      return [...ordered, ...remaining];
    }
    return filtered;
  }, [tasks, periodType, startDate, endDate, taskOrder, statusFilter, assigneeFilter, phaseFilter]);

  const hasActiveFilters = statusFilter !== "all" || assigneeFilter !== "all" || phaseFilter !== "all" || periodType !== "all";

  const clearAllFilters = () => {
    setStatusFilter("all");
    setAssigneeFilter("all");
    setPhaseFilter("all");
    setPeriodType("all");
    setViewOffset(0);
  };

  const todayPosition = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today < startDate || today > endDate) return null;
    const dayIndex = differenceInDays(today, startDate);
    return dayIndex * pxPerDay + pxPerDay / 2;
  }, [startDate, endDate, pxPerDay]);

  const getTaskPosition = (task: ScheduleTask) => {
    const taskStart = task.planned_start_date || task.start_date || task.actual_start_date;
    const taskEnd = task.planned_end_date || task.end_date || task.actual_end_date;
    if (!taskStart || !taskEnd) return null;
    const startCol = differenceInDays(parseLocalDate(taskStart), startDate);
    const duration = differenceInDays(parseLocalDate(taskEnd), parseLocalDate(taskStart)) + 1;
    return {
      left: startCol * pxPerDay,
      width: Math.max(duration * pxPerDay - 2, 6),
    };
  };

  const getActualTaskPosition = (task: ScheduleTask) => {
    if (!task.actual_start_date || !task.actual_end_date) return null;
    const startCol = differenceInDays(parseLocalDate(task.actual_start_date), startDate);
    const duration = differenceInDays(parseLocalDate(task.actual_end_date), parseLocalDate(task.actual_start_date)) + 1;
    return {
      left: startCol * pxPerDay,
      width: Math.max(duration * pxPerDay - 2, 6),
    };
  };

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

  const isOverdue = (task: ScheduleTask) => {
    const eDate = task.planned_end_date || task.end_date;
    return eDate && parseLocalDate(eDate) < new Date() && task.status !== "completed";
  };

  const isCritical = (taskId: string) => showCriticalPath && criticalPathTasks.has(taskId);

  const handlePeriodChange = (value: PeriodType) => {
    setPeriodType(value);
    setViewOffset(0);
  };

  const navigatePeriod = (direction: "prev" | "next") => {
    setViewOffset(prev => (direction === "next" ? prev + 1 : prev - 1));
  };

  const getPeriodLabel = () => {
    if (periodType === "all") return "Todas as tarefas";
    if (periodType === "custom") return "Período personalizado";
    return format(startDate, "MMM yyyy", { locale: ptBR }) + " - " + format(endDate, "MMM yyyy", { locale: ptBR });
  };

  const zoomIn = () => {
    const i = ZOOM_LEVELS.indexOf(zoomLevel);
    if (i < ZOOM_LEVELS.length - 1) setZoomLevel(ZOOM_LEVELS[i + 1]);
  };
  const zoomOut = () => {
    const i = ZOOM_LEVELS.indexOf(zoomLevel);
    if (i > 0) setZoomLevel(ZOOM_LEVELS[i - 1]);
  };

  // Fit to screen: pick the largest zoom whose timeline fits
  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const available = container.clientWidth - taskColWidth - 16;
    if (available <= 0 || totalDays <= 0) return;
    let best: ZoomLevel = "xxxs";
    for (const level of ZOOM_LEVELS) {
      const cfg = ZOOM_CONFIG[level];
      const px = totalDays * (cfg.unitWidth / UNIT_AVG_DAYS[cfg.unit]);
      if (px <= available) best = level;
    }
    setZoomLevel(best);
  }, [taskColWidth, totalDays]);

  // Auto-scroll to today on first render with data
  useEffect(() => {
    if (hasAutoScrolled.current) return;
    if (!scrollViewportRef.current || todayPosition === null) return;
    const viewport = scrollViewportRef.current;
    const target = Math.max(0, todayPosition - viewport.clientWidth / 2 + taskColWidth);
    viewport.scrollTo({ left: target, behavior: "smooth" });
    hasAutoScrolled.current = true;
  }, [todayPosition, taskColWidth]);

  // Shift + wheel = horizontal scroll
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey && e.deltaY !== 0) {
        e.preventDefault();
        viewport.scrollLeft += e.deltaY;
      }
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  // Capture scroll viewport ref
  const setScrollAreaRef = (el: HTMLDivElement | null) => {
    if (!el) return;
    const viewport = el.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
    scrollViewportRef.current = viewport;
  };

  // DnD
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };
  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (taskId !== draggedTaskId) setDragOverTaskId(taskId);
  };
  const handleDragLeave = () => setDragOverTaskId(null);
  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }
    const currentOrder = taskOrder.length > 0 ? [...taskOrder] : visibleTasks.map(t => t.id);
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
      <div ref={containerRef} className="border rounded-lg overflow-hidden">
        {/* Toolbar */}
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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigatePeriod("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground min-w-32 text-center">{getPeriodLabel()}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigatePeriod("next")}>
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

            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="all">Todos responsáveis</SelectItem>
                <SelectItem value="unassigned">Não atribuído</SelectItem>
                {profiles.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Usuários</div>
                    {profiles.map(p => (
                      <SelectItem key={`u-${p.id}`} value={`user:${p.id}`}>{p.full_name}</SelectItem>
                    ))}
                  </>
                )}
                {sites.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Centros</div>
                    {sites.map(s => (
                      <SelectItem key={`si-${s.id}`} value={`site:${s.id}`}>
                        {s.site_code ? `[${s.site_code}] ` : ""}{s.name}
                      </SelectItem>
                    ))}
                  </>
                )}
                {stakeholders.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Stakeholders</div>
                    {stakeholders.map(s => (
                      <SelectItem key={`st-${s.id}`} value={`stakeholder:${s.id}`}>
                        {s.organization ? `${s.name} (${s.organization})` : s.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <BadgeUI variant="secondary" className="text-xs">
                  {visibleTasks.length} de {tasks.length} tarefas
                </BadgeUI>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearAllFilters}>
                  <X className="h-3 w-3 mr-1" />
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Collapse task column */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setTaskColCollapsed(v => !v)}
                >
                  {taskColCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{taskColCollapsed ? "Expandir coluna" : "Recolher coluna"}</TooltipContent>
            </Tooltip>

            {/* Zoom */}
            <div className="flex items-center gap-1 border-l pl-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={zoomOut}
                    disabled={zoomLevel === ZOOM_LEVELS[0]}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Diminuir zoom</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs min-w-20" onClick={fitToScreen}>
                    {ZOOM_CONFIG[zoomLevel].label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clique para ajustar à tela</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={zoomIn}
                    disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Aumentar zoom</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fitToScreen}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ajustar à tela</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2 border-l pl-4">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm">Caminho Crítico</span>
              <Badge variant="secondary" className="text-xs">{criticalPathTasks.size}</Badge>
              <Switch id="critical-path" checked={showCriticalPath} onCheckedChange={setShowCriticalPath} />
            </div>
          </div>
        </div>

        <ScrollArea ref={setScrollAreaRef} className="w-full">
          <div className="min-w-max relative">
            {/* Header - Groups */}
            <div className="flex border-b bg-muted/50">
              <div
                className="font-medium border-r sticky left-0 bg-muted/50 z-10 flex"
                style={{ width: taskColWidth, minWidth: taskColWidth }}
              >
                {taskColCollapsed ? (
                  <div className="p-2" />
                ) : (
                  <>
                    <div className="p-2 border-r text-center" style={{ width: numCol }}>#</div>
                    <div className="p-2 border-r" style={{ width: phaseCol }}>Fase</div>
                    <div className="p-2 flex-1">Tarefa</div>
                  </>
                )}
              </div>
              <div className="flex">
                {groups.map((group, idx) => (
                  <div
                    key={idx}
                    className="text-center text-sm font-medium py-2 border-r capitalize truncate"
                    style={{ width: group.days * pxPerDay }}
                  >
                    {group.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Header - Units */}
            <div className="flex border-b bg-muted/30">
              <div
                className="text-sm text-muted-foreground border-r sticky left-0 bg-muted/30 z-10 flex"
                style={{ width: taskColWidth, minWidth: taskColWidth }}
              >
                {taskColCollapsed ? (
                  <div className="p-2" />
                ) : (
                  <>
                    <div className="border-r" style={{ width: numCol }} />
                    <div className="border-r" style={{ width: phaseCol }} />
                    <div className="p-2 flex-1">Responsável</div>
                  </>
                )}
              </div>
              <div className="flex">
                {units.map((u, idx) => (
                  <div
                    key={idx}
                    className={`text-center text-xs py-1 border-r ${u.isWeekend ? "bg-muted/50" : ""}`}
                    style={{ width: u.days * pxPerDay }}
                  >
                    <div className="font-medium truncate px-1">{u.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks */}
            {visibleTasks.map((task) => {
              const position = getTaskPosition(task);
              const actualPosition = getActualTaskPosition(task);
              const overdue = isOverdue(task);
              const critical = isCritical(task.id);
              const isDragging = draggedTaskId === task.id;
              const isDragOver = dragOverTaskId === task.id;
              const info = numbering.get(task.id);
              const phaseBg = info?.phase?.color ?? null;
              const phaseFg = phaseBg ? contrastText(phaseBg) : undefined;

              return (
                <React.Fragment key={task.id}>
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragOver={(e) => handleDragOver(e, task.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, task.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex border-b transition-all ${
                    critical ? "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50" : "hover:bg-muted/20"
                  } ${isDragging ? "opacity-50" : ""} ${isDragOver ? "border-t-2 border-t-primary" : ""}`}
                >
                  <div
                    className={`border-r sticky left-0 z-10 flex ${critical ? "bg-amber-50 dark:bg-amber-950/30" : "bg-background"}`}
                    style={{ width: taskColWidth, minWidth: taskColWidth }}
                  >
                    {taskColCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="flex items-center justify-center cursor-pointer h-full w-full"
                            onClick={() => onTaskClick(task)}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <div className="font-medium">
                            {info?.code ? <span className="font-mono mr-2 text-muted-foreground">{info.code}</span> : null}
                            {task.title}
                          </div>
                          <div className="text-xs text-muted-foreground">{getResponsibleName(task)}</div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <>
                        <div
                          className="border-r flex items-center justify-center font-mono text-xs text-muted-foreground cursor-pointer"
                          style={{ width: numCol }}
                          onClick={() => onTaskClick(task)}
                          title={info?.code}
                        >
                          {info?.code ?? "-"}
                        </div>
                        <div
                          className="border-r p-2 flex items-center cursor-pointer"
                          style={{ width: phaseCol }}
                          onClick={() => onTaskClick(task)}
                        >
                          {info?.phase ? (
                            <span
                              className="inline-block px-2 py-0.5 rounded text-xs font-medium truncate max-w-full"
                              style={{ backgroundColor: phaseBg!, color: phaseFg }}
                              title={info.phase.name}
                            >
                              {info.phase.name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem fase</span>
                          )}
                        </div>
                        <div className="p-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 hover:bg-muted rounded">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 -ml-1 shrink-0"
                              onClick={(e) => { e.stopPropagation(); subtasksApi.toggleExpanded(task.id); }}
                              title="Subtarefas"
                            >
                              {subtasksApi.expanded.has(task.id)
                                ? <ChevronDown className="h-3.5 w-3.5" />
                                : <ChevronRight className="h-3.5 w-3.5" />}
                            </Button>
                            {critical && <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                            <span
                              className={`font-medium text-sm truncate flex-1 cursor-pointer hover:underline ${critical ? "text-amber-700 dark:text-amber-400" : ""}`}
                              onClick={() => onTaskClick(task)}
                            >
                              {task.title}
                            </span>
                            {overdue && <Badge variant="destructive" className="text-xs">Atrasado</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground truncate ml-6">
                            {getResponsibleName(task)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex-1 relative" style={{ height: 56 }}>
                    {/* Unit grid */}
                    <div className="absolute inset-0 flex">
                      {units.map((u, idx) => (
                        <div
                          key={idx}
                          className={`border-r ${u.isWeekend ? "bg-muted/30" : ""}`}
                          style={{ width: u.days * pxPerDay }}
                        />
                      ))}
                    </div>

                    {position && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute top-2 h-5 rounded cursor-pointer transition-all hover:opacity-80 ${
                              critical
                                ? "bg-amber-500 ring-2 ring-amber-600 shadow-lg shadow-amber-500/30"
                                : statusColors[task.status] || "bg-muted"
                            } ${overdue && !critical ? "ring-2 ring-red-500" : ""}`}
                            style={{ left: position.left + 1, width: position.width }}
                            onClick={() => onTaskClick(task)}
                          >
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
                                Planejado: {format(parseLocalDate(task.planned_start_date), "dd/MM/yyyy")}
                                {" - "}
                                {task.planned_end_date ? format(parseLocalDate(task.planned_end_date), "dd/MM/yyyy") : "?"}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {actualPosition && position && (actualPosition.left !== position.left || actualPosition.width !== position.width) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute top-8 h-3 rounded bg-orange-400/70 cursor-pointer border border-orange-500"
                            style={{ left: actualPosition.left + 1, width: actualPosition.width }}
                            onClick={() => onTaskClick(task)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            Real: {format(parseLocalDate(task.actual_start_date!), "dd/MM/yyyy")}
                            {" - "}
                            {format(parseLocalDate(task.actual_end_date!), "dd/MM/yyyy")}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                {subtasksApi.expanded.has(task.id) && (
                  <div className="flex border-b bg-muted/10">
                    <div
                      className="border-r sticky left-0 z-10 bg-muted/10"
                      style={{ width: taskColWidth, minWidth: taskColWidth }}
                    >
                      <div className="pl-12 pr-2 py-2">
                        {(subtasksApi.byTask[task.id] ?? []).length === 0 ? (
                          <div className="text-xs text-muted-foreground">
                            Nenhuma subtarefa.
                          </div>
                        ) : (
                          <ul className="space-y-1">
                            {(subtasksApi.byTask[task.id] ?? []).map(s => (
                              <li key={s.id} className="flex items-center gap-2 text-xs">
                                <Checkbox
                                  checked={s.completed}
                                  onCheckedChange={() => subtasksApi.toggleCompleted(s)}
                                />
                                <span className={`truncate ${s.completed ? "line-through text-muted-foreground" : ""}`}>
                                  {s.title}
                                </span>
                                {s.due_date && (
                                  <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
                                    {format(parseLocalDate(s.due_date), "dd/MM")}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 relative" style={{ minHeight: 32 }}>
                      <div className="absolute inset-0 flex">
                        {units.map((u, idx) => (
                          <div
                            key={idx}
                            className={`border-r ${u.isWeekend ? "bg-muted/20" : ""}`}
                            style={{ width: u.days * pxPerDay }}
                          />
                        ))}
                      </div>
                      {(subtasksApi.byTask[task.id] ?? []).map(s => {
                        if (!s.due_date) return null;
                        const dayIndex = differenceInDays(parseLocalDate(s.due_date), startDate);
                        if (dayIndex < 0 || dayIndex > totalDays) return null;
                        const left = dayIndex * pxPerDay + pxPerDay / 2;
                        return (
                          <Tooltip key={s.id}>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 ${s.completed ? "bg-green-500" : "bg-blue-500"}`}
                                style={{ left: left - 5 }}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs font-medium">{s.title}</div>
                              <div className="text-xs">{format(parseLocalDate(s.due_date), "dd/MM/yyyy")}</div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                )}
                </React.Fragment>
              );
            })}

            {/* Today line */}
            {todayPosition !== null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-auto cursor-pointer"
                    style={{ left: taskColWidth + todayPosition }}
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-b font-medium whitespace-nowrap">
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
          <ScrollBar orientation="horizontal" className="!opacity-100" />
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
          <div className="ml-auto text-muted-foreground">
            Dica: Shift + roda do mouse para rolar horizontalmente
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
