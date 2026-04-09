import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, User, Clock, ArrowRight } from "lucide-react";

interface HistoryEntry {
  id: string;
  finding_id: string;
  user_id: string | null;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  notes: string | null;
  created_at: string;
  profile?: {
    full_name: string;
  } | null;
}

interface FindingHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  findingId: string | null;
}

const FindingHistoryDialog = ({ open, onOpenChange, findingId }: FindingHistoryDialogProps) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && findingId) {
      loadHistory();
    }
  }, [open, findingId]);

  const loadHistory = async () => {
    if (!findingId) return;
    
    setLoading(true);
    try {
      // First get history entries
      const { data: historyData, error: historyError } = await supabase
        .from("finding_history")
        .select("*")
        .eq("finding_id", findingId)
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;

      // Get profile names for user_ids
      const userIds = [...new Set((historyData || []).filter(h => h.user_id).map(h => h.user_id))];
      let profilesMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        profilesData?.forEach(p => {
          profilesMap[p.id] = p.full_name;
        });
      }

      // Merge data
      const historyWithProfiles = (historyData || []).map(entry => ({
        ...entry,
        profile: entry.user_id && profilesMap[entry.user_id] 
          ? { full_name: profilesMap[entry.user_id] } 
          : null
      }));

      setHistory(historyWithProfiles);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "created":
        return { label: "Criado", color: "bg-green-500" };
      case "updated":
        return { label: "Atualizado", color: "bg-blue-500" };
      case "status_changed":
        return { label: "Status alterado", color: "bg-yellow-500" };
      case "assigned":
        return { label: "Responsável alterado", color: "bg-purple-500" };
      default:
        return { label: action, color: "bg-gray-500" };
    }
  };

  const getFieldLabel = (field: string | null) => {
    if (!field) return "";
    const labels: Record<string, string> = {
      status: "Status",
      severity: "Severidade",
      assigned_to: "Responsável",
      due_date: "Prazo",
      description: "Descrição",
      resolution: "Resolução"
    };
    return labels[field] || field;
  };

  const formatValue = (field: string | null, value: string | null) => {
    if (!value || value === "null") return "-";
    
    if (field === "status") {
      return value === "open" ? "Aberto" : "Resolvido";
    }
    if (field === "severity") {
      const labels: Record<string, string> = {
        critical: "Crítico",
        major: "Maior",
        minor: "Menor"
      };
      return labels[value] || value;
    }
    if (field === "due_date") {
      try {
        return format(parseISO(value), "dd/MM/yyyy", { locale: ptBR });
      } catch {
        return value;
      }
    }
    return value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum histórico disponível
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => {
                const actionInfo = getActionLabel(entry.action);
                
                return (
                  <div 
                    key={entry.id} 
                    className="relative pl-6 pb-4 border-l-2 border-muted last:pb-0"
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-[-5px] top-0 w-2 h-2 rounded-full ${actionInfo.color}`} />
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {actionInfo.label}
                        </Badge>
                        {entry.field_changed && (
                          <span className="text-xs text-muted-foreground">
                            {getFieldLabel(entry.field_changed)}
                          </span>
                        )}
                      </div>

                      {entry.old_value !== null && entry.new_value !== null && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground line-through">
                            {formatValue(entry.field_changed, entry.old_value)}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">
                            {formatValue(entry.field_changed, entry.new_value)}
                          </span>
                        </div>
                      )}

                      {entry.notes && (
                        <p className="text-sm text-muted-foreground">{entry.notes}</p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </div>
                        {entry.profile?.full_name && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.profile.full_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default FindingHistoryDialog;
