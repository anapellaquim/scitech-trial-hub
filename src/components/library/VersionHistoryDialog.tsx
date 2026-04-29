import { parseLocalDate, formatDateOnly, todayDateOnly } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, Clock, User, FileText, Eye } from "lucide-react";

interface DocumentTemplate {
  id: string;
  title: string;
  current_version: number;
}

interface DocumentVersion {
  id: string;
  template_id: string;
  version_number: number;
  content: string | null;
  changes_description: string | null;
  created_by: string | null;
  created_at: string;
}

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DocumentTemplate;
}

const VersionHistoryDialog = ({
  open,
  onOpenChange,
  template,
}: VersionHistoryDialogProps) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingContent, setViewingContent] = useState<DocumentVersion | null>(null);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && template) {
      fetchVersions();
    }
  }, [open, template]);

  const fetchVersions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("document_versions")
      .select("*")
      .eq("template_id", template.id)
      .order("version_number", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar histórico");
      console.error(error);
    } else {
      setVersions(data || []);
      
      // Fetch profile names for creators
      const creatorIds = [...new Set((data || []).map(v => v.created_by).filter(Boolean))];
      if (creatorIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", creatorIds);
        
        if (profileData) {
          const profileMap: Record<string, string> = {};
          profileData.forEach(p => {
            profileMap[p.id] = p.full_name;
          });
          setProfiles(profileMap);
        }
      }
    }
    setLoading(false);
  };

  return (
    <>
      <Dialog open={open && !viewingContent} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Versões
            </DialogTitle>
            <DialogDescription>
              {template.title} - {versions.length} versões
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-lg animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma versão encontrada
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className={`p-4 border rounded-lg ${
                      version.version_number === template.current_version
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              version.version_number === template.current_version
                                ? "default"
                                : "outline"
                            }
                          >
                            v{version.version_number}
                          </Badge>
                          {version.version_number === template.current_version && (
                            <Badge variant="secondary" className="text-xs">
                              Atual
                            </Badge>
                          )}
                        </div>

                        {version.changes_description && (
                          <p className="text-sm text-foreground mb-2">
                            {version.changes_description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseLocalDate(version.created_at), "dd MMM yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                          {version.created_by && profiles[version.created_by] && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {profiles[version.created_by]}
                            </div>
                          )}
                        </div>
                      </div>

                      {version.content && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingContent(version)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Content Viewer Dialog */}
      <Dialog open={!!viewingContent} onOpenChange={(open) => !open && setViewingContent(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Conteúdo da Versão {viewingContent?.version_number}
            </DialogTitle>
            <DialogDescription>
              {viewingContent?.changes_description || "Visualização do conteúdo"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <pre className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap font-mono">
              {viewingContent?.content || "Sem conteúdo"}
            </pre>
          </ScrollArea>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setViewingContent(null)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VersionHistoryDialog;