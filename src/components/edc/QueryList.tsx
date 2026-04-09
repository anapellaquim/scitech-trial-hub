import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import QueryResponseDialog from "./QueryResponseDialog";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
} from "lucide-react";

interface QueryRecord {
  id: string;
  query_text: string;
  query_type: string;
  priority: string;
  status: string;
  opened_at: string | null;
  answered_at: string | null;
  closed_at: string | null;
  field_id: string | null;
}

interface QueryListProps {
  entryId: string;
  onQueryUpdate?: () => void;
}

const QueryList = ({ entryId, onQueryUpdate }: QueryListProps) => {
  const [loading, setLoading] = useState(true);
  const [queries, setQueries] = useState<QueryRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);

  useEffect(() => {
    fetchQueries();
  }, [entryId, statusFilter]);

  const fetchQueries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("data_queries")
        .select("*")
        .eq("entry_id", entryId)
        .order("opened_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQueries(data || []);
    } catch (error) {
      console.error("Error fetching queries:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "answered":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "closed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "destructive",
      answered: "default",
      closed: "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "text-gray-500",
      medium: "text-yellow-500",
      high: "text-orange-500",
      critical: "text-red-500",
    };
    return colors[priority] || "text-gray-500";
  };

  const openQueries = queries.filter((q) => q.status === "open").length;
  const answeredQueries = queries.filter((q) => q.status === "answered").length;
  const closedQueries = queries.filter((q) => q.status === "closed").length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Queries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Queries
            <div className="flex gap-1 ml-2">
              {openQueries > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {openQueries} open
                </Badge>
              )}
              {answeredQueries > 0 && (
                <Badge variant="default" className="text-xs">
                  {answeredQueries} answered
                </Badge>
              )}
            </div>
          </CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="answered">Answered</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {queries.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No queries found</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="space-y-3">
              {queries.map((query) => (
                <div
                  key={query.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedQuery(query.id)}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(query.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(query.status)}
                        <span className={`text-xs font-medium ${getPriorityColor(query.priority)}`}>
                          {query.priority}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {query.query_type}
                        </Badge>
                      </div>
                      <p className="text-sm line-clamp-2">{query.query_text}</p>
                      {query.opened_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Opened: {format(new Date(query.opened_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {selectedQuery && (
        <QueryResponseDialog
          open={!!selectedQuery}
          onClose={() => setSelectedQuery(null)}
          queryId={selectedQuery}
          onQueryUpdated={() => {
            fetchQueries();
            onQueryUpdate?.();
            setSelectedQuery(null);
          }}
        />
      )}
    </Card>
  );
};

export default QueryList;
