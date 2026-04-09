import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NewCRFTemplateDialog from "@/components/edc/NewCRFTemplateDialog";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CRFTemplate {
  id: string;
  name: string;
  version: number;
  status: string;
  created_at: string;
  project?: {
    title: string;
  } | null;
  sections_count?: number;
}

interface Project {
  id: string;
  title: string;
}

export default function EDCTemplates() {
  const { t } = useTranslation(["edc"]);
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<CRFTemplate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("id, title").order("title");
    if (data) setProjects(data);
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("crf_templates")
        .select(`
          id,
          name,
          version,
          status,
          created_at,
          project:projects(title)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch section counts
      const templatesWithCounts = await Promise.all(
        (data || []).map(async (template) => {
          const { count } = await supabase
            .from("crf_sections")
            .select("id", { count: "exact", head: true })
            .eq("template_id", template.id);

          return {
            ...template,
            sections_count: count || 0,
          };
        })
      );

      setTemplates(templatesWithCounts);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error(t("messages.error", "Erro ao carregar templates"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplateId) return;

    try {
      const { error } = await supabase
        .from("crf_templates")
        .delete()
        .eq("id", selectedTemplateId);

      if (error) throw error;

      toast.success(t("messages.deleteSuccess", "Template excluído com sucesso"));
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error(t("messages.deleteError", "Erro ao excluir template"));
    } finally {
      setDeleteDialogOpen(false);
      setSelectedTemplateId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      draft: "secondary",
      active: "default",
      archived: "outline",
    };
    const labels: Record<string, string> = {
      draft: t("status.draft", "Rascunho"),
      active: t("status.active", "Ativo"),
      archived: t("status.archived", "Arquivado"),
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
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
            {t("templates.title", "Templates CRF")}
          </h1>
          <p className="text-muted-foreground">
            {t("templates.subtitle", "Gerencie os templates de formulários de coleta de dados")}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("newTemplate", "Novo Template")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("templates.list", "Lista de Templates")}
            <Badge variant="outline" className="ml-2">
              {templates.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fields.name", "Nome")}</TableHead>
                <TableHead>{t("fields.project", "Projeto")}</TableHead>
                <TableHead>{t("fields.version", "Versão")}</TableHead>
                <TableHead>{t("fields.sections", "Seções")}</TableHead>
                <TableHead>{t("fields.status", "Status")}</TableHead>
                <TableHead>{t("templates.actions", "Ações")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{template.project?.title || "-"}</TableCell>
                  <TableCell>v{template.version}</TableCell>
                  <TableCell>{template.sections_count}</TableCell>
                  <TableCell>{getStatusBadge(template.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/edc/designer/${template.id}`)}
                        title={t("templates.design", "Editar Design")}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedTemplateId(template.id);
                          setDeleteDialogOpen(true);
                        }}
                        title={t("templates.delete", "Excluir")}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t("noTemplates", "Nenhum template encontrado")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewCRFTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchTemplates}
        projects={projects}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("templates.confirmDelete", "Confirmar exclusão")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("messages.confirmDelete", "Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel", "Cancelar")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t("common:delete", "Excluir")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
