import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Project {
  id: string;
  title: string;
}

interface Site { id: string; site_code: string; name: string; }

interface Submission {
  id: string;
  project_id: string | null;
  site_id?: string | null;
  submission_type: string;
  planned_date: string | null;
  submission_date: string | null;
  approval_date?: string | null;
  code?: string | null;
  status: string;
  notes: string | null;
  compliance_response?: string | null;
}

interface EditSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: Submission | null;
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

const statusOptions = [
  { value: "pending", label: "Pendente" },
  { value: "submitted", label: "Submetido" },
  { value: "under_review", label: "Em Análise" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" },
  { value: "revision_required", label: "Revisão Necessária" },
];

export default function EditSubmissionDialog({
  open,
  onOpenChange,
  submission,
  projects,
  onSuccess,
}: EditSubmissionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [formData, setFormData] = useState({
    project_id: "",
    site_id: "none",
    submission_type: "",
    planned_date: "",
    submission_date: "",
    status: "pending",
    notes: "",
    compliance_response: "",
  });

  useEffect(() => {
    if (submission && open) {
      setFormData({
        project_id: submission.project_id || "",
        site_id: (submission as any).site_id || "none",
        submission_type: submission.submission_type,
        planned_date: submission.planned_date || "",
        submission_date: submission.submission_date || "",
        status: submission.status,
        notes: submission.notes || "",
        compliance_response: (submission as any).compliance_response || "",
      });
    }
  }, [submission, open]);

  useEffect(() => {
    if (!formData.project_id) { setSites([]); return; }
    supabase.from("study_sites").select("id, site_code, name").eq("project_id", formData.project_id).then(({ data }) => setSites(data || []));
  }, [formData.project_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission || !formData.project_id || !formData.submission_type) {
      toast({
        title: "Erro",
        description: "Estudo e tipo de submissão são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("regulatory_submissions")
        .update({
          project_id: formData.project_id,
          site_id: formData.site_id && formData.site_id !== "none" ? formData.site_id : null,
          submission_type: formData.submission_type,
          planned_date: formData.planned_date || null,
          submission_date: formData.submission_date || null,
          status: formData.status as "pending" | "submitted" | "under_review" | "approved" | "rejected" | "revision_required",
          notes: formData.notes || null,
          compliance_response: formData.compliance_response || null,
        } as any)
        .eq("id", submission.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Submissão atualizada com sucesso",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar submissão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!submission) return;
    
    if (!confirm("Tem certeza que deseja excluir esta submissão?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("regulatory_submissions")
        .delete()
        .eq("id", submission.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Submissão excluída com sucesso",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir submissão",
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
          <DialogTitle>Editar Submissão Regulatória</DialogTitle>
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
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="submission_date">Data de Submissão</Label>
              <Input
                id="submission_date"
                type="date"
                value={formData.submission_date}
                onChange={(e) => setFormData({ ...formData, submission_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Centro de Pesquisa</Label>
            <Select value={formData.site_id} onValueChange={v => setFormData({ ...formData, site_id: v })} disabled={!formData.project_id}>
              <SelectTrigger><SelectValue placeholder={formData.project_id ? "Opcional" : "Selecione um estudo primeiro"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Nenhum (estudo todo) —</SelectItem>
                {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.site_code} · {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
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

          <div className="space-y-2">
            <Label htmlFor="compliance_response">Atendimento de Exigência</Label>
            <Textarea
              id="compliance_response"
              value={formData.compliance_response}
              onChange={(e) => setFormData({ ...formData, compliance_response: e.target.value })}
              placeholder="Descreva exigências recebidas e como foram atendidas..."
              rows={3}
            />
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
      </DialogContent>
    </Dialog>
  );
}
