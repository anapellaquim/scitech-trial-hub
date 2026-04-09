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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface SafetyEvent {
  id: string;
  project_id: string;
  participant_id: string | null;
  research_center: string | null;
  event_type: string;
  description: string;
  onset_date: string | null;
  resolution_date: string | null;
  severity: string | null;
  causality: string | null;
  outcome: string | null;
  status: string;
  reported_to_irb: boolean;
  reported_to_sponsor: boolean;
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

interface SafetyEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: SafetyEvent | null;
  onSuccess: () => void;
}

export function SafetyEventDialog({
  open,
  onOpenChange,
  event,
  onSuccess,
}: SafetyEventDialogProps) {
  const { t } = useTranslation(["edc"]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [formData, setFormData] = useState({
    project_id: "",
    participant_id: "",
    research_center: "",
    event_type: "AE",
    description: "",
    onset_date: "",
    resolution_date: "",
    severity: "",
    causality: "",
    outcome: "",
    status: "open",
    reported_to_irb: false,
    reported_to_sponsor: false,
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
    if (event) {
      setFormData({
        project_id: event.project_id || "",
        participant_id: event.participant_id || "",
        research_center: event.research_center || "",
        event_type: event.event_type,
        description: event.description,
        onset_date: event.onset_date || "",
        resolution_date: event.resolution_date || "",
        severity: event.severity || "",
        causality: event.causality || "",
        outcome: event.outcome || "",
        status: event.status,
        reported_to_irb: event.reported_to_irb,
        reported_to_sponsor: event.reported_to_sponsor,
      });
    } else {
      setFormData({
        project_id: "",
        participant_id: "",
        research_center: "",
        event_type: "AE",
        description: "",
        onset_date: "",
        resolution_date: "",
        severity: "",
        causality: "",
        outcome: "",
        status: "open",
        reported_to_irb: false,
        reported_to_sponsor: false,
      });
    }
  }, [event, open]);

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

    if (!formData.project_id || !formData.description || !formData.event_type) {
      toast.error(t("safety.requiredFields", "Preencha os campos obrigatórios"));
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      const payload = {
        project_id: formData.project_id,
        participant_id: formData.participant_id || null,
        research_center: formData.research_center || null,
        event_type: formData.event_type,
        description: formData.description,
        onset_date: formData.onset_date || null,
        resolution_date: formData.resolution_date || null,
        severity: formData.severity || null,
        causality: formData.causality || null,
        outcome: formData.outcome || null,
        status: formData.status,
        reported_to_irb: formData.reported_to_irb,
        reported_to_sponsor: formData.reported_to_sponsor,
        reported_at: (formData.reported_to_irb || formData.reported_to_sponsor) 
          ? new Date().toISOString() 
          : null,
      };

      if (event) {
        const { error } = await supabase
          .from("safety_events")
          .update(payload)
          .eq("id", event.id);

        if (error) throw error;
        toast.success(t("safety.updateSuccess", "Evento atualizado com sucesso"));
      } else {
        const { error } = await supabase.from("safety_events").insert({
          ...payload,
          created_by: user.user?.id,
        });

        if (error) throw error;
        toast.success(t("safety.createSuccess", "Evento criado com sucesso"));
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving safety event:", error);
      toast.error(t("safety.saveError", "Erro ao salvar evento"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event 
              ? t("safety.editEvent", "Editar Evento de Segurança") 
              : t("safety.newEvent", "Novo Evento de Segurança")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("safety.project", "Projeto")} *</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("safety.selectProject", "Selecione um projeto")} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("safety.participant", "Participante")}</Label>
              <Select
                value={formData.participant_id}
                onValueChange={handleParticipantChange}
                disabled={!formData.project_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("safety.selectParticipant", "Selecione")} />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.participant_code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("safety.eventType", "Tipo de Evento")} *</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData({ ...formData, event_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AE">AE - Evento Adverso</SelectItem>
                  <SelectItem value="SAE">SAE - Evento Adverso Sério</SelectItem>
                  <SelectItem value="SUSAR">SUSAR</SelectItem>
                  <SelectItem value="pregnancy">Gravidez</SelectItem>
                  <SelectItem value="death">Óbito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("safety.center", "Centro")}</Label>
              <Input
                value={formData.research_center}
                onChange={(e) => setFormData({ ...formData, research_center: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("safety.description", "Descrição")} *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("safety.onsetDate", "Data de Início")}</Label>
              <Input
                type="date"
                value={formData.onset_date}
                onChange={(e) => setFormData({ ...formData, onset_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("safety.resolutionDate", "Data de Resolução")}</Label>
              <Input
                type="date"
                value={formData.resolution_date}
                onChange={(e) => setFormData({ ...formData, resolution_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("safety.severity", "Severidade")}</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData({ ...formData, severity: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("safety.select", "Selecione")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Leve</SelectItem>
                  <SelectItem value="moderate">Moderado</SelectItem>
                  <SelectItem value="severe">Severo</SelectItem>
                  <SelectItem value="life_threatening">Risco de Vida</SelectItem>
                  <SelectItem value="death">Óbito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("safety.causality", "Causalidade")}</Label>
              <Select
                value={formData.causality}
                onValueChange={(value) => setFormData({ ...formData, causality: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("safety.select", "Selecione")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_related">Não Relacionado</SelectItem>
                  <SelectItem value="unlikely">Improvável</SelectItem>
                  <SelectItem value="possible">Possível</SelectItem>
                  <SelectItem value="probable">Provável</SelectItem>
                  <SelectItem value="definite">Definitivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("safety.outcome", "Desfecho")}</Label>
              <Select
                value={formData.outcome}
                onValueChange={(value) => setFormData({ ...formData, outcome: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("safety.select", "Selecione")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recovered">Recuperado</SelectItem>
                  <SelectItem value="recovering">Em Recuperação</SelectItem>
                  <SelectItem value="not_recovered">Não Recuperado</SelectItem>
                  <SelectItem value="fatal">Fatal</SelectItem>
                  <SelectItem value="unknown">Desconhecido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("safety.status", "Status")}</Label>
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
                <SelectItem value="reported">Reportado</SelectItem>
                <SelectItem value="closed">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reported_to_irb"
                checked={formData.reported_to_irb}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, reported_to_irb: !!checked })
                }
              />
              <Label htmlFor="reported_to_irb">{t("safety.reportedToIRB", "Reportado ao IRB/CEP")}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="reported_to_sponsor"
                checked={formData.reported_to_sponsor}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, reported_to_sponsor: !!checked })
                }
              />
              <Label htmlFor="reported_to_sponsor">{t("safety.reportedToSponsor", "Reportado ao Patrocinador")}</Label>
            </div>
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
