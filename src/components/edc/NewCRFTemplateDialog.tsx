import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Project {
  id: string;
  title: string;
}

interface NewCRFTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  projects: Project[];
}

const NewCRFTemplateDialog = ({
  open,
  onOpenChange,
  onSuccess,
  projects,
}: NewCRFTemplateDialogProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    project_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nome do template é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data, error } = await supabase
        .from("crf_templates")
        .insert({
          name: formData.name.trim(),
          project_id: formData.project_id || null,
          created_by: user.user.id,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Template criado com sucesso");
      onOpenChange(false);
      setFormData({ name: "", project_id: "" });
      onSuccess();
      
      // Navigate to designer
      if (data) {
        navigate(`/edc/designer/${data.id}`);
      }
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Erro ao criar template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Template de CRF</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Template *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Formulário de Triagem"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Projeto (opcional)</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) =>
                setFormData({ ...formData, project_id: value })
              }
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar e Editar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewCRFTemplateDialog;
