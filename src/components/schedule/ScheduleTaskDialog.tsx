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
import { ScheduleTask, TaskDependency, Profile } from "@/types/schedule";
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
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    assigned_to: "",
    planned_start_date: "",
    planned_end_date: "",
    actual_start_date: "",
    actual_end_date: "",
    progress_percentage: 0,
  });
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority || "medium",
        assigned_to: task.assigned_to || "",
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
        assigned_to: "",
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
      const taskData = {
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        priority: formData.priority,
        assigned_to: formData.assigned_to || null,
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
              <Label htmlFor="assigned_to">Responsável</Label>
              <Select
                value={formData.assigned_to || "none"}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não atribuído</SelectItem>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
