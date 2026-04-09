import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings, Plus, Trash2, Loader2, GripVertical, ChevronUp, ChevronDown, Copy, ListChecks, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TemplateSubtask {
  title: string;
}

interface TemplateActivity {
  title: string;
  priority: string;
  subtasks?: TemplateSubtask[];
}

interface TemplatePhase {
  name: string;
  description: string;
  order: number;
  activities: TemplateActivity[];
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  phases: TemplatePhase[];
  is_active: boolean;
}

interface ManageProjectTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_OPTIONS = [
  { value: "clinical_trial", label: "Estudo Clínico" },
  { value: "observational", label: "Observacional" },
  { value: "phase_1", label: "Fase I" },
  { value: "phase_2", label: "Fase II" },
  { value: "phase_3", label: "Fase III" },
  { value: "phase_4", label: "Fase IV" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

export default function ManageProjectTemplatesDialog({
  open,
  onOpenChange,
}: ManageProjectTemplatesDialogProps) {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state for editing
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("clinical_trial");
  const [editPhases, setEditPhases] = useState<TemplatePhase[]>([]);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  useEffect(() => {
    if (selectedTemplate) {
      setEditName(selectedTemplate.name);
      setEditDescription(selectedTemplate.description || "");
      setEditCategory(selectedTemplate.category);
      setEditPhases(selectedTemplate.phases);
      setIsCreating(false);
    }
  }, [selectedTemplate]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_templates")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar modelos");
      console.error(error);
    } else {
      const parsedTemplates = (data || []).map((t) => ({
        ...t,
        phases: Array.isArray(t.phases) ? t.phases : JSON.parse(t.phases as string),
      })) as ProjectTemplate[];
      setTemplates(parsedTemplates);
    }
    setLoading(false);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setEditName("");
    setEditDescription("");
    setEditCategory("clinical_trial");
    setEditPhases([
      {
        name: "Fase 1",
        description: "",
        order: 1,
        activities: [],
      },
    ]);
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("Nome do modelo é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const templateData = {
        name: editName,
        description: editDescription || null,
        category: editCategory,
        phases: JSON.parse(JSON.stringify(editPhases)),
        is_active: true,
      };

      if (isCreating) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("project_templates")
          .insert([{ ...templateData, created_by: user?.id }]);

        if (error) throw error;
        toast.success("Modelo criado com sucesso!");
      } else if (selectedTemplate) {
        const { error } = await supabase
          .from("project_templates")
          .update(templateData)
          .eq("id", selectedTemplate.id);

        if (error) throw error;
        toast.success("Modelo atualizado com sucesso!");
      }

      await loadTemplates();
      setSelectedTemplate(null);
      setIsCreating(false);
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Erro ao salvar modelo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    if (!confirm(`Tem certeza que deseja excluir o modelo "${selectedTemplate.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("project_templates")
        .delete()
        .eq("id", selectedTemplate.id);

      if (error) throw error;
      toast.success("Modelo excluído");
      await loadTemplates();
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Erro ao excluir modelo");
    }
  };

  const handleDuplicate = () => {
    if (!selectedTemplate) return;
    
    setEditName(`${selectedTemplate.name} (Cópia)`);
    setEditDescription(selectedTemplate.description || "");
    setEditCategory(selectedTemplate.category);
    setEditPhases(JSON.parse(JSON.stringify(selectedTemplate.phases)));
    setSelectedTemplate(null);
    setIsCreating(true);
    toast.info("Modelo duplicado. Faça as alterações desejadas e salve.");
  };

  // Phase management
  const addPhase = () => {
    setEditPhases([
      ...editPhases,
      {
        name: `Fase ${editPhases.length + 1}`,
        description: "",
        order: editPhases.length + 1,
        activities: [],
      },
    ]);
  };

  const updatePhase = (index: number, updates: Partial<TemplatePhase>) => {
    const newPhases = [...editPhases];
    newPhases[index] = { ...newPhases[index], ...updates };
    setEditPhases(newPhases);
  };

  const removePhase = (index: number) => {
    const newPhases = editPhases.filter((_, i) => i !== index);
    // Reorder remaining phases
    newPhases.forEach((phase, i) => {
      phase.order = i + 1;
    });
    setEditPhases(newPhases);
  };

  const movePhase = (index: number, direction: "up" | "down") => {
    const newPhases = [...editPhases];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPhases.length) return;

    [newPhases[index], newPhases[targetIndex]] = [newPhases[targetIndex], newPhases[index]];
    newPhases.forEach((phase, i) => {
      phase.order = i + 1;
    });
    setEditPhases(newPhases);
  };

  // Activity management
  const addActivity = (phaseIndex: number) => {
    const newPhases = [...editPhases];
    newPhases[phaseIndex].activities.push({
      title: "",
      priority: "medium",
    });
    setEditPhases(newPhases);
  };

  const updateActivity = (phaseIndex: number, activityIndex: number, updates: Partial<TemplateActivity>) => {
    const newPhases = [...editPhases];
    newPhases[phaseIndex].activities[activityIndex] = {
      ...newPhases[phaseIndex].activities[activityIndex],
      ...updates,
    };
    setEditPhases(newPhases);
  };

  const removeActivity = (phaseIndex: number, activityIndex: number) => {
    const newPhases = [...editPhases];
    newPhases[phaseIndex].activities = newPhases[phaseIndex].activities.filter((_, i) => i !== activityIndex);
    setEditPhases(newPhases);
  };

  // Subtask management
  const addSubtask = (phaseIndex: number, activityIndex: number) => {
    const newPhases = [...editPhases];
    const activity = newPhases[phaseIndex].activities[activityIndex];
    if (!activity.subtasks) {
      activity.subtasks = [];
    }
    activity.subtasks.push({ title: "" });
    setEditPhases(newPhases);
  };

  const updateSubtask = (phaseIndex: number, activityIndex: number, subtaskIndex: number, title: string) => {
    const newPhases = [...editPhases];
    const activity = newPhases[phaseIndex].activities[activityIndex];
    if (activity.subtasks) {
      activity.subtasks[subtaskIndex].title = title;
    }
    setEditPhases(newPhases);
  };

  const removeSubtask = (phaseIndex: number, activityIndex: number, subtaskIndex: number) => {
    const newPhases = [...editPhases];
    const activity = newPhases[phaseIndex].activities[activityIndex];
    if (activity.subtasks) {
      activity.subtasks = activity.subtasks.filter((_, i) => i !== subtaskIndex);
    }
    setEditPhases(newPhases);
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORY_OPTIONS.find((c) => c.value === category)?.label || category;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gerenciar Modelos de Projeto
          </DialogTitle>
          <DialogDescription>
            Crie e edite modelos pré-programados com fases e atividades para seus projetos.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Template List */}
            <div className="space-y-3">
              <Button onClick={handleNewTemplate} className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Modelo
              </Button>
              <ScrollArea className="h-[400px] pr-2">
                <div className="space-y-2">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all hover:border-primary ${
                        selectedTemplate?.id === template.id && !isCreating ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardHeader className="p-3">
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        <Badge variant="outline" className="w-fit text-xs">
                          {getCategoryLabel(template.category)}
                        </Badge>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Editor */}
            <div className="md:col-span-2">
              {(selectedTemplate || isCreating) ? (
                <ScrollArea className="h-[450px] pr-4">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nome do Modelo *</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Ex: Estudo Clínico Completo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Descrição do modelo..."
                        rows={2}
                      />
                    </div>

                    {/* Phases */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Fases e Atividades</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addPhase}>
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar Fase
                        </Button>
                      </div>

                      <Accordion type="multiple" className="space-y-2">
                        {editPhases.map((phase, phaseIndex) => (
                          <AccordionItem
                            key={phaseIndex}
                            value={`phase-${phaseIndex}`}
                            className="border rounded-lg"
                          >
                            <AccordionTrigger className="px-3 hover:no-underline">
                              <div className="flex items-center gap-2 flex-1">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{phase.name || `Fase ${phaseIndex + 1}`}</span>
                                <Badge variant="secondary" className="text-xs ml-2">
                                  {phase.activities.length} atividades
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-3 pb-3">
                              <div className="space-y-3">
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => movePhase(phaseIndex, "up")}
                                    disabled={phaseIndex === 0}
                                  >
                                    <ChevronUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => movePhase(phaseIndex, "down")}
                                    disabled={phaseIndex === editPhases.length - 1}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                  <Input
                                    value={phase.name}
                                    onChange={(e) => updatePhase(phaseIndex, { name: e.target.value })}
                                    placeholder="Nome da fase"
                                    className="flex-1 h-8"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => removePhase(phaseIndex)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                <Input
                                  value={phase.description}
                                  onChange={(e) => updatePhase(phaseIndex, { description: e.target.value })}
                                  placeholder="Descrição da fase"
                                  className="h-8 text-sm"
                                />

                                {/* Activities */}
                                <div className="space-y-2 pl-4 border-l-2 border-muted">
                                  {phase.activities.map((activity, actIndex) => (
                                    <Collapsible key={actIndex} className="space-y-1">
                                      <div className="flex gap-2 items-center">
                                        <CollapsibleTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0"
                                          >
                                            <ChevronRight className="h-3 w-3 transition-transform duration-200 data-[state=open]:rotate-90" />
                                          </Button>
                                        </CollapsibleTrigger>
                                        <Input
                                          value={activity.title}
                                          onChange={(e) =>
                                            updateActivity(phaseIndex, actIndex, { title: e.target.value })
                                          }
                                          placeholder="Título da atividade"
                                          className="flex-1 h-7 text-sm"
                                        />
                                        <Select
                                          value={activity.priority}
                                          onValueChange={(v) =>
                                            updateActivity(phaseIndex, actIndex, { priority: v })
                                          }
                                        >
                                          <SelectTrigger className="w-24 h-7 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {PRIORITY_OPTIONS.map((opt) => (
                                              <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        {activity.subtasks && activity.subtasks.length > 0 && (
                                          <Badge variant="outline" className="text-xs shrink-0">
                                            <ListChecks className="h-3 w-3 mr-1" />
                                            {activity.subtasks.length}
                                          </Badge>
                                        )}
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                                          onClick={() => removeActivity(phaseIndex, actIndex)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <CollapsibleContent>
                                        <div className="ml-9 pl-3 border-l-2 border-muted space-y-1.5 py-2">
                                          {activity.subtasks?.map((subtask, subIndex) => (
                                            <div key={subIndex} className="flex gap-2 items-center">
                                              <Input
                                                value={subtask.title}
                                                onChange={(e) =>
                                                  updateSubtask(phaseIndex, actIndex, subIndex, e.target.value)
                                                }
                                                placeholder="Título da subtarefa"
                                                className="flex-1 h-6 text-xs"
                                              />
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                                                onClick={() => removeSubtask(phaseIndex, actIndex, subIndex)}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          ))}
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs"
                                            onClick={() => addSubtask(phaseIndex, actIndex)}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Adicionar Subtarefa
                                          </Button>
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => addActivity(phaseIndex)}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Adicionar Atividade
                                  </Button>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          "Salvar Modelo"
                        )}
                      </Button>
                      {!isCreating && selectedTemplate && (
                        <>
                          <Button variant="outline" onClick={handleDuplicate}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </Button>
                          <Button variant="destructive" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">Selecione um modelo para editar ou crie um novo</p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
