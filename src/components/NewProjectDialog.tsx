import { useState } from "react";
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
  DialogTrigger,
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

const centerSchema = z.object({
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
  protocol_number: z.string().optional(),
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
  therapeutic_area: z.string().optional(),
  phase: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.string()
    .refine((val) => !val || !isNaN(Number(val)), "Deve ser um número válido")
    .optional(),
  target_enrollment: z.string()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Deve ser um número positivo")
    .optional(),
  number_of_centers: z.string()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Deve ser um número positivo")
    .optional(),
  cost_center: z.string().optional(),
  value_class: z.string().optional(),
  centers: z.array(centerSchema).optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface NewProjectDialogProps {
  onProjectCreated: () => void;
}

const NewProjectDialog = ({ onProjectCreated }: NewProjectDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: "",
      protocol_number: "",
      description: "",
      status: "planning",
      sponsor: "",
      principal_investigator: "",
      therapeutic_area: "",
      phase: "",
      start_date: "",
      end_date: "",
      budget: "",
      target_enrollment: "",
      number_of_centers: "",
      cost_center: "",
      value_class: "",
      centers: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "centers",
  });

  const DEFAULT_PHASES = [
    { name: "Planejamento", description: "Definição de protocolos, aprovações regulatórias e preparação do estudo" },
    { name: "Recrutamento", description: "Seleção e inclusão de participantes no estudo" },
    { name: "Follow-up", description: "Acompanhamento dos participantes durante o período do estudo" },
    { name: "Análise de Dados", description: "Coleta, processamento e análise estatística dos dados" },
    { name: "Finalização", description: "Elaboração de relatórios e documentação final" },
    { name: "Encerramento", description: "Arquivamento e fechamento formal do estudo" },
  ];

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

  const onSubmit = async (values: ProjectFormValues) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const projectData = {
        title: values.title,
        protocol_number: values.protocol_number || null,
        description: values.description || null,
        status: values.status,
        sponsor: values.sponsor || null,
        principal_investigator: values.principal_investigator || null,
        therapeutic_area: values.therapeutic_area || null,
        phase: values.phase || null,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        budget: values.budget ? Number(values.budget) : null,
        target_enrollment: values.target_enrollment ? Number(values.target_enrollment) : null,
        cost_center: values.cost_center || null,
        value_class: values.value_class || null,
        created_by: user.id,
      };

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert(projectData)
        .select()
        .single();

      if (projectError) throw projectError;

      // Create default phases for the project
      const phasesData = DEFAULT_PHASES.map((phase, index) => ({
        project_id: project.id,
        name: phase.name,
        description: phase.description,
        phase_order: index + 1,
        status: index === 0 ? "in_progress" : "pending",
      }));

      const { error: phasesError } = await supabase
        .from("phases")
        .insert(phasesData);

      if (phasesError) {
        console.error("Error creating phases:", phasesError);
      }

      // Create research centers if any
      if (values.centers && values.centers.length > 0) {
        const centersData = values.centers.map((center) => ({
          project_id: project.id,
          code: center.code,
          name: center.name || null,
          pi_name: center.pi_name || null,
          pi_email: center.pi_email || null,
          pi_phone: center.pi_phone || null,
          coordinator_name: center.coordinator_name || null,
          coordinator_email: center.coordinator_email || null,
          coordinator_phone: center.coordinator_phone || null,
        }));

        const { error: centersError } = await supabase
          .from("research_centers")
          .insert(centersData);

        if (centersError) {
          console.error("Error creating centers:", centersError);
          toast.warning("Estudo criado, mas houve erro ao criar alguns centros");
        } else {
          toast.success("Estudo e centros criados com sucesso!");
        }
      } else {
        toast.success("Estudo criado com sucesso!");
      }

      form.reset();
      setOpen(false);
      onProjectCreated();
    } catch (error: any) {
      console.error("Error creating study:", error);
      toast.error(error.message || "Erro ao criar estudo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Estudo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Estudo Clínico</DialogTitle>
          <DialogDescription>
            Preencha as informações do estudo clínico. Campos marcados com * são obrigatórios.
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
              name="protocol_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do Protocolo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: PROT-2024-001" {...field} />
                  </FormControl>
                  <FormDescription>
                    Identificador único do protocolo do estudo
                  </FormDescription>
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
                  <FormDescription>
                    Resumo executivo do projeto e seus objetivos principais
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Inicial *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <FormDescription>
                      Participantes esperados
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="number_of_centers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Centros</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Ex: 5" 
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Total de centros previstos
                    </FormDescription>
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

              <FormField
                control={form.control}
                name="therapeutic_area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área Terapêutica</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Oncologia, Cardiologia..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fase do Estudo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a fase" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="I">Fase I</SelectItem>
                        <SelectItem value="II">Fase II</SelectItem>
                        <SelectItem value="III">Fase III</SelectItem>
                        <SelectItem value="IV">Fase IV</SelectItem>
                        <SelectItem value="observacional">Observacional</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <FormDescription>
                    Orçamento total aprovado para o estudo em reais
                  </FormDescription>
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
                  Nenhum centro cadastrado. Clique em "Adicionar Centro" para começar.
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
                        onClick={() => remove(index)}
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
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar Projeto"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectDialog;
