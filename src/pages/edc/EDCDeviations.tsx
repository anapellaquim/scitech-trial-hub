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
  AlertTriangle,
  Search,
  Plus,
  CheckCircle,
  Clock,
  FileWarning,
} from "lucide-react";
import { format } from "date-fns";
import { DeviationDialog } from "@/components/edc/DeviationDialog";
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
  created_at: string;
  participant?: {
    participant_code: string;
  } | null;
  project?: {
    title: string;
  } | null;
}

export default function EDCDeviations() {
  const { t } = useTranslation(["edc"]);
  const [deviations, setDeviations] = useState<ProtocolDeviation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDeviation, setSelectedDeviation] = useState<ProtocolDeviation | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    major: 0,
    minor: 0,
    pendingAction: 0,
  });

  useEffect(() => {
    fetchDeviations();
    fetchStats();
  }, [selectedStatus, selectedCategory]);

  const fetchStats = async () => {
    const [totalResult, majorResult, minorResult, pendingResult] = await Promise.all([
      supabase.from("protocol_deviations").select("id", { count: "exact", head: true }),
      supabase.from("protocol_deviations").select("id", { count: "exact", head: true }).eq("category", "major"),
      supabase.from("protocol_deviations").select("id", { count: "exact", head: true }).eq("category", "minor"),
      supabase.from("protocol_deviations").select("id", { count: "exact", head: true })
        .in("status", ["open", "under_review"])
        .is("corrective_action", null),
    ]);

    setStats({
      total: totalResult.count || 0,
      major: majorResult.count || 0,
      minor: minorResult.count || 0,
      pendingAction: pendingResult.count || 0,
    });
  };

  const fetchDeviations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("protocol_deviations")
        .select(`
          *,
          participant:participants(participant_code),
          project:projects(title)
        `)
        .order("created_at", { ascending: false });

      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus);
      }
      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDeviations(data || []);
    } catch (error) {
      console.error("Error fetching deviations:", error);
      toast.error(t("deviations.fetchError", "Erro ao carregar desvios"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (deviation: ProtocolDeviation) => {
    setSelectedDeviation(deviation);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedDeviation(null);
    setDialogOpen(true);
  };

  const filteredDeviations = deviations.filter((d) =>
    d.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.participant?.participant_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.research_center?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      inclusion_criteria: "Critério Inclusão",
      exclusion_criteria: "Critério Exclusão",
      procedure: "Procedimento",
      timing: "Timing",
      dosing: "Dose",
      other: "Outro",
    };
    return <Badge variant="secondary">{labels[type] || type}</Badge>;
  };

  const getCategoryBadge = (category: string | null) => {
    if (!category) return null;
    const variants: Record<string, "default" | "destructive"> = {
      major: "destructive",
      minor: "default",
    };
    return (
      <Badge variant={variants[category] || "default"}>
        {category === "major" ? "Maior" : "Menor"}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      open: { variant: "destructive", icon: AlertTriangle },
      under_review: { variant: "default", icon: Clock },
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
            {t("deviations.title", "Desvios de Protocolo")}
          </h1>
          <p className="text-muted-foreground">
            {t("deviations.subtitle", "Gerencie desvios de protocolo e ações corretivas")}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t("deviations.newDeviation", "Novo Desvio")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("deviations.totalDeviations", "Total de Desvios")}
            </CardTitle>
            <FileWarning className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("deviations.majorDeviations", "Desvios Maiores")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.major}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("deviations.minorDeviations", "Desvios Menores")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.minor}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("deviations.pendingAction", "Pendentes de Ação")}
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.pendingAction}</div>
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
                placeholder={t("deviations.search", "Buscar desvio...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t("deviations.allStatus", "Todos os status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("deviations.allStatus", "Todos os status")}</SelectItem>
                <SelectItem value="open">{t("deviations.status.open", "Aberto")}</SelectItem>
                <SelectItem value="under_review">{t("deviations.status.underReview", "Em Revisão")}</SelectItem>
                <SelectItem value="closed">{t("deviations.status.closed", "Fechado")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t("deviations.allCategories", "Todas as categorias")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("deviations.allCategories", "Todas as categorias")}</SelectItem>
                <SelectItem value="major">{t("deviations.category.major", "Maior")}</SelectItem>
                <SelectItem value="minor">{t("deviations.category.minor", "Menor")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Deviations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t("deviations.list", "Lista de Desvios")}
            <Badge variant="outline" className="ml-2">
              {filteredDeviations.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("deviations.participant", "Participante")}</TableHead>
                <TableHead>{t("deviations.center", "Centro")}</TableHead>
                <TableHead>{t("deviations.type", "Tipo")}</TableHead>
                <TableHead>{t("deviations.categoryLabel", "Categoria")}</TableHead>
                <TableHead>{t("deviations.description", "Descrição")}</TableHead>
                <TableHead>{t("deviations.deviationDate", "Data")}</TableHead>
                <TableHead>{t("deviations.status", "Status")}</TableHead>
                <TableHead>{t("deviations.correctiveAction", "Ação Corretiva")}</TableHead>
                <TableHead>{t("deviations.actions", "Ações")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeviations.map((deviation) => (
                <TableRow key={deviation.id}>
                  <TableCell className="font-medium">
                    {deviation.participant?.participant_code || "-"}
                  </TableCell>
                  <TableCell>{deviation.research_center || "-"}</TableCell>
                  <TableCell>{getTypeBadge(deviation.deviation_type)}</TableCell>
                  <TableCell>{getCategoryBadge(deviation.category)}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={deviation.description}>
                    {deviation.description}
                  </TableCell>
                  <TableCell>
                    {format(new Date(deviation.deviation_date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>{getStatusBadge(deviation.status)}</TableCell>
                  <TableCell>
                    {deviation.corrective_action ? (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t("deviations.documented", "Documentada")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600">
                        <Clock className="h-3 w-3 mr-1" />
                        {t("deviations.pending", "Pendente")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(deviation)}>
                      {t("deviations.edit", "Editar")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDeviations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t("deviations.noResults", "Nenhum desvio encontrado")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DeviationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deviation={selectedDeviation}
        onSuccess={() => {
          fetchDeviations();
          fetchStats();
        }}
      />
    </div>
  );
}
