import { parseLocalDate, formatDateOnly, todayDateOnly , formatInBrasilia } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Send, MessageSquare, CheckSquare, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string;
}

interface Project {
  id: string;
  title: string;
}

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
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  item_order: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string | null;
  user?: { full_name: string } | null;
}

interface EditTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditTaskDialog({ task, open, onOpenChange, onSuccess }: EditTaskDialogProps) {
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState("");
  const [newComment, setNewComment] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to: "",
    project_id: "",
    start_date: "",
    end_date: "",
    status: "pending",
    priority: "medium",
  });

  useEffect(() => {
    if (open && task) {
      fetchProfiles();
      fetchProjects();
      fetchSubtasks();
      fetchComments();
      getCurrentUser();
      setFormData({
        title: task.title,
        description: task.description || "",
        assigned_to: task.assigned_to || "",
        project_id: task.project_id || "",
        start_date: task.start_date || "",
        end_date: task.end_date || "",
        status: task.status,
        priority: task.priority || "medium",
      });
    }
  }, [open, task]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
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

  const fetchSubtasks = async () => {
    if (!task) return;
    const { data } = await supabase
      .from("task_subtasks")
      .select("*")
      .eq("task_id", task.id)
      .order("item_order");
    if (data) setSubtasks(data);
  };

  const fetchComments = async () => {
    if (!task) return;
    const { data } = await supabase
      .from("task_comments")
      .select(`
        *,
        user:profiles!task_comments_user_id_fkey(full_name)
      `)
      .eq("task_id", task.id)
      .order("created_at", { ascending: true });
    if (data) setComments(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: formData.title,
          description: formData.description || null,
          assigned_to: formData.assigned_to || null,
          project_id: formData.project_id || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          status: formData.status,
          priority: formData.priority,
        })
        .eq("id", task.id);

      if (error) throw error;
      toast.success("Tarefa atualizada!");
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm("Tem certeza que deseja excluir esta tarefa?")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;
      toast.success("Tarefa excluída!");
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Subtasks
  const addSubtask = async () => {
    if (!task || !newSubtask.trim()) return;
    try {
      const { error } = await supabase.from("task_subtasks").insert({
        task_id: task.id,
        title: newSubtask.trim(),
        due_date: newSubtaskDueDate || null,
        item_order: subtasks.length,
      });
      if (error) throw error;
      setNewSubtask("");
      setNewSubtaskDueDate("");
      fetchSubtasks();
    } catch (error: any) {
      toast.error("Erro ao adicionar subtarefa: " + error.message);
    }
  };

  const toggleSubtask = async (subtask: Subtask) => {
    try {
      const { error } = await supabase
        .from("task_subtasks")
        .update({
          completed: !subtask.completed,
          completed_at: !subtask.completed ? new Date().toISOString() : null,
        })
        .eq("id", subtask.id);
      if (error) throw error;
      fetchSubtasks();
    } catch (error: any) {
      toast.error("Erro ao atualizar subtarefa: " + error.message);
    }
  };

  const updateSubtaskDueDate = async (subtaskId: string, dueDate: string) => {
    try {
      const { error } = await supabase
        .from("task_subtasks")
        .update({ due_date: dueDate || null })
        .eq("id", subtaskId);
      if (error) throw error;
      fetchSubtasks();
    } catch (error: any) {
      toast.error("Erro ao atualizar data: " + error.message);
    }
  };

  const deleteSubtask = async (id: string) => {
    try {
      const { error } = await supabase.from("task_subtasks").delete().eq("id", id);
      if (error) throw error;
      fetchSubtasks();
    } catch (error: any) {
      toast.error("Erro ao excluir subtarefa: " + error.message);
    }
  };

  // Comments
  const addComment = async () => {
    if (!task || !newComment.trim() || !currentUserId) return;
    try {
      const { error } = await supabase.from("task_comments").insert({
        task_id: task.id,
        user_id: currentUserId,
        content: newComment.trim(),
      });
      if (error) throw error;
      setNewComment("");
      fetchComments();
    } catch (error: any) {
      toast.error("Erro ao adicionar comentário: " + error.message);
    }
  };

  const deleteComment = async (id: string) => {
    try {
      const { error } = await supabase.from("task_comments").delete().eq("id", id);
      if (error) throw error;
      fetchComments();
    } catch (error: any) {
      toast.error("Erro ao excluir comentário: " + error.message);
    }
  };

  const formatDateTime = (date: string) => {
    return formatInBrasilia(date, "MM/dd/yyyy HH:mm");
  };

  const formatDate = (date: string | null) => {
    if (!date) return "";
    return formatInBrasilia(date, "MM/dd/yyyy");
  };

  const isSubtaskOverdue = (dueDate: string | null, completed: boolean) => {
    if (!dueDate || completed) return false;
    return parseLocalDate(dueDate) < new Date();
  };

  const completedSubtasks = subtasks.filter((s) => s.completed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="subtasks" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              Subtarefas ({completedSubtasks}/{subtasks.length})
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Comentários ({comments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_id">Projeto Relacionado</Label>
                <Select
                  value={formData.project_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um projeto (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assigned_to">Delegado para</Label>
                <Select
                  value={formData.assigned_to || "none"}
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data Início</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Data Fim</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
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
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
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
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                  Excluir
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="subtasks" className="mt-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nova subtarefa..."
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask())}
                />
                <Input
                  type="date"
                  value={newSubtaskDueDate}
                  onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                  className="w-[140px]"
                  title="Data limite"
                />
                <Button onClick={addSubtask} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {subtasks.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma subtarefa ainda
                    </p>
                  ) : (
                    subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${
                          isSubtaskOverdue(subtask.due_date, subtask.completed) ? "border-destructive/50" : ""
                        }`}
                      >
                        <Checkbox
                          checked={subtask.completed}
                          onCheckedChange={() => toggleSubtask(subtask)}
                        />
                        <span
                          className={`flex-1 ${
                            subtask.completed ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {subtask.title}
                        </span>
                        <div className="flex items-center gap-2">
                          {subtask.due_date && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(subtask.due_date)}</span>
                              {isSubtaskOverdue(subtask.due_date, subtask.completed) && (
                                <Badge variant="destructive" className="text-xs">!</Badge>
                              )}
                            </div>
                          )}
                          <Input
                            type="date"
                            value={subtask.due_date || ""}
                            onChange={(e) => updateSubtaskDueDate(subtask.id, e.target.value)}
                            className="w-[130px] h-8 text-xs"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteSubtask(subtask.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <div className="space-y-4">
              <ScrollArea className="h-[250px]">
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum comentário ainda
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">
                                {comment.user?.full_name || "Usuário"}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {formatDateTime(comment.created_at)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm">{comment.content}</p>
                          </div>
                          {comment.user_id === currentUserId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteComment(comment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <Separator />

              <div className="flex gap-2">
                <Textarea
                  placeholder="Escreva um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={addComment} size="icon" className="self-end">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}