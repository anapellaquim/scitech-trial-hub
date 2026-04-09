import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import EDCNav from "@/components/EDCNav";
import CRFStatusIndicator from "@/components/edc/CRFStatusIndicator";
import CRFExportDialog from "@/components/edc/CRFExportDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, FileText, Search, Filter, ArrowRight, Download } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CRFEntry {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  is_locked: boolean;
  is_verified: boolean;
  signed_at: string | null;
  template_name: string;
  participant_code: string;
  project_id: string;
  project_title: string;
}

interface Project {
  id: string;
  title: string;
}

const CRFEntryList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<CRFEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedProject, selectedStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, title")
        .order("title");

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Build entries query
      let query = supabase
        .from("crf_entries")
        .select(`
          id,
          status,
          created_at,
          updated_at,
          is_locked,
          is_verified,
          signed_at,
          crf_templates (
            name,
            project_id,
            projects (
              id,
              title
            )
          ),
          participants (
            participant_code
          )
        `)
        .order("updated_at", { ascending: false });

      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus);
      }

      const { data: entriesData, error: entriesError } = await query;

      if (entriesError) throw entriesError;

      // Transform and filter entries
      let transformedEntries: CRFEntry[] = (entriesData || []).map((entry) => ({
        id: entry.id,
        status: entry.status,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        is_locked: entry.is_locked || false,
        is_verified: entry.is_verified || false,
        signed_at: entry.signed_at,
        template_name: (entry.crf_templates as any)?.name || "Template",
        participant_code: (entry.participants as any)?.participant_code || "N/A",
        project_id: (entry.crf_templates as any)?.projects?.id || "",
        project_title: (entry.crf_templates as any)?.projects?.title || "Projeto",
      }));

      // Filter by project
      if (selectedProject !== "all") {
        transformedEntries = transformedEntries.filter(
          (e) => e.project_id === selectedProject
        );
      }

      setEntries(transformedEntries);
    } catch (error) {
      console.error("Error fetching entries:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os formulários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.template_name.toLowerCase().includes(query) ||
      entry.participant_code.toLowerCase().includes(query) ||
      entry.project_title.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string, isLocked: boolean, isVerified: boolean, signedAt: string | null) => {
    return (
      <CRFStatusIndicator
        status={status as any}
        isLocked={isLocked}
        isVerified={isVerified}
        isSigned={!!signedAt}
        showLabel={true}
      />
    );
  };

  // Stats
  const stats = {
    total: entries.length,
    draft: entries.filter((e) => e.status === "draft").length,
    inProgress: entries.filter((e) => e.status === "in_progress").length,
    completed: entries.filter((e) => e.status === "completed").length,
    signed: entries.filter((e) => e.signed_at).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <EDCNav />
      <main className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Formulários CRF</h1>
            <p className="text-muted-foreground">
              Gerencie os formulários de coleta de dados
            </p>
          </div>
          <Button onClick={() => setExportDialogOpen(true)} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-gray-500">{stats.draft}</div>
              <p className="text-sm text-muted-foreground">Rascunho</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-500">{stats.inProgress}</div>
              <p className="text-sm text-muted-foreground">Em Preenchimento</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
              <p className="text-sm text-muted-foreground">Completos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">{stats.signed}</div>
              <p className="text-sm text-muted-foreground">Assinados</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por template, participante..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Projetos</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="in_progress">Em Preenchimento</SelectItem>
                  <SelectItem value="completed">Completo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Formulários ({filteredEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum formulário encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Participante</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.template_name}
                      </TableCell>
                      <TableCell>{entry.participant_code}</TableCell>
                      <TableCell>{entry.project_title}</TableCell>
                      <TableCell>
                        {getStatusBadge(
                          entry.status,
                          entry.is_locked,
                          entry.is_verified,
                          entry.signed_at
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(entry.updated_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/edc/entry/${entry.id}`)}
                        >
                          {entry.is_locked ? "Visualizar" : "Editar"}
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <CRFExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          projectId={selectedProject}
          status={selectedStatus}
        />
      </main>
    </div>
  );
};

export default CRFEntryList;
