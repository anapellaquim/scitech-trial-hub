import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScheduleTask, TaskDependency, Profile, Stakeholder, StudySite } from "@/types/schedule";
import { X, Plus, Settings, Trash2, Check, ChevronsUpDown, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { usePhases } from "@/hooks/usePhases";
import { ManagePhasesDialog } from "./ManagePhasesDialog";

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  item_order: number;
  assignees?: string[];
}

type AssigneeOption = { value: string; label: string; group: string };

const MultiAssigneeSelect = ({
  options,
  value,
  onChange,
  placeholder = "Selecionar responsáveis",
}: {
  options: AssigneeOption[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  const groups = Array.from(new Set(options.map(o => o.group)));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className="truncate">
            {value.length === 0
              ? placeholder
              : `${value.length} selecionado(s)`}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList className="max-h-72">
            <CommandEmpty>Nenhum resultado.</CommandEmpty>
            {groups.map(g => (
              <CommandGroup key={g} heading={g}>
                {options.filter(o => o.group === g).map(o => (
                  <CommandItem key={o.value} value={o.label} onSelect={() => toggle(o.value)}>
                    <Check className={cn("mr-2 h-4 w-4", value.includes(o.value) ? "opacity-100" : "opacity-0")} />
                    {o.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface ScheduleTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ScheduleTask | null;
  projectId: string;
  tasks: ScheduleTask[];
  profiles: Profile[];
  dependencies: TaskDependency[];
  onSave: () => void;
}

export const ScheduleTaskDialog = ({
  open,
  onOpenChange,
  task,
  projectId,
  tasks,
  profiles,
  dependencies,
  onSave
}: ScheduleTaskDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [sites, setSites] = useState<StudySite[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    phase_id: "none",
    planned_start_date: "",
    planned_end_date: "",
    actual_start_date: "",
    actual_end_date: "",
    progress_percentage: 0,
  });
  // Multiple assignees as array of "user:id" | "stakeholder:id" | "site:id"
  const [taskAssignees, setTaskAssignees] = useState<string[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const { phases, refresh: refreshPhases } = usePhases(projectId);
  const [managePhasesOpen, setManagePhasesOpen] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState("");
  const [newSubtaskAssignees, setNewSubtaskAssignees] = useState<string[]>([]);

  const assigneeOptions: AssigneeOption[] = [
    ...profiles.map(p => ({ value: `user:${p.id}`, label: p.full_name, group: "Usuários do Sistema" })),
    ...sites.map(s => ({ value: `site:${s.id}`, label: `${s.site_code ? `[${s.site_code}] ` : ""}${s.name}`, group: "Centros do Estudo" })),
    ...stakeholders.map(s => ({ value: `stakeholder:${s.id}`, label: `${s.name}${s.organization ? ` — ${s.organization}` : ""}`, group: "Stakeholders" })),
  ];
  const assigneeLabel = (v: string) => assigneeOptions.find(o => o.value === v)?.label || v;

  const fetchSubtasks = async (taskId: string) => {
    const { data } = await supabase
      .from("task_subtasks")
      .select("id, title, completed, due_date, item_order")
      .eq("task_id", taskId)
      .order("item_order");
    const list = (data as Subtask[]) || [];
    if (list.length > 0) {
      const { data: links } = await supabase
        .from("task_subtask_assignees")
        .select("subtask_id, assignee_type, assignee_id")
        .in("subtask_id", list.map(s => s.id));
      const map = new Map<string, string[]>();
      (links || []).forEach((l: any) => {
        const arr = map.get(l.subtask_id) || [];
        arr.push(`${l.assignee_type}:${l.assignee_id}`);
        map.set(l.subtask_id, arr);
      });
      list.forEach(s => { s.assignees = map.get(s.id) || []; });
    }
    setSubtasks(list);
  };

  useEffect(() => {
    if (task?.id && open) fetchSubtasks(task.id);
    else setSubtasks([]);
  }, [task?.id, open]);

  const saveSubtaskAssignees = async (subtaskId: string, values: string[]) => {
    await supabase.from("task_subtask_assignees").delete().eq("subtask_id", subtaskId);
    if (values.length > 0) {
      await supabase.from("task_subtask_assignees").insert(values.map(v => {
        const [t, id] = v.split(":");
        return { subtask_id: subtaskId, assignee_type: t, assignee_id: id };
      }));
    }
  };

  const addSubtask = async () => {
    if (!task?.id || !newSubtask.trim()) return;
    const { data, error } = await supabase.from("task_subtasks").insert({
      task_id: task.id,
      title: newSubtask.trim(),
      due_date: newSubtaskDueDate || null,
      item_order: subtasks.length,
    }).select().single();
    if (error) { toast.error("Erro: " + error.message); return; }
    if (data && newSubtaskAssignees.length > 0) {
      await saveSubtaskAssignees(data.id, newSubtaskAssignees);
    }
    setNewSubtask("");
    setNewSubtaskDueDate("");
    setNewSubtaskAssignees([]);
    fetchSubtasks(task.id);
  };

  const updateSubtaskAssignees = async (s: Subtask, values: string[]) => {
    await saveSubtaskAssignees(s.id, values);
    if (task?.id) fetchSubtasks(task.id);
  };

  const toggleSubtask = async (s: Subtask) => {
    const { error } = await supabase
      .from("task_subtasks")
      .update({ completed: !s.completed, completed_at: !s.completed ? new Date().toISOString() : null })
      .eq("id", s.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    if (task?.id) fetchSubtasks(task.id);
  };

  const deleteSubtask = async (id: string) => {
    const { error } = await supabase.from("task_subtasks").delete().eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    if (task?.id) fetchSubtasks(task.id);
  };

  useEffect(() => {
    if (!projectId) { setStakeholders([]); setSites([]); return; }
    supabase
      .from("communication_stakeholders")
      .select("id, name, organization, stakeholder_type, project_id")
      .eq("project_id", projectId)
      .order("name")
      .then(({ data }) => setStakeholders((data as Stakeholder[]) || []));
    supabase
      .from("study_sites")
      .select("id, name, site_code, project_id")
      .eq("project_id", projectId)
      .order("name")
      .then(({ data }) => setSites((data as StudySite[]) || []));
  }, [projectId]);

  useEffect(() => {
    const loadTaskAssignees = async (taskId: string) => {
      const { data } = await supabase
        .from("task_assignees")
        .select("assignee_type, assignee_id")
        .eq("task_id", taskId);
      const list = (data || []).map((r: any) => `${r.assignee_type}:${r.assignee_id}`);
      // Fallback to legacy single-assignee fields if no rows
      if (list.length === 0 && task) {
        const t = task as any;
        if (t.assigned_stakeholder_id) list.push(`stakeholder:${t.assigned_stakeholder_id}`);
        else if (t.assigned_site_id) list.push(`site:${t.assigned_site_id}`);
        else if (t.assigned_to) list.push(`user:${t.assigned_to}`);
      }
      setTaskAssignees(list);
    };

    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority || "medium",
        phase_id: (task as any).phase_id || "none",
        planned_start_date: task.planned_start_date || "",
        planned_end_date: task.planned_end_date || "",
        actual_start_date: task.actual_start_date || "",
        actual_end_date: task.actual_end_date || "",
        progress_percentage: task.progress_percentage || 0,
      });
      setSelectedDependencies(dependencies.map(d => d.depends_on_task_id));
      loadTaskAssignees(task.id);
    } else {
      setFormData({
        title: "",
        description: "",
        status: "pending",
        priority: "medium",
        phase_id: "none",
        planned_start_date: "",
        planned_end_date: "",
        actual_start_date: "",
        actual_end_date: "",
        progress_percentage: 0,
      });
      setSelectedDependencies([]);
      setTaskAssignees([]);
    }
  }, [task, dependencies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    setLoading(true);
    try {
      // Use first assignee for legacy single-assignee columns (back-compat)
      const first = taskAssignees[0];
      const [aType, aId] = first ? first.split(":") : ["none", ""];
      const taskData = {
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        priority: formData.priority,
        assigned_to: aType === "user" ? aId : null,
        assigned_stakeholder_id: aType === "stakeholder" ? aId : null,
        assigned_site_id: aType === "site" ? aId : null,
        phase_id: formData.phase_id !== "none" ? formData.phase_id : null,
        planned_start_date: formData.planned_start_date || null,
        planned_end_date: formData.planned_end_date || null,
        actual_start_date: formData.actual_start_date || null,
        actual_end_date: formData.actual_end_date || null,
        progress_percentage: formData.progress_percentage,
        project_id: projectId,
      };

      let taskId = task?.id;

      if (task) {
        // Update existing task
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", task.id);

        if (error) throw error;
      } else {
        // Create new task
        const { data, error } = await supabase
          .from("tasks")
          .insert(taskData)
          .select()
          .single();

        if (error) throw error;
        taskId = data.id;
      }

      // Update dependencies
      if (taskId) {
        // Remove old dependencies
        await supabase
          .from("task_dependencies")
          .delete()
          .eq("task_id", taskId);

        // Add new dependencies
        if (selectedDependencies.length > 0) {
          const depsToInsert = selectedDependencies.map(depId => ({
            task_id: taskId,
            depends_on_task_id: depId,
            dependency_type: "finish_to_start",
          }));

          const { error: depError } = await supabase
            .from("task_dependencies")
            .insert(depsToInsert);

          if (depError) throw depError;
        }
      }

      // Save multiple assignees
      if (taskId) {
        await supabase.from("task_assignees").delete().eq("task_id", taskId);
        if (taskAssignees.length > 0) {
          await supabase.from("task_assignees").insert(taskAssignees.map(v => {
            const [t, id] = v.split(":");
            return { task_id: taskId, assignee_type: t, assignee_id: id };
          }));
        }
      }

      toast.success(task ? "Tarefa atualizada" : "Tarefa criada");
      onSave();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id);

      if (error) throw error;
      toast.success("Tarefa excluída");
      onSave();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const availableDependencies = tasks.filter(t => t.id !== task?.id);

  const addDependency = (taskId: string) => {
    if (!selectedDependencies.includes(taskId)) {
      setSelectedDependencies([...selectedDependencies, taskId]);
    }
  };

  const removeDependency = (taskId: string) => {
    setSelectedDependencies(selectedDependencies.filter(id => id !== taskId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nome da tarefa"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição detalhada"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="phase">Fase</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setManagePhasesOpen(true)}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Gerenciar fases
                </Button>
              </div>
              <Select
                value={formData.phase_id}
                onValueChange={(value) => setFormData({ ...formData, phase_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem fase</SelectItem>
                  {phases.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="inline-flex items-center gap-2">
                        {p.color && <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />}
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {phases.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Nenhuma fase cadastrada. Use "Gerenciar fases" para criar.
                </p>
              )}
            </div>

            <div className="col-span-2">
              <Label>Responsáveis</Label>
              <MultiAssigneeSelect
                options={assigneeOptions}
                value={taskAssignees}
                onChange={setTaskAssignees}
                placeholder="Selecione um ou mais responsáveis"
              />
              {taskAssignees.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {taskAssignees.map(v => (
                    <Badge key={v} variant="secondary" className="gap-1">
                      {assigneeLabel(v)}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setTaskAssignees(taskAssignees.filter(x => x !== v))} />
                    </Badge>
                  ))}
                </div>
              )}
              {assigneeOptions.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Nenhum responsável disponível. Cadastre usuários, centros ou stakeholders para o estudo.
                </p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <h4 className="font-medium">Datas Planejadas</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="planned_start_date">Início Planejado</Label>
                <Input
                  id="planned_start_date"
                  type="date"
                  value={formData.planned_start_date}
                  onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="planned_end_date">Fim Planejado</Label>
                <Input
                  id="planned_end_date"
                  type="date"
                  value={formData.planned_end_date}
                  onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                />
              </div>
            </div>

            <h4 className="font-medium">Datas Reais</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="actual_start_date">Início Real</Label>
                <Input
                  id="actual_start_date"
                  type="date"
                  value={formData.actual_start_date}
                  onChange={(e) => setFormData({ ...formData, actual_start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="actual_end_date">Fim Real</Label>
                <Input
                  id="actual_end_date"
                  type="date"
                  value={formData.actual_end_date}
                  onChange={(e) => setFormData({ ...formData, actual_end_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Progress */}
          <div>
            <Label>Progresso: {formData.progress_percentage}%</Label>
            <Slider
              value={[formData.progress_percentage]}
              onValueChange={([value]) => setFormData({ ...formData, progress_percentage: value })}
              max={100}
              step={5}
              className="mt-2"
            />
          </div>

          {/* Dependencies */}
          <div>
            <Label>Dependências</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Tarefas que devem ser concluídas antes desta
            </p>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedDependencies.map(depId => {
                const depTask = tasks.find(t => t.id === depId);
                return (
                  <Badge key={depId} variant="secondary" className="gap-1">
                    {depTask?.title || "Tarefa"}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeDependency(depId)}
                    />
                  </Badge>
                );
              })}
            </div>

            {availableDependencies.filter(t => !selectedDependencies.includes(t.id)).length > 0 && (
              <Select onValueChange={addDependency}>
                <SelectTrigger>
                  <SelectValue placeholder="Adicionar dependência" />
                </SelectTrigger>
                <SelectContent>
                  {availableDependencies
                    .filter(t => !selectedDependencies.includes(t.id))
                    .map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Subtasks */}
          {task && (
            <div className="space-y-2">
              <Label>Subtarefas</Label>
              <div className="space-y-1">
                {subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded border px-2 py-1">
                    <Checkbox checked={s.completed} onCheckedChange={() => toggleSubtask(s)} />
                    <span className={`flex-1 text-sm ${s.completed ? "line-through text-muted-foreground" : ""}`}>
                      {s.title}
                    </span>
                    {s.due_date && (
                      <span className="text-xs text-muted-foreground">{s.due_date}</span>
                    )}
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteSubtask(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {subtasks.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhuma subtarefa.</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nova subtarefa"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                />
                <Input
                  type="date"
                  className="w-40"
                  value={newSubtaskDueDate}
                  onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                />
                <Button type="button" onClick={addSubtask} disabled={!newSubtask.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {!task && (
            <p className="text-xs text-muted-foreground">Salve a tarefa para adicionar subtarefas.</p>
          )}

          <DialogFooter className="gap-2">
            {task && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                Excluir
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : task ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <ManagePhasesDialog
        open={managePhasesOpen}
        onOpenChange={setManagePhasesOpen}
        projectId={projectId}
        onChanged={refreshPhases}
      />
    </Dialog>
  );
};
