import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, SkipForward, RefreshCw } from "lucide-react";

interface Occurrence {
  id: string;
  plan_id: string;
  due_date: string;
  sent_date: string | null;
  status: string;
  evidence_url: string | null;
  notes: string | null;
}

interface Props {
  planId: string;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  sent: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  acknowledged: "bg-purple-100 text-purple-800",
  skipped: "bg-gray-100 text-gray-800",
};

export default function OccurrencesPanel({ planId }: Props) {
  const [items, setItems] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("communication_occurrences")
      .select("*")
      .eq("plan_id", planId)
      .order("due_date", { ascending: true });
    setItems(data || []);
    setLoading(false);
  }, [planId]);

  useEffect(() => {
    load();
  }, [load]);

  const markSent = async (id: string) => {
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("communication_occurrences")
      .update({ status: "sent", sent_date: today, completed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked as sent");
    load();
  };

  const markSkipped = async (id: string) => {
    const { error } = await supabase
      .from("communication_occurrences")
      .update({ status: "skipped" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked as skipped");
    load();
  };

  const updateEvidence = async (id: string, evidence_url: string) => {
    await supabase.from("communication_occurrences").update({ evidence_url }).eq("id", id);
    load();
  };

  const regenerate = async () => {
    const { error } = await supabase.rpc("generate_communication_occurrences", { _plan_id: planId });
    if (error) return toast.error(error.message);
    toast.success("Regenerated");
    load();
  };

  const filtered = items.filter((i) => statusFilter === "all" || i.status === statusFilter);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={regenerate}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Regenerate
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No occurrences.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent Date</TableHead>
              <TableHead>Evidence URL</TableHead>
              <TableHead className="w-[160px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{o.due_date}</TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[o.status] || ""}>{o.status}</Badge>
                </TableCell>
                <TableCell>{o.sent_date || "-"}</TableCell>
                <TableCell>
                  <Input
                    defaultValue={o.evidence_url || ""}
                    placeholder="https://..."
                    onBlur={(e) => {
                      if (e.target.value !== (o.evidence_url || "")) updateEvidence(o.id, e.target.value);
                    }}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {o.status !== "sent" && o.status !== "acknowledged" && (
                      <Button size="icon" variant="ghost" title="Mark as sent" onClick={() => markSent(o.id)}>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    {o.status === "scheduled" || o.status === "overdue" ? (
                      <Button size="icon" variant="ghost" title="Skip" onClick={() => markSkipped(o.id)}>
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
