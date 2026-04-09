import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { MessageSquare, Send, CheckCircle, Clock, User } from "lucide-react";

interface QueryHistory {
  id: string;
  action: string;
  comment: string | null;
  created_at: string;
  user_id: string | null;
}

interface QueryData {
  id: string;
  query_text: string;
  query_type: string;
  priority: string;
  status: string;
  response_text: string | null;
  opened_at: string | null;
  answered_at: string | null;
  closed_at: string | null;
}

interface QueryResponseDialogProps {
  open: boolean;
  onClose: () => void;
  queryId: string;
  onQueryUpdated?: () => void;
}

const QueryResponseDialog = ({
  open,
  onClose,
  queryId,
  onQueryUpdated,
}: QueryResponseDialogProps) => {
  const { t } = useTranslation("edc");
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState<QueryData | null>(null);
  const [history, setHistory] = useState<QueryHistory[]>([]);
  const [responseText, setResponseText] = useState("");

  useEffect(() => {
    if (open && queryId) {
      fetchQueryData();
    }
  }, [open, queryId]);

  const fetchQueryData = async () => {
    setLoading(true);
    try {
      const { data: queryData, error: queryError } = await supabase
        .from("data_queries")
        .select("*")
        .eq("id", queryId)
        .single();

      if (queryError) throw queryError;
      setQuery(queryData);

      const { data: historyData, error: historyError } = await supabase
        .from("data_query_history")
        .select("*")
        .eq("query_id", queryId)
        .order("created_at", { ascending: true });

      if (historyError) throw historyError;
      setHistory(historyData || []);
    } catch (error) {
      console.error("Error fetching query:", error);
      toast({
        title: t("messages.error"),
        description: "Failed to load query data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!responseText.trim()) return;

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      await supabase
        .from("data_queries")
        .update({
          response_text: responseText.trim(),
          status: "answered",
          answered_by: userData.user?.id,
          answered_at: new Date().toISOString(),
        })
        .eq("id", queryId);

      await supabase.from("data_query_history").insert({
        query_id: queryId,
        action: "answered",
        comment: responseText.trim(),
        user_id: userData.user?.id,
      });

      toast({
        title: t("messages.saveSuccess"),
        description: "Query answered successfully",
      });

      onQueryUpdated?.();
      onClose();
    } catch (error) {
      console.error("Error responding:", error);
      toast({
        title: t("messages.error"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      await supabase
        .from("data_queries")
        .update({
          status: "closed",
          closed_by: userData.user?.id,
          closed_at: new Date().toISOString(),
        })
        .eq("id", queryId);

      await supabase.from("data_query_history").insert({
        query_id: queryId,
        action: "closed",
        comment: "Query closed",
        user_id: userData.user?.id,
      });

      toast({
        title: t("messages.saveSuccess"),
        description: "Query closed successfully",
      });

      onQueryUpdated?.();
      onClose();
    } catch (error) {
      console.error("Error closing:", error);
      toast({
        title: t("messages.error"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "secondary",
      medium: "default",
      high: "destructive",
      critical: "destructive",
    };
    return <Badge variant={variants[priority] || "default"}>{priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      answered: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      closed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || colors.open}`}>
        {status}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Query Details
          </DialogTitle>
          <DialogDescription>
            View and respond to this data query
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : query ? (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(query.status)}
                {getPriorityBadge(query.priority)}
                <Badge variant="outline">{query.query_type}</Badge>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <Label className="text-xs text-muted-foreground">Query Text</Label>
                <p className="mt-1">{query.query_text}</p>
                {query.opened_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Opened: {format(new Date(query.opened_at), "dd/MM/yyyy HH:mm")}
                  </p>
                )}
              </div>

              {query.response_text && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <Label className="text-xs text-muted-foreground">Response</Label>
                  <p className="mt-1">{query.response_text}</p>
                  {query.answered_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Answered: {format(new Date(query.answered_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <div className="flex-1 min-h-0">
              <Label className="text-sm font-medium">History</Label>
              <ScrollArea className="h-32 mt-2">
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 text-sm p-2 rounded bg-muted/30"
                    >
                      {item.action === "opened" && <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />}
                      {item.action === "answered" && <Send className="h-4 w-4 text-blue-500 mt-0.5" />}
                      {item.action === "closed" && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
                      <div className="flex-1">
                        <p className="font-medium capitalize">{item.action}</p>
                        {item.comment && <p className="text-muted-foreground">{item.comment}</p>}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {query.status === "open" && (
              <div className="space-y-2">
                <Label htmlFor="response">Your Response</Label>
                <Textarea
                  id="response"
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Enter your response to this query..."
                  rows={3}
                />
              </div>
            )}
          </>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {query?.status === "open" && (
            <Button onClick={handleRespond} disabled={submitting || !responseText.trim()}>
              <Send className="h-4 w-4 mr-1" />
              {submitting ? "Sending..." : "Send Response"}
            </Button>
          )}
          {query?.status === "answered" && (
            <Button onClick={handleClose} disabled={submitting}>
              <CheckCircle className="h-4 w-4 mr-1" />
              {submitting ? "Closing..." : "Close Query"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QueryResponseDialog;
