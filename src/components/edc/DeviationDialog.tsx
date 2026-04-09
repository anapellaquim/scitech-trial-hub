import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ProtocolDeviation {
  id: string;
  project_id: string;
  participant_id: string | null;
  research_center: string | null;
  deviation_type: string;
  category: string | null;
  description: string;
  deviation_date: string;
  discovered_date: string | null;
  impact_assessment: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  status: string;
}

interface Project {
  id: string;
  title: string;
}

interface Participant {
  id: string;
  participant_code: string;
  research_center: string | null;
}

interface DeviationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviation: ProtocolDeviation | null;
  onSuccess: () => void;
}

export function DeviationDialog({
  open,
  onOpenChange,
  deviation,
  onSuccess,
}: DeviationDialogProps) {
  const { t } = useTranslation(["edc"]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [formData, setFormData] = useState({
    project_id: "",
    participant_id: "",
    research_center: "",
    deviation_type: "procedure",
    category: "minor",
    description: "",
    deviation_date: "",
    discovered_date: "",
    impact_assessment: "",
    corrective_action: "",
    preventive_action: "",
    status: "open",
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (formData.project_id) {
      fetchParticipants(formData.project_id);
    }
  }, [formData.project_id]);

  useEffect(() => {
    if (deviation) {
      setFormData({
        project_id: deviation.project_id || "",
        participant_id: deviation.participant_id || "",
        research_center: deviation.research_center || "",
        deviation_type: deviation.deviation_type,
        category: deviation.category || "minor",
        description: deviation.description,
        deviation_date: deviation.deviation_date,
        discovered_date: deviation.discovered_date || "",
        impact_assessment: deviation.impact_assessment || "",
        corrective_action: deviation.corrective_action || "",
        preventive_action: deviation.preventive_action || "",
        status: deviation.status,
      });
    } else {
      setFormData({
        project_id: "",
        participant_id: "",
        research_center: "",
        deviation_type: "procedure",
        category: "minor",
        description: "",
        deviation_date: new Date().toISOString().split("T")[0],
        discovered_date: "",
        impact_assessment: "",
        corrective_action: "",
        preventive_action: "",
        status: "open",
      });
    }
  }, [deviation, open]);

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("id, title").order("title");
    if (data) setProjects(data);
  };

  const fetchParticipants = async (projectId: string) => {
    const { data } = await supabase
      .from("participants")
      .select("id, participant_code, research_center")
      .eq("project_id", projectId)
      .order("participant_code");
    if (data) setParticipants(data);
  };

  const handleParticipantChange = (participantId: string) => {
    const participant = participants.find((p) => p.id === participantId);
    setFormData({
      ...formData,
      participant_id: participantId,
      research_center: participant?.research_center || formData.research_center,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.project_id || !formData.description || !formData.deviation_date) {
      toast.error(t("deviations.requiredFields", "Preencha os campos obrigatórios"));
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      const payload = {
        project_id: formData.project_id,
        participant_id: formData.participant_id || null,
        research_center: formData.research_center || null,
        deviation_type: formData.deviation_type,
        category: formData.category || null,
        description: formData.description,
        deviation_date: formData.deviation_date,
        discovered_date: formData.discovered_date || null,
        impact_assessment: formData.impact_assessment || null,
        corrective_action: formData.corrective_action || null,
        preventive_action: formData.preventive_action || null,
        status: formData.status,
      };

      if (deviation) {
        const { error } = await supabase
          .from("protocol_deviations")
          .update(payload)
          .eq("id", deviation.id);

        if (error) throw error;
        toast.success(t("deviations.updateSuccess", "Desvio atualizado com sucesso"));
      } else {
        const { error } = await supabase.from("protocol_deviations").insert({
          ...payload,
          created_by: user.user?.id,
        });

        if (error) throw error;
        toast.success(t("deviations.createSuccess", "Desvio criado com sucesso"));
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving deviation:", error);
      toast.error(t("deviations.saveError", "Erro ao salvar desvio"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {deviation 
              ? t("deviations.editDeviation", "Editar Desvio de Protocolo") 
              : t("deviations.newDeviation", "Novo Desvio de Protocolo")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("deviations.project", "Projeto")} *</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("deviations.selectProject", "Selecione um projeto")} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("deviations.participant", "Participante")}</Label>
              <Select
                value={formData.participant_id}
                onValueChange={handleParticipantChange}
                disabled={!formData.project_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("deviations.selectParticipant", "Selecione")} />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.participant_code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("deviations.type", "Tipo")} *</Label>
              <Select
                value={formData.deviation_type}
                onValueChange={(value) => setFormData({ ...formData, deviation_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inclusion_criteria">Critério de Inclusão</SelectItem>
                  <SelectItem value="exclusion_criteria">Critério de Exclusão</SelectItem>
                  <SelectItem value="procedure">Procedimento</SelectItem>
                  <SelectItem value="timing">Timing</SelectItem>
                  <SelectItem value="dosing">Dose</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("deviations.categoryLabel", "Categoria")}</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="major">Maior</SelectItem>
                  <SelectItem value="minor">Menor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("deviations.center", "Centro")}</Label>
              <Input
                value={formData.research_center}
                onChange={(e) => setFormData({ ...formData, research_center: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("deviations.description", "Descrição")} *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("deviations.deviationDate", "Data do Desvio")} *</Label>
              <Input
                type="date"
                value={formData.deviation_date}
                onChange={(e) => setFormData({ ...formData, deviation_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("deviations.discoveredDate", "Data de Descoberta")}</Label>
              <Input
                type="date"
                value={formData.discovered_date}
                onChange={(e) => setFormData({ ...formData, discovered_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("deviations.impactAssessment", "Avaliação de Impacto")}</Label>
            <Textarea
              value={formData.impact_assessment}
              onChange={(e) => setFormData({ ...formData, impact_assessment: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("deviations.correctiveAction", "Ação Corretiva")}</Label>
            <Textarea
              value={formData.corrective_action}
              onChange={(e) => setFormData({ ...formData, corrective_action: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("deviations.preventiveAction", "Ação Preventiva")}</Label>
            <Textarea
              value={formData.preventive_action}
              onChange={(e) => setFormData({ ...formData, preventive_action: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("deviations.status", "Status")}</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="under_review">Em Revisão</SelectItem>
                <SelectItem value="closed">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common:cancel", "Cancelar")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("common:saving", "Salvando...") : t("common:save", "Salvar")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
