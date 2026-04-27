import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText } from "lucide-react";

interface Row {
  id: string;
  contract_number: string;
  title: string;
  contract_type: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  signed_date: string | null;
  value: number | null;
  currency: string | null;
  qualification_id: string;
  vendor_name: string;
  vendor_type: string;
  items_total: number;
}

const statusOptions = [
  { value: "negotiating", label: "Negotiating" },
  { value: "signed", label: "Signed" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "terminated", label: "Terminated" },
];

const statusColors: Record<string, string> = {
  negotiating: "bg-yellow-100 text-yellow-800",
  signed: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  expired: "bg-zinc-100 text-zinc-800",
  terminated: "bg-red-100 text-red-800",
};

interface Props {
  projectId: string;
}

export default function ContractsOverview({ projectId }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    let qualQuery = supabase.from("site_vendor_qualifications").select("id, name, vendor_type, project_id");
    if (projectId && projectId !== "all") qualQuery = qualQuery.eq("project_id", projectId);
    const { data: quals } = await qualQuery;
    const qualMap = new Map((quals || []).map((q: any) => [q.id, q]));
    const qualIds = Array.from(qualMap.keys());
    if (!qualIds.length) { setRows([]); setLoading(false); return; }

    const { data: contracts } = await supabase
      .from("qualification_contracts" as any)
      .select("*")
      .in("qualification_id", qualIds)
      .order("created_at", { ascending: false });

    const contractIds = ((contracts as any) || []).map((c: any) => c.id);
    let totals: Record<string, number> = {};
    if (contractIds.length) {
      const { data: items } = await supabase
        .from("qualification_contract_budget_items" as any)
        .select("contract_id, quantity, unit_value")
        .in("contract_id", contractIds);
      ((items as any) || []).forEach((it: any) => {
        const t = Number(it.quantity || 0) * Number(it.unit_value || 0);
        totals[it.contract_id] = (totals[it.contract_id] || 0) + t;
      });
    }

    const result: Row[] = ((contracts as any) || []).map((c: any) => {
      const q: any = qualMap.get(c.qualification_id) || {};
      return {
        id: c.id,
        contract_number: c.contract_number,
        title: c.title,
        contract_type: c.contract_type,
        status: c.status,
        start_date: c.start_date,
        end_date: c.end_date,
        signed_date: c.signed_date,
        value: c.value,
        currency: c.currency,
        qualification_id: c.qualification_id,
        vendor_name: q.name || "-",
        vendor_type: q.vendor_type || "-",
        items_total: totals[c.id] || 0,
      };
    });
    setRows(result);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { if (projectId) load(); }, [load, projectId]);

  const filtered = rows.filter(r => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.contract_number.toLowerCase().includes(search.toLowerCase()) ||
      r.vendor_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const fmt = (n: number, cur: string | null) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD" }).format(n);

  // Aggregate totals per currency
  const totalsByCurrency: Record<string, { items: number; value: number; count: number }> = {};
  filtered.forEach(r => {
    const cur = r.currency || "USD";
    if (!totalsByCurrency[cur]) totalsByCurrency[cur] = { items: 0, value: 0, count: 0 };
    totalsByCurrency[cur].items += r.items_total;
    totalsByCurrency[cur].value += r.value || 0;
    totalsByCurrency[cur].count += 1;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contracts Overview
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[220px]" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(totalsByCurrency).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {Object.entries(totalsByCurrency).map(([cur, t]) => (
              <div key={cur} className="rounded border p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">{cur} · {t.count} contract{t.count !== 1 ? "s" : ""}</div>
                <div className="text-sm mt-1">Contract value: <span className="font-medium">{fmt(t.value, cur)}</span></div>
                <div className="text-sm">Items total: <span className="font-medium text-primary">{fmt(t.items, cur)}</span></div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No contracts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signed</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Items Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.contract_number}</TableCell>
                    <TableCell className="font-medium">{r.vendor_name}</TableCell>
                    <TableCell>{r.title}</TableCell>
                    <TableCell>{r.contract_type || "-"}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[r.status] || ""}>
                        {statusOptions.find(s => s.value === r.status)?.label || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.signed_date || "-"}</TableCell>
                    <TableCell>{r.start_date || "-"}</TableCell>
                    <TableCell>{r.end_date || "-"}</TableCell>
                    <TableCell className="text-right">{r.value != null ? fmt(r.value, r.currency) : "-"}</TableCell>
                    <TableCell className="text-right font-medium text-primary">{fmt(r.items_total, r.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
