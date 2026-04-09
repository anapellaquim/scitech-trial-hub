import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";


interface Profile {
  id: string;
  full_name: string;
}

interface Project {
  id: string;
  title: string;
}

interface Study {
  id: string;
  title: string;
}

interface UserRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile;
  projects: Project[];
  studies: Study[];
  onSuccess: () => void;
}

import { 
  ClipboardEdit, Stethoscope, Search, Database, Crown, 
  Settings, Heart, BarChart3, Shield, ShieldCheck,
  Briefcase, UserCheck, Scale, BadgeCheck, DollarSign, Eye
} from "lucide-react";

const roles = [
  // Administration
  { value: "admin", label: "Administrador", icon: ShieldCheck, description: "Acesso total ao sistema", category: "admin" },
  
  // Site Roles (S1, S2)
  { value: "site_coordinator", label: "Coordenador de Site (S1)", icon: ClipboardEdit, description: "Entrada de dados de pacientes, responde queries", category: "site" },
  { value: "investigator", label: "Investigador (S2)", icon: Stethoscope, description: "S1 + assinaturas eletrônicas, finalizar formulários", category: "site" },
  
  // Monitoring & Data Management (M1, D1, D2)
  { value: "cra_monitor", label: "CRA/Monitor (M1)", icon: Search, description: "Leitura, SDV, abrir/fechar queries", category: "monitoring" },
  { value: "data_manager", label: "Gerente de Dados (D1)", icon: Database, description: "Gestão de queries, exportar datasets", category: "data" },
  { value: "data_lead", label: "Líder de Dados (D2)", icon: Crown, description: "D1 + congelar dados, edit checks, audit trail", category: "data" },
  
  // Study Administration (A1)
  { value: "study_builder", label: "Study Builder (A1)", icon: Settings, description: "Configurar CRFs, provisionar usuários", category: "admin" },
  
  // Oversight Roles (O1, O2, O3)
  { value: "medical_monitor", label: "Monitor Médico (O1)", icon: Heart, description: "Leitura com cegamento, queries médicas", category: "oversight" },
  { value: "statistician", label: "Estatístico (O2)", icon: BarChart3, description: "Leitura, exportação validada", category: "oversight" },
  { value: "auditor", label: "Auditor (O3)", icon: Shield, description: "Leitura temporária, audit trail", category: "oversight" },
  
  // Legacy Roles (for backward compatibility)
  { value: "project_manager", label: "Gerente de Projeto", icon: Briefcase, description: "Gerencia projetos e estudos", category: "legacy" },
  { value: "monitor", label: "Monitor (legado)", icon: UserCheck, description: "Monitoria de centros e visitas", category: "legacy" },
  { value: "regulatory", label: "Regulatório", icon: Scale, description: "Assuntos regulatórios", category: "legacy" },
  { value: "quality", label: "Qualidade", icon: BadgeCheck, description: "Garantia de qualidade", category: "legacy" },
  { value: "finance", label: "Financeiro", icon: DollarSign, description: "Pagamentos e orçamentos", category: "legacy" },
  { value: "viewer", label: "Visualizador", icon: Eye, description: "Apenas visualização", category: "legacy" },
];

const UserRoleDialog = ({
  open,
  onOpenChange,
  user,
  projects,
  studies,
  onSuccess,
}: UserRoleDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    role: "",
    scope: "global",
    projectId: "",
    expiresAt: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.role) {
      toast.error("Selecione um papel");
      return;
    }

    setLoading(true);

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    const roleData: any = {
      user_id: user.id,
      role: formData.role,
      granted_by: currentUser?.id,
      notes: formData.notes || null,
    };

    if (formData.scope === "project" && formData.projectId) {
      roleData.project_id = formData.projectId;
    }
    if (formData.expiresAt) {
      roleData.expires_at = new Date(formData.expiresAt).toISOString();
    }

    const { error } = await supabase
      .from("user_roles")
      .insert(roleData);

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("Este usuário já possui este papel neste escopo");
      } else {
        toast.error("Erro ao atribuir papel: " + error.message);
      }
      return;
    }

    toast.success("Papel atribuído com sucesso");
    setFormData({
      role: "",
      scope: "global",
      projectId: "",
      expiresAt: "",
      notes: "",
    });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Atribuir Papel
          </DialogTitle>
          <DialogDescription>
            Atribuir um novo papel para <strong>{user.full_name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Papel *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um papel" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center gap-2">
                      <role.icon className="h-4 w-4" />
                      <div>
                        <span>{role.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({role.description})
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Escopo</Label>
            <Select
              value={formData.scope}
              onValueChange={(value) => setFormData({ 
                ...formData, 
                scope: value,
                projectId: ""
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global (todos os projetos)</SelectItem>
                <SelectItem value="project">Projeto específico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.scope === "project" && (
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => setFormData({ ...formData, projectId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Data de Expiração (opcional)</Label>
            <Input
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              min={new Date().toISOString().split("T")[0]}
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco para papel permanente
            </p>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Motivo da atribuição do papel..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Atribuir Papel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserRoleDialog;
