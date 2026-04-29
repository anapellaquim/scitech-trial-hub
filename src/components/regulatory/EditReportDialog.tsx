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

interface Report {
  id: string;
  project_id: string | null;
  site_id?: string | null;
  report_type: string;
  due_date: string;
  submitted_date: string | null;
  approval_date?: string | null;
  code?: string | null;
  status: string;
  notes: string | null;
  recurrence_type?: string | null;
  recurrence_end_date?: string | null;
}

interface EditReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: Report | null;
  projects: Project[];
  onSuccess: () => void;
}

const reportTypes = [
  "Relatório Anual de Segurança (DSUR)",
  "Relatório de Progresso",
  "Relatório Final",
  "Relatório de Evento Adverso",
  "Relatório de Desvio de Protocolo",
  "Relatório de Monitoramento",
  "Relatório Periódico (IND)",
  "Notificação de Alteração",
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

const recurrenceOptions = [
  { value: "none", label: "Sem recorrência" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
];

export default function EditReportDialog({
  open,
  onOpenChange,
  report,
  projects,
  onSuccess,
}: EditReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [formData, setFormData] = useState({
    project_id: "",
    site_id: "none",
    report_type: "",
    due_date: "",
    submitted_date: "",
    approval_date: "",
    code: "",
    status: "pending",
    notes: "",
    recurrence_type: "none",
    recurrence_end_date: "",
  });

  useEffect(() => {
    if (report && open) {
      setFormData({
        project_id: report.project_id || "",
        site_id: (report as any).site_id || "none",
        report_type: report.report_type,
        due_date: report.due_date || "",
        submitted_date: report.submitted_date || "",
        approval_date: (report as any).approval_date || "",
        code: (report as any).code || "",
        status: report.status,
        notes: report.notes || "",
        recurrence_type: report.recurrence_type || "none",
        recurrence_end_date: report.recurrence_end_date || "",
      });
    }
  }, [report, open]);

  useEffect(() => {
    if (!formData.project_id) { setSites([]); return; }
    supabase.from("study_sites").select("id, site_code, name").eq("project_id", formData.project_id).then(({ data }) => setSites(data || []));
  }, [formData.project_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !formData.project_id || !formData.report_type || !formData.due_date) {
      toast({
        title: "Erro",
        description: "Estudo, tipo de relatório e data limite são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("regulatory_reports")
        .update({
          project_id: formData.project_id,
          site_id: formData.site_id && formData.site_id !== "none" ? formData.site_id : null,
          report_type: formData.report_type,
          due_date: formData.due_date,
          submitted_date: formData.submitted_date || null,
          approval_date: formData.approval_date || null,
          code: formData.code || null,
          status: formData.status as "pending" | "submitted" | "under_review" | "approved" | "rejected" | "revision_required",
          notes: formData.notes || null,
          recurrence_type: formData.recurrence_type,
          recurrence_end_date: formData.recurrence_end_date || null,
        } as any)
        .eq("id", report.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Relatório atualizado com sucesso",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar relatório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!report) return;
    
    if (!confirm("Tem certeza que deseja excluir este relatório?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("regulatory_reports")
        .delete()
        .eq("id", report.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Relatório excluído com sucesso",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir relatório",
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
          <DialogTitle>Editar Relatório Regulatório</DialogTitle>
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
            <Label htmlFor="type">Tipo de Relatório *</Label>
            <Select
              value={formData.report_type}
              onValueChange={(value) => setFormData({ ...formData, report_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
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
              <Label htmlFor="due_date">Data Limite *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submitted_date">Data de Envio</Label>
              <Input
                id="submitted_date"
                type="date"
                value={formData.submitted_date}
                onChange={(e) => setFormData({ ...formData, submitted_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurrence">Recorrência</Label>
            <Select
              value={formData.recurrence_type}
              onValueChange={(value) => setFormData({ ...formData, recurrence_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a recorrência" />
              </SelectTrigger>
              <SelectContent>
                {recurrenceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.recurrence_type !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="recurrence_end_date">Data Final da Recorrência</Label>
              <Input
                id="recurrence_end_date"
                type="date"
                value={formData.recurrence_end_date}
                onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                min={formData.due_date}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para recorrência indefinida
              </p>
            </div>
          )}

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
