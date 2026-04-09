import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  User,
  ClipboardList,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  LogOut,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import ParticipantFormViewer from "@/components/edc/ParticipantFormViewer";

interface Participant {
  id: string;
  participant_code: string;
  name: string;
  research_center: string | null;
  status: string;
  enrolled_at: string;
  project_id: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

interface CRFEntry {
  id: string;
  status: string;
  signed_at: string | null;
  created_at: string;
  template_id: string;
  template: {
    id: string;
    name: string;
  };
}

interface SafetyEvent {
  id: string;
  event_type: string;
  severity: string | null;
  status: string;
  onset_date: string | null;
  description: string;
}

interface ProtocolDeviation {
  id: string;
  deviation_type: string;
  category: string | null;
  status: string;
  deviation_date: string;
  description: string;
}

type FormCategory = "identification" | "baseline" | "visits" | "deviations" | "adverse_events" | "study_exit" | "other";

export default function EDCParticipantDetail() {
  const { t } = useTranslation(["edc"]);
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();

  const [participant, setParticipant] = useState<Participant | null>(null);
  const [entries, setEntries] = useState<CRFEntry[]>([]);
  const [safetyEvents, setSafetyEvents] = useState<SafetyEvent[]>([]);
  const [deviations, setDeviations] = useState<ProtocolDeviation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FormCategory>("identification");

  useEffect(() => {
    if (participantId) {
      fetchParticipantData();
    }
  }, [participantId]);

  const fetchParticipantData = async () => {
    setLoading(true);
    try {
      // Fetch participant
      const { data: participantData } = await supabase
        .from("participants")
        .select("*")
        .eq("id", participantId)
        .single();

      if (participantData) {
        setParticipant(participantData);

        // Fetch CRF entries
        const { data: entriesData } = await supabase
          .from("crf_entries")
          .select(`
            id,
            status,
            signed_at,
            created_at,
            template_id,
            template:crf_templates(id, name)
          `)
          .eq("participant_id", participantId)
          .order("created_at", { ascending: false });

        if (entriesData) {
          const formattedEntries = entriesData.map((e) => ({
            id: e.id,
            status: e.status,
            signed_at: e.signed_at,
            created_at: e.created_at,
            template_id: e.template_id,
            template: e.template as { id: string; name: string },
          }));
          setEntries(formattedEntries);
        }

        // Fetch safety events
        const { data: safetyData } = await supabase
          .from("safety_events")
          .select("id, event_type, severity, status, onset_date, description")
          .eq("participant_id", participantId)
          .order("onset_date", { ascending: false });

        if (safetyData) {
          setSafetyEvents(safetyData);
        }

        // Fetch protocol deviations
        const { data: deviationsData } = await supabase
          .from("protocol_deviations")
          .select("id, deviation_type, category, status, deviation_date, description")
          .eq("participant_id", participantId)
          .order("deviation_date", { ascending: false });

        if (deviationsData) {
          setDeviations(deviationsData);
        }
      }
    } catch (error) {
      console.error("Error fetching participant data:", error);
    } finally {
      setLoading(false);
    }
  };

  const categorizeForm = (templateName: string): FormCategory => {
    const name = templateName.toLowerCase();
    if (name.includes("identification") || name.includes("identificação") || name.includes("demographics") || name.includes("demográficos")) {
      return "identification";
    }
    if (name.includes("baseline") || name.includes("screening") || name.includes("triagem") || name.includes("elegibilidade")) {
      return "baseline";
    }
    if (name.includes("visit") || name.includes("visita") || name.includes("follow-up") || name.includes("acompanhamento")) {
      return "visits";
    }
    if (name.includes("exit") || name.includes("saída") || name.includes("término") || name.includes("end of study") || name.includes("fim do estudo")) {
      return "study_exit";
    }
    return "other";
  };

  const getEntriesByCategory = (category: FormCategory): CRFEntry[] => {
    return entries.filter((e) => categorizeForm(e.template.name) === category);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      screening: "secondary",
      completed: "outline",
      withdrawn: "destructive",
      screen_failure: "destructive",
      draft: "secondary",
      in_progress: "default",
      open: "destructive",
      closed: "outline",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const tabConfig = [
    { id: "identification" as FormCategory, label: t("forms.categories.identification", "Identificação"), icon: User },
    { id: "baseline" as FormCategory, label: t("forms.categories.baseline", "Baseline"), icon: ClipboardList },
    { id: "visits" as FormCategory, label: t("forms.categories.visits", "Visitas"), icon: Calendar },
    { id: "deviations" as FormCategory, label: t("forms.categories.deviations", "Desvios"), icon: AlertTriangle },
    { id: "adverse_events" as FormCategory, label: t("forms.categories.adverse_events", "Eventos Adversos"), icon: ShieldAlert },
    { id: "study_exit" as FormCategory, label: t("forms.categories.study_exit", "Saída do Estudo"), icon: LogOut },
    { id: "other" as FormCategory, label: t("forms.categories.other", "Outros"), icon: FileText },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{t("participant.notFound", "Participante não encontrado")}</p>
        <Button variant="outline" onClick={() => navigate("/edc/participants")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("participant.backToList", "Voltar para lista")}
        </Button>
      </div>
    );
  }

  const renderFormViewer = (categoryEntries: CRFEntry[]) => {
    return (
      <ParticipantFormViewer 
        entries={categoryEntries}
        participantId={participantId || ""}
      />
    );
  };

  const renderSafetyEvents = () => {
    if (safetyEvents.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ShieldAlert className="h-12 w-12 mb-4 opacity-50" />
          <p>{t("forms.noSafetyEvents", "Nenhum evento adverso registrado")}</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("safety.type", "Tipo")}</TableHead>
            <TableHead>{t("safety.severity", "Gravidade")}</TableHead>
            <TableHead>{t("safety.status", "Status")}</TableHead>
            <TableHead>{t("safety.onsetDate", "Data Início")}</TableHead>
            <TableHead>{t("safety.description", "Descrição")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {safetyEvents.map((event) => (
            <TableRow key={event.id}>
              <TableCell>
                <Badge variant={event.event_type === "SAE" || event.event_type === "SUSAR" ? "destructive" : "secondary"}>
                  {event.event_type}
                </Badge>
              </TableCell>
              <TableCell>{event.severity || "-"}</TableCell>
              <TableCell>{getStatusBadge(event.status)}</TableCell>
              <TableCell>
                {event.onset_date ? format(new Date(event.onset_date), "dd/MM/yyyy") : "-"}
              </TableCell>
              <TableCell className="max-w-xs truncate">{event.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderDeviations = () => {
    if (deviations.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
          <p>{t("forms.noDeviations", "Nenhum desvio de protocolo registrado")}</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("deviations.type", "Tipo")}</TableHead>
            <TableHead>{t("deviations.category", "Categoria")}</TableHead>
            <TableHead>{t("deviations.status", "Status")}</TableHead>
            <TableHead>{t("deviations.date", "Data")}</TableHead>
            <TableHead>{t("deviations.description", "Descrição")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deviations.map((deviation) => (
            <TableRow key={deviation.id}>
              <TableCell>{deviation.deviation_type}</TableCell>
              <TableCell>
                <Badge variant={deviation.category === "major" ? "destructive" : "secondary"}>
                  {deviation.category || "-"}
                </Badge>
              </TableCell>
              <TableCell>{getStatusBadge(deviation.status)}</TableCell>
              <TableCell>{format(new Date(deviation.deviation_date), "dd/MM/yyyy")}</TableCell>
              <TableCell className="max-w-xs truncate">{deviation.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/edc/participants")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <User className="h-6 w-6" />
              {participant.participant_code}
            </h1>
            <p className="text-muted-foreground">
              {participant.name} • {participant.research_center || t("participant.noCenter", "Sem centro")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(participant.status)}
          <Badge variant="outline">
            {t("participant.enrolledAt", "Incluído em")}: {format(new Date(participant.enrolled_at), "dd/MM/yyyy")}
          </Badge>
        </div>
      </div>

      {/* Horizontal Tab Navigation */}
      <Card>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FormCategory)}>
          <CardHeader className="pb-0">
            <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0">
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                const count = tab.id === "deviations" 
                  ? deviations.length 
                  : tab.id === "adverse_events" 
                    ? safetyEvents.length 
                    : getEntriesByCategory(tab.id).length;
                
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            <TabsContent value="identification" className="m-0">
              {renderFormViewer(getEntriesByCategory("identification"))}
            </TabsContent>

            <TabsContent value="baseline" className="m-0">
              {renderFormViewer(getEntriesByCategory("baseline"))}
            </TabsContent>

            <TabsContent value="visits" className="m-0">
              {renderFormViewer(getEntriesByCategory("visits"))}
            </TabsContent>

            <TabsContent value="deviations" className="m-0">
              {renderDeviations()}
            </TabsContent>

            <TabsContent value="adverse_events" className="m-0">
              {renderSafetyEvents()}
            </TabsContent>

            <TabsContent value="study_exit" className="m-0">
              {renderFormViewer(getEntriesByCategory("study_exit"))}
            </TabsContent>

            <TabsContent value="other" className="m-0">
              {renderFormViewer(getEntriesByCategory("other"))}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
