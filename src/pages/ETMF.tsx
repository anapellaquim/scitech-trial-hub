import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ETMFNav from "@/components/ETMFNav";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FolderOpen, FileText, Clock, CheckCircle, AlertCircle, Upload, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import TMFZoneTree from "@/components/etmf/TMFZoneTree";
import TMFUploadDialog from "@/components/etmf/TMFUploadDialog";

interface Project {
  id: string;
  name: string;
}

interface TMFZone {
  id: string;
  zone_number: string;
  zone_name: string;
  description: string;
  display_order: number;
}

interface TMFStats {
  totalDocuments: number;
  pendingReview: number;
  approved: number;
  requiredArtifacts: number;
  completedArtifacts: number;
}

const ETMF = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [zones, setZones] = useState<TMFZone[]>([]);
  const [stats, setStats] = useState<TMFStats>({
    totalDocuments: 0,
    pendingReview: 0,
    approved: 0,
    requiredArtifacts: 0,
    completedArtifacts: 0,
  });
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchStats();
      fetchRecentDocuments();
    }
  }, [selectedProject]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchProjects();
    fetchZones();
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("id, protocol_number, title")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar projetos");
      return;
    }

    const mappedData = (data || []).map(d => ({ id: d.id, name: `${d.protocol_number || ''} - ${d.title}` }));

    setProjects(mappedData);
    if (mappedData.length > 0) {
      setSelectedProject(mappedData[0].id);
    }
    setLoading(false);
  };

  const fetchZones = async () => {
    const { data, error } = await supabase
      .from("tmf_zones")
      .select("*")
      .order("display_order");

    if (error) {
      toast.error("Erro ao carregar zonas TMF");
      return;
    }

    setZones(data || []);
  };

  const fetchStats = async () => {
    // Fetch total documents for project
    const { data: docs, error: docsError } = await supabase
      .from("tmf_documents")
      .select("id, status")
      .eq("project_id", selectedProject);

    if (docsError) {
      console.error("Error fetching documents:", docsError);
      return;
    }

    // Fetch required artifacts count
    const { data: artifacts, error: artifactsError } = await supabase
      .from("tmf_artifacts")
      .select("id")
      .eq("is_required", true);

    if (artifactsError) {
      console.error("Error fetching artifacts:", artifactsError);
      return;
    }

    // Fetch completed required artifacts (have at least one approved document)
    const { data: completedArtifacts, error: completedError } = await supabase
      .from("tmf_documents")
      .select("artifact_id")
      .eq("project_id", selectedProject)
      .eq("status", "approved");

    const uniqueCompletedArtifacts = new Set(completedArtifacts?.map(d => d.artifact_id) || []);

    setStats({
      totalDocuments: docs?.length || 0,
      pendingReview: docs?.filter(d => d.status === "pending_review").length || 0,
      approved: docs?.filter(d => d.status === "approved").length || 0,
      requiredArtifacts: artifacts?.length || 0,
      completedArtifacts: uniqueCompletedArtifacts.size,
    });
  };

  const fetchRecentDocuments = async () => {
    const { data, error } = await supabase
      .from("tmf_documents")
      .select(`
        id,
        file_name,
        status,
        created_at,
        artifact_id,
        tmf_artifacts (
          artifact_name,
          artifact_number
        )
      `)
      .eq("project_id", selectedProject)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching recent documents:", error);
      return;
    }

    setRecentDocuments(data || []);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Rascunho", variant: "secondary" },
      pending_review: { label: "Aguardando Revisão", variant: "outline" },
      approved: { label: "Aprovado", variant: "default" },
      superseded: { label: "Substituído", variant: "destructive" },
      obsolete: { label: "Obsoleto", variant: "destructive" },
    };

    const config = statusConfig[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const completionPercentage = stats.requiredArtifacts > 0 
    ? Math.round((stats.completedArtifacts / stats.requiredArtifacts) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ETMFNav />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ETMFNav />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">eTMF</h1>
            <p className="text-muted-foreground mt-1">
              Electronic Trial Master File - DIA TMF Reference Model v3.3
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Selecionar estudo" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Documento
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Documentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aguardando Revisão</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completude TMF</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionPercentage}%</div>
              <Progress value={completionPercentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completedArtifacts} de {stats.requiredArtifacts} artefatos obrigatórios
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Zone Tree Navigator */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Navegação TMF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TMFZoneTree 
                  zones={zones} 
                  projectId={selectedProject}
                  onDocumentClick={(docId) => navigate(`/etmf/document/${docId}`)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Recent Documents */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Documentos Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentDocuments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum documento encontrado
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-start justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => navigate(`/etmf/document/${doc.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.file_name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {doc.tmf_artifacts?.artifact_number} - {doc.tmf_artifacts?.artifact_name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="ml-2">
                          {getStatusBadge(doc.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <TMFUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        projectId={selectedProject}
        onSuccess={() => {
          fetchStats();
          fetchRecentDocuments();
        }}
      />
    </div>
  );
};

export default ETMF;
