import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Site { id: string; site_code: string; name: string; }

interface Project {
  id: string;
  title: string;
}

interface NewSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onSuccess: () => void;
}

const submissionTypes = [
  "Submissão Inicial ANVISA",
  "Emenda ao Protocolo",
  "Termo de Consentimento",
  "Brochura do Investigador",
  "Relatório de Segurança",
  "Notificação de SAE",
  "Encerramento de Estudo",
  "Parecer CEP",
  "Parecer CONEP",
  "Outro",
];

export default function NewSubmissionDialog({
  open,
  onOpenChange,
  projects,
  onSuccess,
}: NewSubmissionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project_id: "",
    submission_type: "",
    planned_date: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || !formData.submission_type) {
      toast({
        title: "Erro",
        description: "Estudo e tipo de submissão são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("regulatory_submissions").insert({
        project_id: formData.project_id,
        submission_type: formData.submission_type,
        planned_date: formData.planned_date || null,
        notes: formData.notes || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Submissão criada com sucesso",
      });
      onOpenChange(false);
      setFormData({ project_id: "", submission_type: "", planned_date: "", notes: "" });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao criar submissão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Submissão Regulatória</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project">Estudo *</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o estudo" />
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

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Submissão *</Label>
            <Select
              value={formData.submission_type}
              onValueChange={(value) => setFormData({ ...formData, submission_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {submissionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="planned_date">Data Planejada</Label>
            <Input
              id="planned_date"
              type="date"
              value={formData.planned_date}
              onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Submissão"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
