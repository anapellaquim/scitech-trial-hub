import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ScheduleTask, TaskRACI, Profile, Department, Stakeholder } from "@/types/schedule";
import { Plus, X, Users, Building2, Trash2, Edit2, Briefcase } from "lucide-react";

interface RACIMatrixProps {
  tasks: ScheduleTask[];
  raciAssignments: TaskRACI[];
  profiles: Profile[];
  projectId?: string;
  onRefresh: () => void;
}

const RACI_ROLES = [
  { value: "responsible", label: "R", fullLabel: "Responsável", color: "bg-blue-500" },
  { value: "accountable", label: "A", fullLabel: "Aprovador", color: "bg-purple-500" },
  { value: "consulted", label: "C", fullLabel: "Consultado", color: "bg-yellow-500" },
  { value: "informed", label: "I", fullLabel: "Informado", color: "bg-green-500" },
];

const COLOR_OPTIONS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", 
  "#ec4899", "#6366f1", "#14b8a6", "#84cc16", "#f97316"
];

export const RACIMatrix = ({ tasks, raciAssignments, profiles, projectId, onRefresh }: RACIMatrixProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [viewMode, setViewMode] = useState<"users" | "departments" | "stakeholders">("users");
  const [showDeptDialog, setShowDeptDialog] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: "", description: "", color: "#6366f1" });

  useEffect(() => {
    fetchDepartments();
    fetchStakeholders();
  }, [projectId]);

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("name");

    if (!error && data) {
      setDepartments(data);
    }
  };

  const fetchStakeholders = async () => {
    if (!projectId) { setStakeholders([]); return; }
    const { data, error } = await supabase
      .from("communication_stakeholders")
      .select("id, name, organization, stakeholder_type, project_id")
      .eq("project_id", projectId)
      .order("name");
    if (!error && data) setStakeholders(data as Stakeholder[]);
  };

  // Get unique users/departments that have RACI assignments
  const usersWithAssignments = profiles.filter(p =>
    raciAssignments.some(r => r.user_id === p.id)
  );

  const deptsWithAssignments = departments.filter(d =>
    raciAssignments.some(r => r.department_id === d.id)
  );

  // Display entities based on view mode
  const displayUsers = usersWithAssignments.length > 0 ? usersWithAssignments : profiles.slice(0, 5);
  const displayDepts = deptsWithAssignments.length > 0 ? deptsWithAssignments : departments;
  const stakeholdersWithAssignments = stakeholders.filter(s =>
    raciAssignments.some(r => r.stakeholder_id === s.id)
  );
  const displayStakeholders = stakeholdersWithAssignments.length > 0 ? stakeholdersWithAssignments : stakeholders;

  const getRaciForUserCell = (taskId: string, userId: string): TaskRACI[] => {
    return raciAssignments.filter(r => r.task_id === taskId && r.user_id === userId);
  };

  const getRaciForDeptCell = (taskId: string, deptId: string): TaskRACI[] => {
    return raciAssignments.filter(r => r.task_id === taskId && r.department_id === deptId);
  };

  const getRaciForStakeholderCell = (taskId: string, stakeholderId: string): TaskRACI[] => {
    return raciAssignments.filter(r => r.task_id === taskId && r.stakeholder_id === stakeholderId);
  };

  const handleAddRaciStakeholder = async (taskId: string, stakeholderId: string, role: string) => {
    setLoading(`${taskId}-${stakeholderId}`);
    try {
      const { error } = await supabase
        .from("task_raci")
        .insert({ task_id: taskId, stakeholder_id: stakeholderId, role });
      if (error) {
        if (error.code === "23505") {
          toast.error("Este papel já está atribuído para este stakeholder");
        } else throw error;
      } else {
        toast.success("Papel RACI adicionado");
        onRefresh();
      }
    } catch (error: any) {
      toast.error("Erro ao adicionar: " + error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleAddRaciUser = async (taskId: string, userId: string, role: string) => {
    setLoading(`${taskId}-${userId}`);
    try {
      const { error } = await supabase
        .from("task_raci")
        .insert({ task_id: taskId, user_id: userId, role });

      if (error) {
        if (error.code === "23505") {
          toast.error("Este papel já está atribuído para este usuário");
        } else {
          throw error;
        }
      } else {
        toast.success("Papel RACI adicionado");
        onRefresh();
      }
    } catch (error: any) {
      toast.error("Erro ao adicionar: " + error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleAddRaciDept = async (taskId: string, deptId: string, role: string) => {
    setLoading(`${taskId}-${deptId}`);
    try {
      const { error } = await supabase
        .from("task_raci")
        .insert({ task_id: taskId, department_id: deptId, role });

      if (error) {
        if (error.code === "23505") {
          toast.error("Este papel já está atribuído para este departamento");
        } else {
          throw error;
        }
      } else {
        toast.success("Papel RACI adicionado");
        onRefresh();
      }
    } catch (error: any) {
      toast.error("Erro ao adicionar: " + error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveRaci = async (raciId: string) => {
    setLoading(raciId);
    try {
      const { error } = await supabase
        .from("task_raci")
        .delete()
        .eq("id", raciId);

      if (error) throw error;
      toast.success("Papel RACI removido");
      onRefresh();
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleSaveDepartment = async () => {
    if (!deptForm.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      if (editingDept) {
        const { error } = await supabase
          .from("departments")
          .update(deptForm)
          .eq("id", editingDept.id);

        if (error) throw error;
        toast.success("Departamento atualizado");
      } else {
        const { error } = await supabase
          .from("departments")
          .insert(deptForm);

        if (error) throw error;
        toast.success("Departamento criado");
      }

      setShowDeptDialog(false);
      setEditingDept(null);
      setDeptForm({ name: "", description: "", color: "#6366f1" });
      fetchDepartments();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const handleDeleteDepartment = async (deptId: string) => {
    if (!confirm("Tem certeza que deseja excluir este departamento?")) return;

    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", deptId);

      if (error) throw error;
      toast.success("Departamento excluído");
      fetchDepartments();
      onRefresh();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const openEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({ name: dept.name, description: dept.description || "", color: dept.color });
    setShowDeptDialog(true);
  };

  const openNewDept = () => {
    setEditingDept(null);
    setDeptForm({ name: "", description: "", color: "#6366f1" });
    setShowDeptDialog(true);
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma tarefa encontrada. Crie tarefas para definir a matriz RACI.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend and View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-wrap gap-4 text-sm">
          {RACI_ROLES.map(role => (
            <div key={role.value} className="flex items-center gap-2">
              <Badge className={`${role.color} text-white`}>{role.label}</Badge>
              <span>{role.fullLabel}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "users" | "departments" | "stakeholders")}>
            <TabsList>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Usuários
              </TabsTrigger>
              <TabsTrigger value="departments" className="gap-2">
                <Building2 className="h-4 w-4" />
                Departamentos
              </TabsTrigger>
              <TabsTrigger value="stakeholders" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Stakeholders
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {viewMode === "departments" && (
            <Button variant="outline" size="sm" onClick={openNewDept}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Departamento
            </Button>
          )}
        </div>
      </div>

      {/* Matrix Table */}
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px] sticky left-0 bg-background z-10">Tarefa</TableHead>
              {viewMode === "users" ? (
                displayUsers.map(user => (
                  <TableHead key={user.id} className="text-center min-w-[120px]">
                    <div className="truncate">{user.full_name}</div>
                  </TableHead>
                ))
              ) : (
                displayDepts.map(dept => (
                  <TableHead key={dept.id} className="text-center min-w-[140px]">
                    <div className="flex flex-col items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: dept.color }}
                      />
                      <div className="truncate text-xs">{dept.name}</div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => openEditDept(dept)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive"
                          onClick={() => handleDeleteDepartment(dept.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableHead>
                ))
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map(task => (
              <TableRow key={task.id}>
                <TableCell className="font-medium sticky left-0 bg-background z-10">
                  <div className="truncate max-w-[200px]" title={task.title}>
                    {task.title}
                  </div>
                </TableCell>
                {viewMode === "users" ? (
                  displayUsers.map(user => {
                    const cellRaci = getRaciForUserCell(task.id, user.id);
                    const isLoading = loading === `${task.id}-${user.id}`;

                    return (
                      <TableCell key={user.id} className="text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {cellRaci.map(raci => {
                            const roleInfo = RACI_ROLES.find(r => r.value === raci.role);
                            return (
                              <Badge
                                key={raci.id}
                                className={`${roleInfo?.color || "bg-muted"} text-white cursor-pointer`}
                                onClick={() => handleRemoveRaci(raci.id)}
                                title={`${roleInfo?.fullLabel} - Clique para remover`}
                              >
                                {roleInfo?.label || raci.role[0].toUpperCase()}
                                <X className="h-3 w-3 ml-1" />
                              </Badge>
                            );
                          })}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={isLoading}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {RACI_ROLES.filter(
                                role => !cellRaci.some(r => r.role === role.value)
                              ).map(role => (
                                <DropdownMenuItem
                                  key={role.value}
                                  onClick={() => handleAddRaciUser(task.id, user.id, role.value)}
                                >
                                  <Badge className={`${role.color} text-white mr-2`}>
                                    {role.label}
                                  </Badge>
                                  {role.fullLabel}
                                </DropdownMenuItem>
                              ))}
                              {cellRaci.length === RACI_ROLES.length && (
                                <DropdownMenuItem disabled>
                                  Todos os papéis atribuídos
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    );
                  })
                ) : (
                  displayDepts.map(dept => {
                    const cellRaci = getRaciForDeptCell(task.id, dept.id);
                    const isLoading = loading === `${task.id}-${dept.id}`;

                    return (
                      <TableCell key={dept.id} className="text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {cellRaci.map(raci => {
                            const roleInfo = RACI_ROLES.find(r => r.value === raci.role);
                            return (
                              <Badge
                                key={raci.id}
                                className={`${roleInfo?.color || "bg-muted"} text-white cursor-pointer`}
                                onClick={() => handleRemoveRaci(raci.id)}
                                title={`${roleInfo?.fullLabel} - Clique para remover`}
                              >
                                {roleInfo?.label || raci.role[0].toUpperCase()}
                                <X className="h-3 w-3 ml-1" />
                              </Badge>
                            );
                          })}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={isLoading}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {RACI_ROLES.filter(
                                role => !cellRaci.some(r => r.role === role.value)
                              ).map(role => (
                                <DropdownMenuItem
                                  key={role.value}
                                  onClick={() => handleAddRaciDept(task.id, dept.id, role.value)}
                                >
                                  <Badge className={`${role.color} text-white mr-2`}>
                                    {role.label}
                                  </Badge>
                                  {role.fullLabel}
                                </DropdownMenuItem>
                              ))}
                              {cellRaci.length === RACI_ROLES.length && (
                                <DropdownMenuItem disabled>
                                  Todos os papéis atribuídos
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    );
                  })
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {viewMode === "departments" && displayDepts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum departamento cadastrado.</p>
          <Button variant="outline" className="mt-3" onClick={openNewDept}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Departamento
          </Button>
        </div>
      )}

      {/* Department Dialog */}
      <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDept ? "Editar Departamento" : "Novo Departamento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="dept-name">Nome *</Label>
              <Input
                id="dept-name"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                placeholder="Ex: Gerência de Projetos"
              />
            </div>

            <div>
              <Label htmlFor="dept-desc">Descrição</Label>
              <Input
                id="dept-desc"
                value={deptForm.description}
                onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                placeholder="Descrição do departamento"
              />
            </div>

            <div>
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      deptForm.color === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setDeptForm({ ...deptForm, color })}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeptDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDepartment}>
              {editingDept ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};