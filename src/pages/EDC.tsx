import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import EDCNav from "@/components/EDCNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FileText, ClipboardList, Edit, Trash2, Eye, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import NewCRFTemplateDialog from "@/components/edc/NewCRFTemplateDialog";

interface CRFTemplate {
  id: string;
  name: string;
  version: number;
  status: string;
  created_at: string;
  project_id: string | null;
  projects?: { title: string } | null;
}

interface Project {
  id: string;
  title: string;
}

const EDC = () => {
  const [templates, setTemplates] = useState<CRFTemplate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalTemplates: 0,
    activeTemplates: 0,
    totalEntries: 0,
    pendingEntries: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch projects
      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, title")
        .order("title");
      
      setProjects(projectsData || []);

      // Fetch templates
      let query = supabase
        .from("crf_templates")
        .select(`
          id, name, version, status, created_at, project_id,
          projects:project_id(title)
        `)
        .order("created_at", { ascending: false });

      if (selectedProject !== "all") {
        query = query.eq("project_id", selectedProject);
      }

      const { data: templatesData, error } = await query;

      if (error) throw error;
      setTemplates(templatesData || []);

      // Calculate stats
      const totalTemplates = templatesData?.length || 0;
      const activeTemplates = templatesData?.filter(t => t.status === "active").length || 0;

      // Fetch entries stats
      const { count: totalEntries } = await supabase
        .from("crf_entries")
        .select("*", { count: "exact", head: true });

      const { count: pendingEntries } = await supabase
        .from("crf_entries")
        .select("*", { count: "exact", head: true })
        .eq("status", "in_progress");

      setStats({
        totalTemplates,
        activeTemplates,
        totalEntries: totalEntries || 0,
        pendingEntries: pendingEntries || 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProject]);

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este template?")) return;

    try {
      const { error } = await supabase
        .from("crf_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Template excluído com sucesso");
      fetchData();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Erro ao excluir template");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      active: "default",
      archived: "outline",
    };
    const labels: Record<string, string> = {
      draft: "Rascunho",
      active: "Ativo",
      archived: "Arquivado",
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <EDCNav />

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">EDC - Coleta de Dados</h1>
            <p className="text-muted-foreground">
              Gerencie formulários CRF e coleta de dados dos estudos
            </p>
          </div>
        </div>

        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Templates CRF
            </TabsTrigger>
            <TabsTrigger value="visits" className="gap-2">
              <Calendar className="h-4 w-4" />
              Visitas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => setIsNewDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Template CRF
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTemplates}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Templates Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.activeTemplates}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Entradas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEntries}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Entradas Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500">{stats.pendingEntries}</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="w-64">
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por projeto" />
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
              </div>
            </div>

            {/* Templates Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Templates de CRF
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum template de CRF encontrado
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setIsNewDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Template
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Projeto</TableHead>
                        <TableHead>Versão</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>
                            {template.projects?.title || "-"}
                          </TableCell>
                          <TableCell>v{template.version}</TableCell>
                          <TableCell>{getStatusBadge(template.status)}</TableCell>
                          <TableCell>
                            {new Date(template.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link to={`/edc/designer/${template.id}`}>
                                  <Edit className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" asChild>
                                <Link to={`/edc/preview/${template.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTemplate(template.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visits">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Controle de Visitas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  O controle de visitas por estudo está disponível na página de cada projeto.
                  <br />
                  Acesse Projects → Selecione um estudo → Visits para gerenciar as visitas.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <NewCRFTemplateDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        onSuccess={fetchData}
        projects={projects}
      />
    </div>
  );
};

export default EDC;
