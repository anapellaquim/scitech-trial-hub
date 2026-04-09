import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Search, FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Participant {
  id: string;
  participant_code: string;
  name: string;
  research_center: string | null;
  status: string;
  enrolled_at: string;
  project_id: string;
}

interface CRFEntry {
  id: string;
  status: string;
  signed_at: string | null;
  template: {
    id: string;
    name: string;
  };
}

interface ParticipantWithProgress extends Participant {
  entries: CRFEntry[];
  totalForms: number;
  completedForms: number;
  signedForms: number;
  openQueries: number;
}

interface Project {
  id: string;
  title: string;
}

interface ResearchCenter {
  code: string;
  name: string | null;
}

export default function EDCParticipants() {
  const { t } = useTranslation(["edc"]);
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<ParticipantWithProgress[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [centers, setCenters] = useState<ResearchCenter[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedCenter, setSelectedCenter] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    fetchProjects();
    fetchCenters();
  }, []);

  useEffect(() => {
    fetchParticipants();
  }, [selectedProject, selectedCenter, selectedStatus]);

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("id, title").order("title");
    if (data) setProjects(data);
  };

  const fetchCenters = async () => {
    const { data } = await supabase
      .from("research_centers")
      .select("code, name")
      .order("code");
    if (data) {
      const uniqueCenters = data.reduce((acc: ResearchCenter[], curr) => {
        if (!acc.find(c => c.code === curr.code)) {
          acc.push(curr);
        }
        return acc;
      }, []);
      setCenters(uniqueCenters);
    }
  };

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("participants")
        .select(`
          id,
          participant_code,
          name,
          research_center,
          status,
          enrolled_at,
          project_id
        `)
        .order("participant_code");

      if (selectedProject !== "all") {
        query = query.eq("project_id", selectedProject);
      }
      if (selectedCenter !== "all") {
        query = query.eq("research_center", selectedCenter);
      }
      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus);
      }

      const { data: participantsData, error } = await query;

      if (error) throw error;

      // Fetch CRF entries for each participant
      const participantsWithProgress: ParticipantWithProgress[] = await Promise.all(
        (participantsData || []).map(async (participant) => {
          const { data: entries } = await supabase
            .from("crf_entries")
            .select(`
              id,
              status,
              signed_at,
              template:crf_templates(id, name)
            `)
            .eq("participant_id", participant.id);

          const { count: openQueries } = await supabase
            .from("data_queries")
            .select("id", { count: "exact", head: true })
            .eq("status", "open")
            .in("entry_id", (entries || []).map(e => e.id));

          const formattedEntries = (entries || []).map(e => ({
            id: e.id,
            status: e.status,
            signed_at: e.signed_at,
            template: e.template as { id: string; name: string },
          }));

          const completedForms = formattedEntries.filter(
            e => e.status === "completed" || e.signed_at
          ).length;
          const signedForms = formattedEntries.filter(e => e.signed_at).length;

          return {
            ...participant,
            entries: formattedEntries,
            totalForms: formattedEntries.length,
            completedForms,
            signedForms,
            openQueries: openQueries || 0,
          };
        })
      );

      setParticipants(participantsWithProgress);
    } catch (error) {
      console.error("Error fetching participants:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleParticipantClick = (participantId: string) => {
    navigate(`/edc/participants/${participantId}`);
  };

  const filteredParticipants = participants.filter((p) =>
    p.participant_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      screening: "secondary",
      completed: "outline",
      withdrawn: "destructive",
      screen_failure: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 50) return "bg-blue-500";
    return "bg-orange-500";
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
          {t("participants.title", "Gestão de Participantes")}
        </h1>
        <p className="text-muted-foreground">
          {t("participants.subtitle", "Visualize o progresso de preenchimento dos formulários por participante")}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("participants.search", "Buscar participante...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder={t("participants.allProjects", "Todos os projetos")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("participants.allProjects", "Todos os projetos")}</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCenter} onValueChange={setSelectedCenter}>
              <SelectTrigger>
                <SelectValue placeholder={t("participants.allCenters", "Todos os centros")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("participants.allCenters", "Todos os centros")}</SelectItem>
                {centers.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} - {c.name || "Centro"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t("participants.allStatus", "Todos os status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("participants.allStatus", "Todos os status")}</SelectItem>
                <SelectItem value="active">{t("participants.status.active", "Ativo")}</SelectItem>
                <SelectItem value="screening">{t("participants.status.screening", "Triagem")}</SelectItem>
                <SelectItem value="completed">{t("participants.status.completed", "Concluído")}</SelectItem>
                <SelectItem value="withdrawn">{t("participants.status.withdrawn", "Retirado")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Participants Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("participants.list", "Lista de Participantes")}
            <Badge variant="outline" className="ml-2">
              {filteredParticipants.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("participants.code", "Código")}</TableHead>
                <TableHead>{t("participants.center", "Centro")}</TableHead>
                <TableHead>{t("participants.statusLabel", "Status")}</TableHead>
                <TableHead>{t("participants.enrolledAt", "Inclusão")}</TableHead>
                <TableHead>{t("participants.progress", "Progresso")}</TableHead>
                <TableHead>{t("participants.queries", "Queries")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.map((participant) => {
                const progressPercentage = participant.totalForms > 0
                  ? Math.round((participant.completedForms / participant.totalForms) * 100)
                  : 0;

                return (
                  <TableRow 
                    key={participant.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleParticipantClick(participant.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {participant.participant_code}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell>{participant.research_center || "-"}</TableCell>
                    <TableCell>{getStatusBadge(participant.status)}</TableCell>
                    <TableCell>
                      {format(new Date(participant.enrolled_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[150px]">
                        <Progress
                          value={progressPercentage}
                          className={`h-2 flex-1 ${getProgressColor(progressPercentage)}`}
                        />
                        <span className="text-sm text-muted-foreground w-16">
                          {participant.completedForms}/{participant.totalForms}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {participant.openQueries > 0 ? (
                        <Badge variant="destructive">{participant.openQueries}</Badge>
                      ) : (
                        <Badge variant="outline">0</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredParticipants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t("participants.noResults", "Nenhum participante encontrado")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
