import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CTMSNav from "@/components/CTMSNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, FileText, FolderOpen, Clock, User, History, Download, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import NewTemplateDialog from "@/components/library/NewTemplateDialog";
import EditTemplateDialog from "@/components/library/EditTemplateDialog";
import VersionHistoryDialog from "@/components/library/VersionHistoryDialog";
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

interface DocumentTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  current_version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "all", label: "Todos" },
  { value: "carta", label: "Cartas" },
  { value: "plano", label: "Planos" },
  { value: "sop", label: "SOPs" },
  { value: "relatorio", label: "Relatórios" },
  { value: "formulario", label: "Formulários" },
  { value: "contrato", label: "Contratos" },
  { value: "outro", label: "Outros" },
];

const Library = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [viewingHistory, setViewingHistory] = useState<DocumentTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<DocumentTemplate | null>(null);

  useEffect(() => {
    checkAuth();
    fetchTemplates();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("document_templates")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar templates");
      console.error(error);
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;

    const { error } = await supabase
      .from("document_templates")
      .delete()
      .eq("id", deletingTemplate.id);

    if (error) {
      toast.error("Erro ao excluir template");
      console.error(error);
    } else {
      toast.success("Template excluído com sucesso");
      fetchTemplates();
    }
    setDeletingTemplate(null);
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      carta: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      plano: "bg-green-500/10 text-green-500 border-green-500/20",
      sop: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      relatorio: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      formulario: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      contrato: "bg-red-500/10 text-red-500 border-red-500/20",
      outro: "bg-muted text-muted-foreground border-border",
    };
    return colors[category] || colors.outro;
  };

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Biblioteca de Templates</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie documentos modelo como cartas, planos, SOPs e relatórios
            </p>
          </div>
          <Button onClick={() => setIsNewDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Template
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-2">
            {CATEGORIES.map((category) => (
              <TabsTrigger key={category.value} value={category.value}>
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-0">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-5 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-muted rounded w-full"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <Card className="p-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Nenhum template encontrado
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm
                    ? "Tente ajustar sua busca"
                    : "Comece criando seu primeiro template"}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsNewDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Template
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">{template.title}</CardTitle>
                            <Badge variant="outline" className={`mt-1 ${getCategoryColor(template.category)}`}>
                              {getCategoryLabel(template.category)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {template.description && (
                        <CardDescription className="line-clamp-2 mb-4">
                          {template.description}
                        </CardDescription>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <History className="h-3 w-3" />
                          v{template.current_version}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(template.updated_at), "dd MMM yyyy", { locale: ptBR })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setEditingTemplate(template)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingHistory(template)}
                        >
                          <History className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingTemplate(template)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <NewTemplateDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        onSuccess={fetchTemplates}
        categories={CATEGORIES.filter((c) => c.value !== "all")}
      />

      {editingTemplate && (
        <EditTemplateDialog
          open={!!editingTemplate}
          onOpenChange={(open) => !open && setEditingTemplate(null)}
          template={editingTemplate}
          onSuccess={fetchTemplates}
          categories={CATEGORIES.filter((c) => c.value !== "all")}
        />
      )}

      {viewingHistory && (
        <VersionHistoryDialog
          open={!!viewingHistory}
          onOpenChange={(open) => !open && setViewingHistory(null)}
          template={viewingHistory}
        />
      )}

      <AlertDialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O template "{deletingTemplate?.title}" e todo seu histórico de versões serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Library;