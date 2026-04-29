import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { todayDateOnly } from "@/lib/dateUtils";

interface Indicator {
  id: string;
  project_id: string;
  indicator_type: "KPI" | "KRI";
  area: string;
  name: string;
  description: string | null;
  target_value: string | null;
  current_value: string | null;
  unit: string | null;
  status: "on_track" | "at_risk" | "breached";
  measurement_frequency: string;
  last_measured_at: string | null;
  responsible: string | null;
  linked_risk_id: string | null;
}

const AREAS = [
  "Informed Consent / Eligibility",
  "Protocol Compliance",
  "Data / EDC",
  "Safety",
  "TMF / eTMF",
  "Primary Endpoints",
  "Device Performance",
  "Other",
];

const statusColors: Record<string, string> = {
  on_track: "bg-green-100 text-green-800",
  at_risk: "bg-yellow-100 text-yellow-800",
  breached: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  breached: "Breached",
};

export default function RiskIndicatorsTab({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Indicator | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const blank = {
    indicator_type: "KPI" as const,
    area: AREAS[0],
    name: "",
    description: "",
    target_value: "",
    current_value: "",
    unit: "",
    status: "on_track" as const,
    measurement_frequency: "monthly",
    last_measured_at: todayDateOnly(),
    responsible: "",
  };
  const [form, setForm] = useState(blank);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data } = await supabase
      .from("risk_indicators" as any)
      .select("*")
      .eq("project_id", projectId)
      .order("indicator_type")
      .order("area");
    setItems((data as any) || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const payload: any = {
      project_id: projectId,
      indicator_type: form.indicator_type,
      area: form.area,
      name: form.name.trim(),
      description: form.description.trim() || null,
      target_value: form.target_value.trim() || null,
      current_value: form.current_value.trim() || null,
      unit: form.unit.trim() || null,
      status: form.status,
      measurement_frequency: form.measurement_frequency,
      last_measured_at: form.last_measured_at || null,
      responsible: form.responsible.trim() || null,
    };
    if (editing) {
      await (supabase.from("risk_indicators" as any).update(payload).eq("id", editing.id) as any);
      toast.success("Indicator updated");
    } else {
      await (supabase.from("risk_indicators" as any).insert(payload) as any);
      toast.success("Indicator created");
    }
    setDialogOpen(false); setEditing(null); setForm(blank); load();
  };

  const remove = async (id: string) => {
    await (supabase.from("risk_indicators" as any).delete().eq("id", id) as any);
    toast.success("Deleted"); load();
  };

  const openEdit = (i: Indicator) => {
    setEditing(i);
    setForm({
      indicator_type: i.indicator_type,
      area: i.area,
      name: i.name,
      description: i.description || "",
      target_value: i.target_value || "",
      current_value: i.current_value || "",
      unit: i.unit || "",
      status: i.status,
      measurement_frequency: i.measurement_frequency,
      last_measured_at: i.last_measured_at || todayDateOnly(),
      responsible: i.responsible || "",
    });
    setDialogOpen(true);
  };

  const openNew = () => { setEditing(null); setForm(blank); setDialogOpen(true); };

  const filtered = items.filter(i => typeFilter === "all" || i.indicator_type === typeFilter);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <CardTitle>Performance & Risk Indicators (KPIs / KRIs)</CardTitle>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="KPI">KPI</SelectItem>
                <SelectItem value="KRI">KRI</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Indicator</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No indicators registered. Indicators are required by SOP §6.8.2 to monitor mitigation effectiveness.</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Type</TableHead><TableHead>Area</TableHead><TableHead>Indicator</TableHead>
              <TableHead>Target</TableHead><TableHead>Current</TableHead><TableHead>Status</TableHead>
              <TableHead>Frequency</TableHead><TableHead>Last Measured</TableHead><TableHead>Responsible</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(i => (
                <TableRow key={i.id}>
                  <TableCell><Badge variant={i.indicator_type === "KRI" ? "destructive" : "secondary"}>{i.indicator_type}</Badge></TableCell>
                  <TableCell className="text-sm">{i.area}</TableCell>
                  <TableCell className="font-medium max-w-[260px] truncate" title={i.name}>{i.name}</TableCell>
                  <TableCell>{i.target_value ? `${i.target_value}${i.unit ? " " + i.unit : ""}` : "-"}</TableCell>
                  <TableCell>{i.current_value ? `${i.current_value}${i.unit ? " " + i.unit : ""}` : "-"}</TableCell>
                  <TableCell><Badge className={statusColors[i.status]}>{statusLabels[i.status]}</Badge></TableCell>
                  <TableCell className="capitalize">{i.measurement_frequency}</TableCell>
                  <TableCell>{i.last_measured_at || "-"}</TableCell>
                  <TableCell>{i.responsible || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Indicator</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type</Label>
                <Select value={form.indicator_type} onValueChange={(v: any) => setForm({...form, indicator_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KPI">KPI – Performance</SelectItem>
                    <SelectItem value="KRI">KRI – Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Area</Label>
                <Select value={form.area} onValueChange={v => setForm({...form, area: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g., Enrollment rate per site/month" /></div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Target</Label><Input value={form.target_value} onChange={e => setForm({...form, target_value: e.target.value})} placeholder="e.g., 5" /></div>
              <div><Label>Current</Label><Input value={form.current_value} onChange={e => setForm({...form, current_value: e.target.value})} /></div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="%, count, days" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_track">On Track</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="breached">Breached</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Measurement Frequency</Label>
                <Select value={form.measurement_frequency} onValueChange={v => setForm({...form, measurement_frequency: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semiannual">Semiannual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="ad_hoc">Ad hoc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Last Measured</Label><Input type="date" value={form.last_measured_at} onChange={e => setForm({...form, last_measured_at: e.target.value})} /></div>
              <div><Label>Responsible</Label><Input value={form.responsible} onChange={e => setForm({...form, responsible: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
