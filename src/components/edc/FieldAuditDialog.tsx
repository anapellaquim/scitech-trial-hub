import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, ArrowRight, User } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user_id: string | null;
  reason: string | null;
  user_name?: string;
}

interface FieldAuditDialogProps {
  open: boolean;
  onClose: () => void;
  entryId: string;
  fieldId: string;
}

const FieldAuditDialog = ({
  open,
  onClose,
  entryId,
  fieldId,
}: FieldAuditDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [fieldLabel, setFieldLabel] = useState("");

  useEffect(() => {
    if (open) {
      fetchAuditData();
    }
  }, [open, entryId, fieldId]);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      // Fetch field info
      const { data: fieldData } = await supabase
        .from("crf_fields")
        .select("field_label")
        .eq("id", fieldId)
        .single();

      if (fieldData) {
        setFieldLabel(fieldData.field_label);
      }

      // Fetch audit entries
      const { data: auditData, error } = await supabase
        .from("crf_audit_log")
        .select("*")
        .eq("entry_id", entryId)
        .eq("field_id", fieldId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user names for each entry
      const userIds = [...new Set((auditData || []).map((a) => a.user_id).filter(Boolean))];
      
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        userMap = Object.fromEntries(
          (profiles || []).map((p) => [p.id, p.full_name])
        );
      }

      setAuditEntries(
        (auditData || []).map((entry) => ({
          ...entry,
          user_name: entry.user_id ? userMap[entry.user_id] || "Usuário desconhecido" : "Sistema",
        }))
      );
    } catch (error) {
      console.error("Error fetching audit data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "create":
        return { label: "Criado", variant: "default" as const };
      case "update":
        return { label: "Atualizado", variant: "secondary" as const };
      case "delete":
        return { label: "Excluído", variant: "destructive" as const };
      default:
        return { label: action, variant: "outline" as const };
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </DialogTitle>
          <DialogDescription>
            {fieldLabel || "Campo"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : auditEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum histórico registrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditEntries.map((entry) => {
                const actionInfo = getActionLabel(entry.action);
                return (
                  <div
                    key={entry.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={actionInfo.variant}>{actionInfo.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm:ss", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    {entry.action === "update" && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded line-through">
                          {entry.old_value || "(vazio)"}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 rounded">
                          {entry.new_value || "(vazio)"}
                        </span>
                      </div>
                    )}

                    {entry.action === "create" && (
                      <div className="text-sm">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 rounded">
                          {entry.new_value || "(vazio)"}
                        </span>
                      </div>
                    )}

                    {entry.reason && (
                      <p className="text-sm text-muted-foreground italic">
                        Motivo: {entry.reason}
                      </p>
                    )}

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{entry.user_name}</span>
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

export default FieldAuditDialog;
