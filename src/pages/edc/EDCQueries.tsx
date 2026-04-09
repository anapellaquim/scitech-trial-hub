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
  MessageCircleQuestion,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import QueryResponseDialog from "@/components/edc/QueryResponseDialog";

interface DataQuery {
  id: string;
  query_text: string;
  response_text: string | null;
  status: string;
  priority: string | null;
  query_type: string;
  created_at: string;
  entry: {
    id: string;
    participant: {
      participant_code: string;
      research_center: string | null;
    };
    template: {
      name: string;
    };
  };
  field: {
    field_label: string;
  } | null;
}

export default function EDCQueries() {
  const { t } = useTranslation(["edc"]);
  const [queries, setQueries] = useState<DataQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<DataQuery | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");

  // Stats
  const [stats, setStats] = useState({
    open: 0,
    answered: 0,
    closed: 0,
  });

  useEffect(() => {
    fetchQueries();
    fetchStats();
  }, [selectedStatus, selectedPriority]);

  const fetchStats = async () => {
    const [openResult, answeredResult, closedResult] = await Promise.all([
      supabase.from("data_queries").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("data_queries").select("id", { count: "exact", head: true }).eq("status", "answered"),
      supabase.from("data_queries").select("id", { count: "exact", head: true }).eq("status", "closed"),
    ]);

    setStats({
      open: openResult.count || 0,
      answered: answeredResult.count || 0,
      closed: closedResult.count || 0,
    });
  };

  const fetchQueries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("data_queries")
        .select(`
          id,
          query_text,
          response_text,
          status,
          priority,
          query_type,
          created_at,
          entry:crf_entries(
            id,
            participant:participants(participant_code, research_center),
            template:crf_templates(name)
          ),
          field:crf_fields(field_label)
        `)
        .order("created_at", { ascending: false });

      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus);
      }
      if (selectedPriority !== "all") {
        query = query.eq("priority", selectedPriority);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedQueries = (data || []).map((q: any) => ({
        id: q.id,
        query_text: q.query_text,
        response_text: q.response_text,
        status: q.status,
        priority: q.priority,
        query_type: q.query_type,
        created_at: q.created_at,
        entry: {
          id: q.entry?.id,
          participant: q.entry?.participant,
          template: q.entry?.template,
        },
        field: q.field,
      }));

      setQueries(formattedQueries);
    } catch (error) {
      console.error("Error fetching queries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = (query: DataQuery) => {
    setSelectedQuery(query);
    setResponseDialogOpen(true);
  };

  const handleCloseQuery = async (queryId: string) => {
    const { error } = await supabase
      .from("data_queries")
      .update({ 
        status: "closed", 
        closed_at: new Date().toISOString() 
      })
      .eq("id", queryId);

    if (!error) {
      fetchQueries();
      fetchStats();
    }
  };

  const filteredQueries = queries.filter((q) =>
    q.query_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.entry?.participant?.participant_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.entry?.template?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any; label: string }> = {
      open: { variant: "destructive", icon: AlertCircle, label: t("queries.open", "Aberta") },
      answered: { variant: "secondary", icon: MessageSquare, label: t("queries.answered", "Respondida") },
      closed: { variant: "outline", icon: CheckCircle, label: t("queries.closed", "Fechada") },
    };
    const { variant, icon: Icon, label } = config[status] || config.open;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string | null) => {
    if (!priority) return null;
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      high: "destructive",
      medium: "default",
      low: "secondary",
    };
    return <Badge variant={variants[priority]}>{priority}</Badge>;
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("queries.title", "Gestão de Queries")}
        </h1>
        <p className="text-muted-foreground">
          {t("queries.subtitle", "Gerencie todas as queries e discrepâncias do estudo")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("queries.openQueries", "Queries Abertas")}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("queries.answeredQueries", "Respondidas")}
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.answered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("queries.closedQueries", "Fechadas")}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.closed}</div>
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
                placeholder={t("queries.search", "Buscar query...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t("queries.allStatus", "Todos os status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("queries.allStatus", "Todos os status")}</SelectItem>
                <SelectItem value="open">{t("queries.open", "Aberta")}</SelectItem>
                <SelectItem value="answered">{t("queries.answered", "Respondida")}</SelectItem>
                <SelectItem value="closed">{t("queries.closed", "Fechada")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger>
                <SelectValue placeholder={t("queries.allPriorities", "Todas as prioridades")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("queries.allPriorities", "Todas as prioridades")}</SelectItem>
                <SelectItem value="high">{t("queries.high", "Alta")}</SelectItem>
                <SelectItem value="medium">{t("queries.medium", "Média")}</SelectItem>
                <SelectItem value="low">{t("queries.low", "Baixa")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Queries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5" />
            {t("queries.list", "Lista de Queries")}
            <Badge variant="outline" className="ml-2">
              {filteredQueries.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("queries.participant", "Participante")}</TableHead>
                <TableHead>{t("queries.center", "Centro")}</TableHead>
                <TableHead>{t("queries.form", "Formulário")}</TableHead>
                <TableHead>{t("queries.field", "Campo")}</TableHead>
                <TableHead>{t("queries.queryText", "Query")}</TableHead>
                <TableHead>{t("queries.status", "Status")}</TableHead>
                <TableHead>{t("queries.priority", "Prioridade")}</TableHead>
                <TableHead>{t("queries.createdAt", "Criada em")}</TableHead>
                <TableHead>{t("queries.actions", "Ações")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQueries.map((query) => (
                <TableRow key={query.id}>
                  <TableCell className="font-medium">
                    {query.entry?.participant?.participant_code || "-"}
                  </TableCell>
                  <TableCell>
                    {query.entry?.participant?.research_center || "-"}
                  </TableCell>
                  <TableCell>{query.entry?.template?.name || "-"}</TableCell>
                  <TableCell>{query.field?.field_label || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={query.query_text}>
                    {query.query_text}
                  </TableCell>
                  <TableCell>{getStatusBadge(query.status)}</TableCell>
                  <TableCell>{getPriorityBadge(query.priority)}</TableCell>
                  <TableCell>
                    {format(new Date(query.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {query.status === "open" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRespond(query)}
                        >
                          {t("queries.respond", "Responder")}
                        </Button>
                      )}
                      {query.status === "answered" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCloseQuery(query.id)}
                        >
                          {t("queries.close", "Fechar")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredQueries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t("queries.noResults", "Nenhuma query encontrada")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedQuery && (
        <QueryResponseDialog
          open={responseDialogOpen}
          onClose={() => setResponseDialogOpen(false)}
          queryId={selectedQuery.id}
          onQueryUpdated={() => {
            fetchQueries();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}
