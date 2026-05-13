import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { History, User, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AuditLog {
  id: string;
  action: string;
  old_data: any;
  new_data: any;
  changed_fields: string[] | null;
  user_name: string | null;
  created_at: string;
}

export function AuditTrail({ entityId }: { entityId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function fetchLogs() {
      if (!entityId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("system_audit_log")
        .select("*")
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    }
    fetchLogs();
  }, [entityId]);

  if (loading) return <div className="text-xs text-muted-foreground p-2 italic">Loading history...</div>;
  if (logs.length === 0) return null;

  return (
    <div className="mt-4 border-t pt-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <History className="h-3 w-3" />
          Audit Trail ({logs.length})
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ScrollArea className="h-[150px] w-full mt-2 pr-4">
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="text-[11px] border-l-2 border-muted pl-3 py-1 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      {log.action === 'create' ? 'Created' : log.action === 'update' ? 'Updated' : 'Deleted'}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1 mb-1">
                    <User className="h-2.5 w-2.5" />
                    {log.user_name || 'System'}
                  </div>
                  {log.action === 'update' && log.changed_fields && (
                    <div className="mt-1">
                      <span className="font-medium">Changes: </span>
                      {log.changed_fields.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
