import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldAlert,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { SafetyEventDialog } from "@/components/edc/SafetyEventDialog";
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
  reported_at: string | null;
  created_at: string;
  participant?: {
    participant_code: string;
  } | null;
  project?: {
    title: string;
  } | null;
}

export default function EDCSafetyEvents() {
  const { t } = useTranslation(["edc"]);
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SafetyEvent | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    sae: 0,
    pendingReport: 0,
    bySeverity: { mild: 0, moderate: 0, severe: 0 },
  });

  useEffect(() => {
    fetchEvents();
    fetchStats();
  }, [selectedStatus, selectedType]);

  const fetchStats = async () => {
    const [totalResult, saeResult, pendingResult, mildResult, moderateResult, severeResult] = await Promise.all([
      supabase.from("safety_events").select("id", { count: "exact", head: true }),
      supabase.from("safety_events").select("id", { count: "exact", head: true }).in("event_type", ["SAE", "SUSAR"]),
      supabase.from("safety_events").select("id", { count: "exact", head: true })
        .in("status", ["open", "under_review"])
        .or("reported_to_irb.eq.false,reported_to_sponsor.eq.false"),
      supabase.from("safety_events").select("id", { count: "exact", head: true }).eq("severity", "mild"),
      supabase.from("safety_events").select("id", { count: "exact", head: true }).eq("severity", "moderate"),
      supabase.from("safety_events").select("id", { count: "exact", head: true }).in("severity", ["severe", "life_threatening"]),
    ]);

    setStats({
      total: totalResult.count || 0,
      sae: saeResult.count || 0,
      pendingReport: pendingResult.count || 0,
      bySeverity: {
        mild: mildResult.count || 0,
        moderate: moderateResult.count || 0,
        severe: severeResult.count || 0,
      },
    });
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("safety_events")
        .select(`
          *,
          participant:participants(participant_code),
          project:projects(title)
        `)
        .order("created_at", { ascending: false });

      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus);
      }
      if (selectedType !== "all") {
        query = query.eq("event_type", selectedType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching safety events:", error);
      toast.error(t("safety.fetchError", "Erro ao carregar eventos"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event: SafetyEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedEvent(null);
    setDialogOpen(true);
  };

  const filteredEvents = events.filter((e) =>
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.participant?.participant_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.research_center?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      AE: "secondary",
      SAE: "destructive",
      SUSAR: "destructive",
      pregnancy: "default",
      death: "destructive",
    };
    return <Badge variant={variants[type] || "secondary"}>{type}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      open: { variant: "destructive", icon: AlertTriangle },
      under_review: { variant: "default", icon: Clock },
      reported: { variant: "secondary", icon: CheckCircle },
      closed: { variant: "outline", icon: CheckCircle },
    };
    const { variant, icon: Icon } = config[status] || config.open;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("safety.title", "Eventos de Segurança")}
          </h1>
          <p className="text-muted-foreground">
            {t("safety.subtitle", "Gerencie eventos adversos e de segurança do estudo")}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t("safety.newEvent", "Novo Evento")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("safety.totalEvents", "Total de Eventos")}
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("safety.saeEvents", "SAE/SUSAR")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.sae}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("safety.pendingReport", "Pendentes de Reporte")}
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.pendingReport}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("safety.bySeverity", "Por Severidade")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 text-xs">
              <span className="text-green-600">Leve: {stats.bySeverity.mild}</span>
              <span className="text-yellow-600">Mod: {stats.bySeverity.moderate}</span>
              <span className="text-red-600">Sev: {stats.bySeverity.severe}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("safety.search", "Buscar evento...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t("safety.allStatus", "Todos os status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("safety.allStatus", "Todos os status")}</SelectItem>
                <SelectItem value="open">{t("safety.status.open", "Aberto")}</SelectItem>
                <SelectItem value="under_review">{t("safety.status.underReview", "Em Revisão")}</SelectItem>
                <SelectItem value="reported">{t("safety.status.reported", "Reportado")}</SelectItem>
                <SelectItem value="closed">{t("safety.status.closed", "Fechado")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder={t("safety.allTypes", "Todos os tipos")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("safety.allTypes", "Todos os tipos")}</SelectItem>
                <SelectItem value="AE">AE - Evento Adverso</SelectItem>
                <SelectItem value="SAE">SAE - Evento Adverso Sério</SelectItem>
                <SelectItem value="SUSAR">SUSAR</SelectItem>
                <SelectItem value="pregnancy">Gravidez</SelectItem>
                <SelectItem value="death">Óbito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            {t("safety.list", "Lista de Eventos")}
            <Badge variant="outline" className="ml-2">
              {filteredEvents.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("safety.participant", "Participante")}</TableHead>
                <TableHead>{t("safety.center", "Centro")}</TableHead>
                <TableHead>{t("safety.type", "Tipo")}</TableHead>
                <TableHead>{t("safety.description", "Descrição")}</TableHead>
                <TableHead>{t("safety.onsetDate", "Data Início")}</TableHead>
                <TableHead>{t("safety.severity", "Severidade")}</TableHead>
                <TableHead>{t("safety.status", "Status")}</TableHead>
                <TableHead>{t("safety.reported", "Reportado")}</TableHead>
                <TableHead>{t("safety.actions", "Ações")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">
                    {event.participant?.participant_code || "-"}
                  </TableCell>
                  <TableCell>{event.research_center || "-"}</TableCell>
                  <TableCell>{getTypeBadge(event.event_type)}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={event.description}>
                    {event.description}
                  </TableCell>
                  <TableCell>
                    {event.onset_date ? format(new Date(event.onset_date), "dd/MM/yyyy") : "-"}
                  </TableCell>
                  <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                  <TableCell>{getStatusBadge(event.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {event.reported_to_irb && <Badge variant="outline" className="text-xs">IRB</Badge>}
                      {event.reported_to_sponsor && <Badge variant="outline" className="text-xs">Sponsor</Badge>}
                      {!event.reported_to_irb && !event.reported_to_sponsor && "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(event)}>
                      {t("safety.edit", "Editar")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t("safety.noResults", "Nenhum evento encontrado")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SafetyEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={selectedEvent}
        onSuccess={() => {
          fetchEvents();
          fetchStats();
        }}
      />
    </div>
  );
}
