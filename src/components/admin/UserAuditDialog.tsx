import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  History, Plus, Pencil, Trash2, CheckCircle, XCircle, 
  FileSignature, Download, Eye
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Profile {
  id: string;
  full_name: string;
}

interface AuditEntry {
  id: string;
  module: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changed_fields: string[] | null;
  user_email: string | null;
  user_name: string | null;
  created_at: string;
}

interface UserAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile;
}

const actionConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  create: { label: "Criou", icon: Plus, color: "bg-green-500" },
  update: { label: "Atualizou", icon: Pencil, color: "bg-blue-500" },
  delete: { label: "Excluiu", icon: Trash2, color: "bg-red-500" },
  approve: { label: "Aprovou", icon: CheckCircle, color: "bg-emerald-500" },
  reject: { label: "Rejeitou", icon: XCircle, color: "bg-orange-500" },
  sign: { label: "Assinou", icon: FileSignature, color: "bg-purple-500" },
  export: { label: "Exportou", icon: Download, color: "bg-cyan-500" },
  read: { label: "Visualizou", icon: Eye, color: "bg-gray-500" },
};

const moduleLabels: Record<string, string> = {
  study: "Estudo",
  visit: "Visita",
  edc: "EDC",
  etmf: "eTMF",
  regulatory: "Regulatório",
  payment: "Pagamento",
  user: "Usuário",
  project: "Projeto",
  participant: "Participante",
  other: "Outro",
};

const UserAuditDialog = ({
  open,
  onOpenChange,
  user,
}: UserAuditDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    if (open) {
      fetchAuditLog();
    }
  }, [open, user.id]);

  const fetchAuditLog = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("system_audit_log")
      .select("id, module, entity_type, entity_id, action, changed_fields, user_email, user_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error) {
      setAuditEntries(data || []);
    }
    
    setLoading(false);
  };

  const getActionBadge = (action: string) => {
    const config = actionConfig[action] || { label: action, icon: History, color: "bg-gray-500" };
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Atividades
          </DialogTitle>
          <DialogDescription>
            Atividades recentes de <strong>{user.full_name}</strong>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : auditEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma atividade registrada</p>
            </div>
          ) : (
            <div className="space-y-1">
              {auditEntries.map((entry, index) => {
                const isLast = index === auditEntries.length - 1;
                
                return (
                  <div key={entry.id} className="relative flex gap-4 pb-6">
                    {/* Timeline line */}
                    {!isLast && (
                      <div className="absolute left-[19px] top-10 h-full w-px bg-border" />
                    )}
                    
                    {/* Timeline dot */}
                    <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {(() => {
                        const config = actionConfig[entry.action] || actionConfig.read;
                        const Icon = config.icon;
                        return <Icon className="h-4 w-4 text-muted-foreground" />;
                      })()}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getActionBadge(entry.action)}
                        <Badge variant="secondary">
                          {moduleLabels[entry.module] || entry.module}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {entry.entity_type}
                        </span>
                      </div>
                      
                      {entry.changed_fields && entry.changed_fields.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Campos alterados: {entry.changed_fields.join(", ")}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
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

export default UserAuditDialog;
