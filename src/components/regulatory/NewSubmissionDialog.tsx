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
  const [sites, setSites] = useState<Site[]>([]);
  const [formData, setFormData] = useState({
    project_id: "",
    site_id: "none",
    submission_type: "",
    planned_date: "",
    approval_date: "",
    code: "",
    notes: "",
    compliance_response: "",
  });

  useEffect(() => {
    if (!formData.project_id) { setSites([]); return; }
    supabase.from("study_sites").select("id, site_code, name").eq("project_id", formData.project_id).then(({ data }) => setSites(data || []));
  }, [formData.project_id]);

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
        site_id: formData.site_id && formData.site_id !== "none" ? formData.site_id : null,
        submission_type: formData.submission_type,
        planned_date: formData.planned_date || null,
        approval_date: formData.approval_date || null,
        code: formData.code || null,
        notes: formData.notes || null,
        compliance_response: formData.compliance_response || null,
        status: "pending",
      } as any);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Submissão criada com sucesso",
      });
      onOpenChange(false);
      setFormData({ project_id: "", site_id: "none", submission_type: "", planned_date: "", approval_date: "", code: "", notes: "", compliance_response: "" });
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
            <Label htmlFor="code">Codificação da Submissão / Emenda</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="Ex.: SUB-2026-001 ou EMD-2026-002"
            />
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
              <Label htmlFor="approval_date">Data de Aprovação</Label>
              <Input
                id="approval_date"
                type="date"
                value={formData.approval_date}
                onChange={(e) => setFormData({ ...formData, approval_date: e.target.value })}
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
