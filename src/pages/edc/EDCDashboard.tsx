import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  FileText,
  MessageCircleQuestion,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface DashboardStats {
  totalParticipants: number;
  totalEntries: number;
  completedEntries: number;
  signedEntries: number;
  openQueries: number;
  answeredQueries: number;
  pendingSafetyEvents: number;
  openDeviations: number;
}

export default function EDCDashboard() {
  const { t } = useTranslation(["edc"]);
  const [stats, setStats] = useState<DashboardStats>({
    totalParticipants: 0,
    totalEntries: 0,
    completedEntries: 0,
    signedEntries: 0,
    openQueries: 0,
    answeredQueries: 0,
    pendingSafetyEvents: 0,
    openDeviations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [
        participantsResult,
        entriesResult,
        completedEntriesResult,
        signedEntriesResult,
        openQueriesResult,
        answeredQueriesResult,
        safetyEventsResult,
        deviationsResult,
      ] = await Promise.all([
        supabase.from("participants").select("id", { count: "exact", head: true }),
        supabase.from("crf_entries").select("id", { count: "exact", head: true }),
        supabase.from("crf_entries").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("crf_entries").select("id", { count: "exact", head: true }).not("signed_at", "is", null),
        supabase.from("data_queries").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("data_queries").select("id", { count: "exact", head: true }).eq("status", "answered"),
        supabase.from("safety_events").select("id", { count: "exact", head: true }).in("status", ["open", "under_review"]),
        supabase.from("protocol_deviations").select("id", { count: "exact", head: true }).in("status", ["open", "under_review"]),
      ]);

      setStats({
        totalParticipants: participantsResult.count || 0,
        totalEntries: entriesResult.count || 0,
        completedEntries: completedEntriesResult.count || 0,
        signedEntries: signedEntriesResult.count || 0,
        openQueries: openQueriesResult.count || 0,
        answeredQueries: answeredQueriesResult.count || 0,
        pendingSafetyEvents: safetyEventsResult.count || 0,
        openDeviations: deviationsResult.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const completionRate = stats.totalEntries > 0 
    ? Math.round((stats.completedEntries / stats.totalEntries) * 100) 
    : 0;

  const signatureRate = stats.totalEntries > 0 
    ? Math.round((stats.signedEntries / stats.totalEntries) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title", "Dashboard EDC")}</h1>
        <p className="text-muted-foreground">
          {t("dashboard.subtitle", "Visão geral da captura eletrônica de dados")}
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.participants", "Participantes")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.enrolled", "Incluídos no estudo")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.entries", "Formulários CRF")}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEntries}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedEntries} {t("dashboard.completed", "completos")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.openQueries", "Queries Abertas")}
            </CardTitle>
            <MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openQueries}</div>
            <p className="text-xs text-muted-foreground">
              {stats.answeredQueries} {t("dashboard.answered", "respondidas")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.pendingItems", "Pendências")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pendingSafetyEvents + stats.openDeviations}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.safetyAndDeviations", "Segurança + Desvios")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {t("dashboard.completionRate", "Taxa de Preenchimento")}
            </CardTitle>
            <CardDescription>
              {t("dashboard.completionDesc", "Formulários completos vs. total")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={completionRate} className="flex-1" />
              <span className="text-2xl font-bold">{completionRate}%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.completedEntries} / {stats.totalEntries} {t("dashboard.forms", "formulários")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              {t("dashboard.signatureRate", "Taxa de Assinatura")}
            </CardTitle>
            <CardDescription>
              {t("dashboard.signatureDesc", "Formulários assinados eletronicamente")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={signatureRate} className="flex-1" />
              <span className="text-2xl font-bold">{signatureRate}%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.signedEntries} / {stats.totalEntries} {t("dashboard.forms", "formulários")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={stats.pendingSafetyEvents > 0 ? "border-destructive" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className={`h-5 w-5 ${stats.pendingSafetyEvents > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              {t("dashboard.safetyEvents", "Eventos de Segurança")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.pendingSafetyEvents}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.pendingReview", "Pendentes de revisão")}
            </p>
          </CardContent>
        </Card>

        <Card className={stats.openDeviations > 0 ? "border-orange-500" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${stats.openDeviations > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
              {t("dashboard.protocolDeviations", "Desvios de Protocolo")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.openDeviations}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.pendingAction", "Pendentes de ação corretiva")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
