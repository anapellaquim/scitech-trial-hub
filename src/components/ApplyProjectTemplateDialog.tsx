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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FileText, CheckCircle2, Loader2, Calendar, Link2, ListChecks } from "lucide-react";
import { addDays, format } from "date-fns";

interface TemplateSubtask {
  title: string;
}

interface TemplatePhase {
  name: string;
  description: string;
  order: number;
  activities: Array<{
    title: string;
    priority: string;
    subtasks?: TemplateSubtask[];
  }>;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  phases: TemplatePhase[];
}

interface ApplyProjectTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onTemplateApplied: () => void;
}

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    clinical_trial: "Estudo Clínico",
    observational: "Observacional",
    phase_1: "Fase I",
    phase_2: "Fase II",
    phase_3: "Fase III",
    phase_4: "Fase IV",
  };
  return labels[category] || category;
};

const getPriorityBadge = (priority: string) => {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  };
  const labels: Record<string, string> = {
    high: "Alta",
    medium: "Média",
    low: "Baixa",
  };
  return (
    <Badge variant={variants[priority] || "secondary"} className="text-xs">
      {labels[priority] || priority}
    </Badge>
  );
};

export default function ApplyProjectTemplateDialog({
  open,
  onOpenChange,
  projectId,
  onTemplateApplied,
}: ApplyProjectTemplateDialogProps) {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [daysPerPhase, setDaysPerPhase] = useState(14);
  const [daysPerActivity, setDaysPerActivity] = useState(3);
  const [createDependencies, setCreateDependencies] = useState(true);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_templates")
      .select("*")
      .eq("is_active", true)
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

  const applyTemplate = async () => {
    if (!selectedTemplate || !projectId) return;

    setApplying(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Delete existing phases, activities and tasks for this project
      const { data: existingPhases } = await supabase
        .from("phases")
        .select("id")
        .eq("project_id", projectId);

      if (existingPhases && existingPhases.length > 0) {
        const phaseIds = existingPhases.map((p) => p.id);
        await supabase.from("activities").delete().in("phase_id", phaseIds);
        await supabase.from("phases").delete().eq("project_id", projectId);
      }

      // Delete existing tasks for this project
      await supabase.from("tasks").delete().eq("project_id", projectId);

      // Create phases from template and collect all tasks to create
      const tasksToCreate: Array<{
        project_id: string;
        title: string;
        description: string;
        priority: string;
        status: string;
        progress_percentage: number;
        created_by: string | undefined;
        planned_start_date: string | null;
        planned_end_date: string | null;
        subtasks?: TemplateSubtask[];
      }> = [];

      const baseDate = new Date(startDate);
      let currentPhaseStartDay = 0;

      // Sort phases by order
      const sortedPhases = [...selectedTemplate.phases].sort((a, b) => a.order - b.order);

      for (let phaseIndex = 0; phaseIndex < sortedPhases.length; phaseIndex++) {
        const phase = sortedPhases[phaseIndex];
        
        // Calculate phase dates
        const phaseStartDate = addDays(baseDate, currentPhaseStartDay);
        const phaseEndDate = addDays(phaseStartDate, daysPerPhase - 1);

        const { data: newPhase, error: phaseError } = await supabase
          .from("phases")
          .insert({
            project_id: projectId,
            name: phase.name,
            description: phase.description,
            phase_order: phase.order,
            status: phase.order === 1 ? "in_progress" : "pending",
            start_date: format(phaseStartDate, "yyyy-MM-dd"),
            end_date: format(phaseEndDate, "yyyy-MM-dd"),
          })
          .select()
          .single();

        if (phaseError) {
          console.error("Error creating phase:", phaseError);
          currentPhaseStartDay += daysPerPhase;
          continue;
        }

        // Create activities for this phase
        if (phase.activities && phase.activities.length > 0) {
          const activitiesData = phase.activities.map((activity) => ({
            project_id: projectId,
            phase_id: newPhase.id,
            title: activity.title,
            priority: activity.priority,
            status: "pending",
          }));

          const { error: activitiesError } = await supabase
            .from("activities")
            .insert(activitiesData);

          if (activitiesError) {
            console.error("Error creating activities:", activitiesError);
          }

          // Add activities as tasks for schedule visualization with calculated dates
          let activityDayOffset = 0;
          phase.activities.forEach((activity) => {
            const activityStartDate = addDays(phaseStartDate, activityDayOffset);
            const activityEndDate = addDays(activityStartDate, daysPerActivity - 1);
            
            tasksToCreate.push({
              project_id: projectId,
              title: `[${phase.name}] ${activity.title}`,
              description: `Fase: ${phase.name}`,
              priority: activity.priority || "medium",
              status: "pending",
              progress_percentage: 0,
              created_by: user?.id,
              planned_start_date: format(activityStartDate, "yyyy-MM-dd"),
              planned_end_date: format(activityEndDate, "yyyy-MM-dd"),
              subtasks: activity.subtasks,
            });
            
            activityDayOffset += daysPerActivity;
          });
        }

        // Move to next phase
        currentPhaseStartDay += daysPerPhase;
      }

      // Create all tasks in batch and get their IDs for dependencies
      let createdTaskIds: string[] = [];
      const taskSubtasksMap: Map<number, TemplateSubtask[]> = new Map();
      
      // Store subtasks reference before inserting tasks
      tasksToCreate.forEach((task, index) => {
        if (task.subtasks && task.subtasks.length > 0) {
          taskSubtasksMap.set(index, task.subtasks);
        }
      });

      if (tasksToCreate.length > 0) {
        // Remove subtasks from task data before inserting (not a db column)
        const tasksForInsert = tasksToCreate.map(({ subtasks, ...task }) => task);
        
        const { data: createdTasks, error: tasksError } = await supabase
          .from("tasks")
          .insert(tasksForInsert)
          .select("id");

        if (tasksError) {
          console.error("Error creating tasks:", tasksError);
          toast.error("Erro ao criar tarefas para visualização");
        } else if (createdTasks) {
          createdTaskIds = createdTasks.map(t => t.id);
          
          // Create subtasks for each task that has them
          const subtasksToCreate: Array<{
            task_id: string;
            title: string;
            item_order: number;
          }> = [];
          
          taskSubtasksMap.forEach((subtasks, taskIndex) => {
            const taskId = createdTaskIds[taskIndex];
            if (taskId) {
              subtasks.forEach((subtask, subIndex) => {
                if (subtask.title.trim()) {
                  subtasksToCreate.push({
                    task_id: taskId,
                    title: subtask.title,
                    item_order: subIndex,
                  });
                }
              });
            }
          });
          
          if (subtasksToCreate.length > 0) {
            const { error: subtasksError } = await supabase
              .from("task_subtasks")
              .insert(subtasksToCreate);
            
            if (subtasksError) {
              console.error("Error creating subtasks:", subtasksError);
            }
          }
        }
      }

      // Create dependencies between sequential tasks within each phase (if enabled)
      let dependenciesCreated = 0;
      if (createDependencies && createdTaskIds.length > 1) {
        const dependenciesToCreate: Array<{
          task_id: string;
          depends_on_task_id: string;
          dependency_type: string;
        }> = [];

        // Track task index per phase to create dependencies within phases
        let taskIndex = 0;
        for (const phase of sortedPhases) {
          const activityCount = phase.activities?.length || 0;
          
          // Create dependencies for tasks within this phase
          for (let i = 1; i < activityCount; i++) {
            const currentTaskIndex = taskIndex + i;
            const previousTaskIndex = taskIndex + i - 1;
            
            if (currentTaskIndex < createdTaskIds.length && previousTaskIndex < createdTaskIds.length) {
              dependenciesToCreate.push({
                task_id: createdTaskIds[currentTaskIndex],
                depends_on_task_id: createdTaskIds[previousTaskIndex],
                dependency_type: "finish_to_start",
              });
            }
          }
          
          // Also link first task of next phase to last task of current phase
          const lastTaskOfPhase = taskIndex + activityCount - 1;
          const firstTaskOfNextPhase = taskIndex + activityCount;
          
          if (lastTaskOfPhase >= 0 && firstTaskOfNextPhase < createdTaskIds.length && activityCount > 0) {
            dependenciesToCreate.push({
              task_id: createdTaskIds[firstTaskOfNextPhase],
              depends_on_task_id: createdTaskIds[lastTaskOfPhase],
              dependency_type: "finish_to_start",
            });
          }
          
          taskIndex += activityCount;
        }

        // Insert all dependencies
        if (dependenciesToCreate.length > 0) {
          const { error: depsError } = await supabase
            .from("task_dependencies")
            .insert(dependenciesToCreate);

          if (depsError) {
            console.error("Error creating dependencies:", depsError);
          } else {
            dependenciesCreated = dependenciesToCreate.length;
          }
        }
      }

      const depsMessage = createDependencies && dependenciesCreated > 0 
        ? ` e ${dependenciesCreated} dependências` 
        : "";
      toast.success(`Modelo "${selectedTemplate.name}" aplicado! ${tasksToCreate.length} tarefas${depsMessage} criadas.`);
      onTemplateApplied();
      onOpenChange(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Error applying template:", error);
      toast.error("Erro ao aplicar modelo");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Aplicar Modelo de Projeto
          </DialogTitle>
          <DialogDescription>
            Selecione um modelo pré-programado para criar automaticamente as fases e atividades do projeto.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Template List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      selectedTemplate?.id === template.id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        {selectedTemplate?.id === template.id && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <Badge variant="outline" className="w-fit">
                        {getCategoryLabel(template.category)}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {template.description}
                      </CardDescription>
                      <p className="text-xs text-muted-foreground mt-2">
                        {template.phases.length} fases •{" "}
                        {template.phases.reduce((sum, p) => sum + (p.activities?.length || 0), 0)} atividades
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {/* Template Preview */}
            <ScrollArea className="h-[400px] pr-4">
              {selectedTemplate ? (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground mb-3">
                    Estrutura do Modelo
                  </h4>
                  <Accordion type="multiple" className="space-y-2">
                    {selectedTemplate.phases.map((phase, index) => (
                      <AccordionItem key={index} value={`phase-${index}`} className="border rounded-lg px-3">
                        <AccordionTrigger className="text-sm hover:no-underline">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{phase.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {phase.activities?.length || 0} atividades
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-xs text-muted-foreground mb-2">{phase.description}</p>
                          <ul className="space-y-2">
                            {phase.activities?.map((activity, actIndex) => (
                              <li key={actIndex} className="text-xs py-1 border-b last:border-0">
                                <div className="flex items-center justify-between">
                                  <span>{activity.title}</span>
                                  <div className="flex items-center gap-2">
                                    {activity.subtasks && activity.subtasks.length > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        <ListChecks className="h-3 w-3 mr-1" />
                                        {activity.subtasks.length}
                                      </Badge>
                                    )}
                                    {getPriorityBadge(activity.priority)}
                                  </div>
                                </div>
                                {activity.subtasks && activity.subtasks.length > 0 && (
                                  <ul className="ml-4 mt-1 space-y-0.5 text-muted-foreground">
                                    {activity.subtasks.map((sub, subIdx) => (
                                      <li key={subIdx} className="flex items-center gap-1">
                                        <span className="text-[10px]">•</span>
                                        <span className="text-[10px]">{sub.title}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">Selecione um modelo para ver os detalhes</p>
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Date Configuration */}
        {selectedTemplate && !loading && (
          <div className="border-t pt-4 mt-2">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">Configuração de Datas</h4>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start-date" className="text-xs">Data de Início</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="days-per-phase" className="text-xs">Dias por Fase</Label>
                <Input
                  id="days-per-phase"
                  type="number"
                  min={1}
                  max={365}
                  value={daysPerPhase}
                  onChange={(e) => setDaysPerPhase(Number(e.target.value) || 14)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="days-per-activity" className="text-xs">Dias por Atividade</Label>
                <Input
                  id="days-per-activity"
                  type="number"
                  min={1}
                  max={30}
                  value={daysPerActivity}
                  onChange={(e) => setDaysPerActivity(Number(e.target.value) || 3)}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="create-deps" className="text-sm font-medium cursor-pointer">
                    Criar dependências automáticas
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Cada tarefa dependerá da anterior na mesma fase
                  </p>
                </div>
              </div>
              <Switch
                id="create-deps"
                checked={createDependencies}
                onCheckedChange={setCreateDependencies}
              />
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Duração total estimada: {selectedTemplate.phases.length * daysPerPhase} dias
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancelar
          </Button>
          <Button onClick={applyTemplate} disabled={!selectedTemplate || applying}>
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
              "Aplicar Modelo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
