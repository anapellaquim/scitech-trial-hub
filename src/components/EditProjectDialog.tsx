import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Trash2, Building2 } from "lucide-react";
import YearlyBudgetManager from "./YearlyBudgetManager";

const centerSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, "Código do centro é obrigatório"),
  name: z.string().optional(),
  pi_name: z.string().optional(),
  pi_email: z.string().email("Email inválido").optional().or(z.literal("")),
  pi_phone: z.string().optional(),
  coordinator_name: z.string().optional(),
  coordinator_email: z.string().email("Email inválido").optional().or(z.literal("")),
  coordinator_phone: z.string().optional(),
});

const projectFormSchema = z.object({
  title: z.string()
    .min(3, "Título deve ter no mínimo 3 caracteres")
    .max(200, "Título deve ter no máximo 200 caracteres"),
  description: z.string()
    .max(1000, "Descrição deve ter no máximo 1000 caracteres")
    .optional(),
  status: z.enum(["planning", "active", "on_hold", "completed"]),
  sponsor: z.string()
    .max(200, "Patrocinador deve ter no máximo 200 caracteres")
    .optional(),
  principal_investigator: z.string()
    .max(200, "Investigador principal deve ter no máximo 200 caracteres")
    .optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.string()
    .refine((val) => !val || !isNaN(Number(val)), "Deve ser um número válido")
    .optional(),
  target_enrollment: z.string()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Deve ser um número positivo")
    .optional(),
  cost_center: z.string().optional(),
  value_class: z.string().optional(),
  centers: z.array(centerSchema).optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  sponsor: string | null;
  principal_investigator: string | null;
  start_date: string | null;
  end_date: string | null;
  target_enrollment: number | null;
  budget: number | null;
  cost_center: string | null;
  value_class: string | null;
}

interface EditProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated: () => void;
}

const EditProjectDialog = ({ project, open, onOpenChange, onProjectUpdated }: EditProjectDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [centersToDelete, setCentersToDelete] = useState<string[]>([]);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "planning",
      sponsor: "",
      principal_investigator: "",
      start_date: "",
      end_date: "",
      budget: "",
      target_enrollment: "",
      cost_center: "",
      value_class: "",
      centers: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "centers",
  });

  useEffect(() => {
    if (project && open) {
      loadProjectData();
    }
  }, [project, open]);

  const loadProjectData = async () => {
    if (!project) return;

    // Load research centers
    const { data: centers } = await supabase
      .from("research_centers")
      .select("*")
      .eq("project_id", project.id);

    form.reset({
      title: project.title,
      description: project.description || "",
      status: project.status as "planning" | "active" | "on_hold" | "completed",
      sponsor: project.sponsor || "",
      principal_investigator: project.principal_investigator || "",
      start_date: project.start_date || "",
      end_date: project.end_date || "",
      budget: project.budget?.toString() || "",
      target_enrollment: project.target_enrollment?.toString() || "",
      cost_center: project.cost_center || "",
      value_class: project.value_class || "",
      centers: centers?.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name || "",
        pi_name: c.pi_name || "",
        pi_email: c.pi_email || "",
        pi_phone: c.pi_phone || "",
        coordinator_name: c.coordinator_name || "",
        coordinator_email: c.coordinator_email || "",
        coordinator_phone: c.coordinator_phone || "",
      })) || [],
    });
    setCentersToDelete([]);
  };

  const addCenter = () => {
    append({
      code: "",
      name: "",
      pi_name: "",
      pi_email: "",
      pi_phone: "",
      coordinator_name: "",
      coordinator_email: "",
      coordinator_phone: "",
    });
  };

  const handleRemoveCenter = (index: number) => {
    const center = fields[index];
    if (center.id) {
      setCentersToDelete(prev => [...prev, center.id!]);
    }
    remove(index);
  };

  const onSubmit = async (values: ProjectFormValues) => {
    if (!project) return;
    
    setLoading(true);
    try {
      // Update project
      const { error: projectError } = await supabase
        .from("projects")
        .update({
          title: values.title,
          description: values.description || null,
          status: values.status,
          sponsor: values.sponsor || null,
          principal_investigator: values.principal_investigator || null,
          start_date: values.start_date || null,
          end_date: values.end_date || null,
          budget: values.budget ? Number(values.budget) : null,
          target_enrollment: values.target_enrollment ? Number(values.target_enrollment) : null,
          cost_center: values.cost_center || null,
          value_class: values.value_class || null,
        })
        .eq("id", project.id);

      if (projectError) throw projectError;

      // Delete removed centers
      if (centersToDelete.length > 0) {
        await supabase
          .from("research_centers")
          .delete()
          .in("id", centersToDelete);
      }

      // Update or insert centers
      if (values.centers && values.centers.length > 0) {
        for (const center of values.centers) {
          if (center.id) {
            // Update existing center
            await supabase
              .from("research_centers")
              .update({
                code: center.code,
                name: center.name || null,
                pi_name: center.pi_name || null,
                pi_email: center.pi_email || null,
                pi_phone: center.pi_phone || null,
                coordinator_name: center.coordinator_name || null,
                coordinator_email: center.coordinator_email || null,
                coordinator_phone: center.coordinator_phone || null,
              })
              .eq("id", center.id);
          } else {
            // Insert new center
            await supabase
              .from("research_centers")
              .insert({
                project_id: project.id,
                code: center.code,
                name: center.name || null,
                pi_name: center.pi_name || null,
                pi_email: center.pi_email || null,
                pi_phone: center.pi_phone || null,
                coordinator_name: center.coordinator_name || null,
                coordinator_email: center.coordinator_email || null,
                coordinator_phone: center.coordinator_phone || null,
              });
          }
        }
      }

      toast.success("Estudo atualizado com sucesso!");
      onOpenChange(false);
      onProjectUpdated();
    } catch (error: any) {
      console.error("Error updating study:", error);
      toast.error(error.message || "Erro ao atualizar estudo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Estudo</DialogTitle>
          <DialogDescription>
            Atualize as informações do estudo clínico.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Estudo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Estudo Fase III - Tratamento Oncológico" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva os objetivos e detalhes do estudo clínico..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planning">Planejamento</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="on_hold">Em Pausa</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_enrollment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta de Recrutamento</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Ex: 300" 
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="sponsor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patrocinador</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da instituição ou empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="principal_investigator"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investigador Principal</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr(a). Nome do pesquisador" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Término Prevista</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orçamento (R$)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ex: 1500000.00" 
                      step="0.01"
                      min="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="cost_center"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro de Custo (CC)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: CC-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value_class"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classe de Valor (CV)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: CV-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            <Separator />

            {/* Yearly Budget Section */}
            {project && (
              <YearlyBudgetManager projectId={project.id} />
            )}

            <Separator />

            {/* Research Centers Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Centros de Pesquisa</h3>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addCenter}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Centro
                </Button>
              </div>

              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum centro cadastrado.
                </p>
              )}

              {fields.map((field, index) => (
                <Card key={field.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Centro {index + 1}</CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCenter(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`centers.${index}.code`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código do Centro *</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: BR-001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`centers.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Centro</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Hospital das Clínicas" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator className="my-2" />
                    <p className="text-sm font-medium text-muted-foreground">Investigador Principal do Centro</p>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name={`centers.${index}.pi_name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do PI</FormLabel>
                            <FormControl>
                              <Input placeholder="Dr(a). Nome" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`centers.${index}.pi_email`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email do PI</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="pi@hospital.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`centers.${index}.pi_phone`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone do PI</FormLabel>
                            <FormControl>
                              <Input placeholder="(11) 99999-9999" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator className="my-2" />
                    <p className="text-sm font-medium text-muted-foreground">Coordenador(a) do Centro</p>

                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name={`centers.${index}.coordinator_name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Coordenador</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome completo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`centers.${index}.coordinator_email`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email do Coordenador</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="coord@hospital.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`centers.${index}.coordinator_phone`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone do Coordenador</FormLabel>
                            <FormControl>
                              <Input placeholder="(11) 99999-9999" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProjectDialog;
