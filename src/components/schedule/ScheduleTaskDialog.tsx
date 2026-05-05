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
import { X, Plus } from "lucide-react";

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
    // Unified assignee value: "none" | `user:<id>` | `stakeholder:<id>` | `site:<id>`
    assignee: "none",
    planned_start_date: "",
    planned_end_date: "",
    actual_start_date: "",
    actual_end_date: "",
    progress_percentage: 0,
  });
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);

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
    if (task) {
      const t = task as any;
      let assignee = "none";
      if (t.assigned_stakeholder_id) assignee = `stakeholder:${t.assigned_stakeholder_id}`;
      else if (t.assigned_site_id) assignee = `site:${t.assigned_site_id}`;
      else if (t.assigned_to) assignee = `user:${t.assigned_to}`;
      setFormData({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority || "medium",
        assignee,
        planned_start_date: task.planned_start_date || "",
        planned_end_date: task.planned_end_date || "",
        actual_start_date: task.actual_start_date || "",
        actual_end_date: task.actual_end_date || "",
        progress_percentage: task.progress_percentage || 0,
      });
      setSelectedDependencies(dependencies.map(d => d.depends_on_task_id));
    } else {
      setFormData({
        title: "",
        description: "",
        status: "pending",
        priority: "medium",
        assignee: "none",
        planned_start_date: "",
        planned_end_date: "",
        actual_start_date: "",
        actual_end_date: "",
        progress_percentage: 0,
      });
      setSelectedDependencies([]);
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
      const [aType, aId] = formData.assignee.includes(":")
        ? formData.assignee.split(":")
        : ["none", ""];
      const taskData = {
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        priority: formData.priority,
        assigned_to: aType === "user" ? aId : null,
        assigned_stakeholder_id: aType === "stakeholder" ? aId : null,
        assigned_site_id: aType === "site" ? aId : null,
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
              <Label htmlFor="assignee">Responsável</Label>
              <Select
                value={formData.assignee}
                onValueChange={(value) => setFormData({ ...formData, assignee: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="none">Não atribuído</SelectItem>

                  {profiles.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Usuários do Sistema</div>
                      {profiles.map(p => (
                        <SelectItem key={`user-${p.id}`} value={`user:${p.id}`}>
                          {p.full_name}
                        </SelectItem>
                      ))}
                    </>
                  )}

                  {sites.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Centros do Estudo</div>
                      {sites.map(s => (
                        <SelectItem key={`site-${s.id}`} value={`site:${s.id}`}>
                          {s.site_code ? `[${s.site_code}] ` : ""}{s.name}
                        </SelectItem>
                      ))}
                    </>
                  )}

                  {stakeholders.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Stakeholders do Estudo</div>
                      {stakeholders.map(s => (
                        <SelectItem key={`st-${s.id}`} value={`stakeholder:${s.id}`}>
                          {s.name}{s.organization ? ` — ${s.organization}` : ""}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              {profiles.length === 0 && sites.length === 0 && stakeholders.length === 0 && (
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
    </Dialog>
  );
};
