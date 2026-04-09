import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  User,
  ClipboardList,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  LogOut,
  FileText,
  ExternalLink,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import CRFStatusIndicator from "./CRFStatusIndicator";

interface ParticipantFormsSectionProps {
  participantId: string;
  participantCode: string;
  projectId: string;
}

interface CRFEntry {
  id: string;
  status: string;
  signed_at: string | null;
  created_at: string;
  template: {
    id: string;
    name: string;
  };
}

interface SafetyEvent {
  id: string;
  event_type: string;
  description: string;
  onset_date: string | null;
  severity: string | null;
  status: string;
  created_at: string;
}

interface ProtocolDeviation {
  id: string;
  deviation_type: string;
  category: string | null;
  description: string;
  deviation_date: string;
  status: string;
  created_at: string;
}

// Note: study_visits table doesn't have participant_id, so we skip fetching visits directly
// Visits are linked via CRF entries which have visit_id reference

type FormCategory = "identification" | "baseline" | "visits" | "deviations" | "adverse_events" | "study_exit" | "other";

const FORM_CATEGORIES: { key: FormCategory; icon: React.ComponentType<{ className?: string }>; keywords: string[] }[] = [
  { key: "identification", icon: User, keywords: ["identification", "identificação", "demographics", "demográficos", "eligibility", "elegibilidade"] },
  { key: "baseline", icon: ClipboardList, keywords: ["baseline", "basal", "screening", "triagem", "inclusion", "inclusão"] },
  { key: "visits", icon: Calendar, keywords: ["visit", "visita", "follow-up", "seguimento", "day", "dia", "week", "semana", "month", "mês"] },
  { key: "deviations", icon: AlertTriangle, keywords: ["deviation", "desvio", "protocol"] },
  { key: "adverse_events", icon: ShieldAlert, keywords: ["adverse", "adverso", "safety", "segurança", "ae", "sae", "event", "evento"] },
  { key: "study_exit", icon: LogOut, keywords: ["exit", "saída", "completion", "conclusão", "termination", "término", "end", "fim", "withdrawal", "retirada"] },
];

function categorizeForm(formName: string): FormCategory {
  const lowerName = formName.toLowerCase();
  for (const category of FORM_CATEGORIES) {
    if (category.keywords.some(keyword => lowerName.includes(keyword))) {
      return category.key;
    }
  }
  return "other";
}

export default function ParticipantFormsSection({
  participantId,
  participantCode,
  projectId,
}: ParticipantFormsSectionProps) {
  const { t } = useTranslation(["edc"]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("identification");
  
  const [crfEntries, setCrfEntries] = useState<CRFEntry[]>([]);
  const [safetyEvents, setSafetyEvents] = useState<SafetyEvent[]>([]);
  const [deviations, setDeviations] = useState<ProtocolDeviation[]>([]);

  useEffect(() => {
    fetchAllData();
  }, [participantId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCRFEntries(),
        fetchSafetyEvents(),
        fetchDeviations(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCRFEntries = async () => {
    const { data } = await supabase
      .from("crf_entries")
      .select(`
        id,
        status,
        signed_at,
        created_at,
        template:crf_templates(id, name)
      `)
      .eq("participant_id", participantId)
      .order("created_at");

    if (data) {
      setCrfEntries(
        data.map((e) => ({
          id: e.id,
          status: e.status,
          signed_at: e.signed_at,
          created_at: e.created_at,
          template: e.template as { id: string; name: string },
        }))
      );
    }
  };

  const fetchSafetyEvents = async () => {
    const { data } = await supabase
      .from("safety_events")
      .select("id, event_type, description, onset_date, severity, status, created_at")
      .eq("participant_id", participantId)
      .order("created_at", { ascending: false });

    if (data) setSafetyEvents(data);
  };

  const fetchDeviations = async () => {
    const { data } = await supabase
      .from("protocol_deviations")
      .select("id, deviation_type, category, description, deviation_date, status, created_at")
      .eq("participant_id", participantId)
      .order("created_at", { ascending: false });

    if (data) setDeviations(data);
  };

  // Group CRF entries by category
  const groupedEntries = crfEntries.reduce((acc, entry) => {
    const category = categorizeForm(entry.template?.name || "");
    if (!acc[category]) acc[category] = [];
    acc[category].push(entry);
    return acc;
  }, {} as Record<FormCategory, CRFEntry[]>);

  const getTabCount = (key: FormCategory): number => {
    if (key === "deviations") return deviations.length;
    if (key === "adverse_events") return safetyEvents.length;
    return groupedEntries[key]?.length || 0;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "destructive",
      under_review: "secondary",
      reported: "default",
      closed: "outline",
      scheduled: "secondary",
      completed: "default",
      missed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getSeverityBadge = (severity: string | null) => {
    if (!severity) return null;
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      mild: "outline",
      moderate: "secondary",
      severe: "destructive",
      life_threatening: "destructive",
      death: "destructive",
    };
    return <Badge variant={variants[severity] || "secondary"}>{severity}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const renderCRFList = (entries: CRFEntry[]) => {
    if (!entries || entries.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t("participantForms.noForms", "Nenhum formulário nesta categoria")}</p>
        </div>
      );
    }

    return (
      <div className="grid gap-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-3 bg-background rounded-lg border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{entry.template?.name || "Formulário"}</span>
              <CRFStatusIndicator status={entry.status as "draft" | "in_progress" | "completed" | "signed" | "locked" | "verified"} />
              {entry.signed_at && (
                <Badge variant="outline" className="border-primary text-primary">
                  {t("participants.signed", "Assinado")}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/edc/entry/${entry.id}`)}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              {t("participants.view", "Visualizar")}
            </Button>
          </div>
        ))}
      </div>
    );
  };

  const renderVisitsTab = () => {
    const visitEntries = groupedEntries["visits"] || [];
    
    if (visitEntries.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t("participantForms.noVisits", "Nenhuma visita registrada")}</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-muted-foreground">
          {t("participantForms.visitForms", "Formulários de Visita")}
        </h4>
        {renderCRFList(visitEntries)}
      </div>
    );
  };

  const renderDeviationsTab = () => {
    if (deviations.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t("participantForms.noDeviations", "Nenhum desvio de protocolo registrado")}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/edc/deviations")}>
            <Plus className="h-4 w-4 mr-1" />
            {t("participantForms.addDeviation", "Registrar Desvio")}
          </Button>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("participantForms.type", "Tipo")}</TableHead>
            <TableHead>{t("participantForms.category", "Categoria")}</TableHead>
            <TableHead>{t("participantForms.description", "Descrição")}</TableHead>
            <TableHead>{t("participantForms.date", "Data")}</TableHead>
            <TableHead>{t("participantForms.status", "Status")}</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deviations.map((deviation) => (
            <TableRow key={deviation.id}>
              <TableCell className="font-medium">{deviation.deviation_type}</TableCell>
              <TableCell>
                <Badge variant={deviation.category === "major" ? "destructive" : "secondary"}>
                  {deviation.category || "-"}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate">{deviation.description}</TableCell>
              <TableCell>{format(new Date(deviation.deviation_date), "dd/MM/yyyy")}</TableCell>
              <TableCell>{getStatusBadge(deviation.status)}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => navigate("/edc/deviations")}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderAdverseEventsTab = () => {
    if (safetyEvents.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t("participantForms.noEvents", "Nenhum evento de segurança registrado")}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/edc/safety")}>
            <Plus className="h-4 w-4 mr-1" />
            {t("participantForms.addEvent", "Registrar Evento")}
          </Button>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("participantForms.eventType", "Tipo")}</TableHead>
            <TableHead>{t("participantForms.description", "Descrição")}</TableHead>
            <TableHead>{t("participantForms.severity", "Severidade")}</TableHead>
            <TableHead>{t("participantForms.onsetDate", "Data Início")}</TableHead>
            <TableHead>{t("participantForms.status", "Status")}</TableHead>
            <TableHead></TableHead>
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
              <TableCell className="max-w-[200px] truncate">{event.description}</TableCell>
              <TableCell>{getSeverityBadge(event.severity)}</TableCell>
              <TableCell>
                {event.onset_date ? format(new Date(event.onset_date), "dd/MM/yyyy") : "-"}
              </TableCell>
              <TableCell>{getStatusBadge(event.status)}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => navigate("/edc/safety")}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card className="border-0 shadow-none bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary" />
          <span className="font-semibold">{participantCode}</span>
          <span className="text-muted-foreground">-</span>
          <span className="text-muted-foreground text-sm">
            {t("participantForms.title", "Formulários do Participante")}
          </span>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
            {FORM_CATEGORIES.map(({ key, icon: Icon }) => {
              const count = getTabCount(key);
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2 text-sm"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {t(`participantForms.tabs.${key}`, key)}
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
            <TabsTrigger
              value="other"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-2 text-sm"
            >
              <FileText className="h-4 w-4 mr-2" />
              {t("participantForms.tabs.other", "Outros")}
              {(groupedEntries["other"]?.length || 0) > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {groupedEntries["other"]?.length || 0}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identification" className="mt-0">
            {renderCRFList(groupedEntries["identification"] || [])}
          </TabsContent>

          <TabsContent value="baseline" className="mt-0">
            {renderCRFList(groupedEntries["baseline"] || [])}
          </TabsContent>

          <TabsContent value="visits" className="mt-0">
            {renderVisitsTab()}
          </TabsContent>

          <TabsContent value="deviations" className="mt-0">
            {renderDeviationsTab()}
          </TabsContent>

          <TabsContent value="adverse_events" className="mt-0">
            {renderAdverseEventsTab()}
          </TabsContent>

          <TabsContent value="study_exit" className="mt-0">
            {renderCRFList(groupedEntries["study_exit"] || [])}
          </TabsContent>

          <TabsContent value="other" className="mt-0">
            {renderCRFList(groupedEntries["other"] || [])}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
