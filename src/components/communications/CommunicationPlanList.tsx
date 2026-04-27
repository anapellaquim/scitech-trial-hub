import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, CalendarClock, ListChecks, RefreshCw } from "lucide-react";
import ExcelExportButton from "@/components/shared/ExcelExportButton";
import OccurrencesPanel from "./CommunicationOccurrencesPanel";

interface Stakeholder {
  id: string;
  name: string;
  stakeholder_type: string;
}

interface Plan {
  id: string;
  project_id: string;
  title: string;
  purpose: string | null;
  description: string | null;
  channel: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  due_day_offset: number;
  lead_time_days: number;
  sender_stakeholder_id: string | null;
  is_mandatory: boolean;
  is_active: boolean;
}

interface Recipient {
  id: string;
  plan_id: string;
  stakeholder_id: string;
  role: string;
}

const FREQUENCIES = [
  { value: "once", label: "Once" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semiannual", label: "Semiannual" },
  { value: "annual", label: "Annual" },
  { value: "on_event", label: "On Event" },
];

const CHANNELS = [
  { value: "email", label: "Email" },
  { value: "etmf", label: "eTMF" },
  { value: "portal", label: "Portal" },
  { value: "meeting", label: "Meeting" },
  { value: "letter", label: "Letter" },
  { value: "phone", label: "Phone" },
  { value: "system", label: "System" },
  { value: "other", label: "Other" },
];

const RECIPIENT_ROLES = [
  { value: "to", label: "To" },
  { value: "cc", label: "Cc" },
  { value: "bcc", label: "Bcc" },
  { value: "informed", label: "Informed" },
];

interface Props {
  projectId: string;
}

export default function CommunicationPlanList({ projectId }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [occurrencesOpen, setOccurrencesOpen] = useState(false);
  const [occurrencesPlan, setOccurrencesPlan] = useState<Plan | null>(null);

  const [form, setForm] = useState({
    title: "",
    purpose: "",
    description: "",
    channel: "email",
    frequency: "monthly",
    start_date: "",
    end_date: "",
    due_day_offset: 1,
    lead_time_days: 3,
    sender_stakeholder_id: "",
    is_mandatory: true,
    is_active: true,
  });
  const [formRecipients, setFormRecipients] = useState<{ stakeholder_id: string; role: string }[]>([]);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const [{ data: pl }, { data: st }, { data: rc }] = await Promise.all([
      supabase.from("communication_plans").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("communication_stakeholders").select("id, name, stakeholder_type").eq("project_id", projectId).order("name"),
      supabase.from("communication_plan_recipients").select("*"),
    ]);
    setPlans(pl || []);
    setStakeholders(st || []);
    setRecipients(rc || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({
      title: "",
      purpose: "",
      description: "",
      channel: "email",
      frequency: "monthly",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      due_day_offset: 1,
      lead_time_days: 3,
      sender_stakeholder_id: "",
      is_mandatory: true,
      is_active: true,
    });
    setFormRecipients([]);
    setDialogOpen(true);
  };

  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({
      title: p.title,
      purpose: p.purpose || "",
      description: p.description || "",
      channel: p.channel,
      frequency: p.frequency,
      start_date: p.start_date,
      end_date: p.end_date || "",
      due_day_offset: p.due_day_offset,
      lead_time_days: p.lead_time_days,
      sender_stakeholder_id: p.sender_stakeholder_id || "",
      is_mandatory: p.is_mandatory,
      is_active: p.is_active,
    });
    setFormRecipients(
      recipients.filter((r) => r.plan_id === p.id).map((r) => ({ stakeholder_id: r.stakeholder_id, role: r.role }))
    );
    setDialogOpen(true);
  };

  const toggleRecipient = (sid: string) => {
    setFormRecipients((prev) =>
      prev.find((r) => r.stakeholder_id === sid)
        ? prev.filter((r) => r.stakeholder_id !== sid)
        : [...prev, { stakeholder_id: sid, role: "to" }]
    );
  };

  const setRecipientRole = (sid: string, role: string) => {
    setFormRecipients((prev) => prev.map((r) => (r.stakeholder_id === sid ? { ...r, role } : r)));
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.start_date) return toast.error("Start date is required");

    const payload = {
      project_id: projectId,
      title: form.title.trim(),
      purpose: form.purpose.trim() || null,
      description: form.description.trim() || null,
      channel: form.channel as any,
      frequency: form.frequency as any,
      start_date: form.start_date,
      end_date: form.end_date || null,
      due_day_offset: form.due_day_offset,
      lead_time_days: form.lead_time_days,
      sender_stakeholder_id: form.sender_stakeholder_id || null,
      is_mandatory: form.is_mandatory,
      is_active: form.is_active,
    };

    let planId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("communication_plans").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from("communication_plans").insert(payload).select("id").single();
      if (error) return toast.error(error.message);
      planId = data.id;
    }

    if (planId) {
      // Reset recipients
      await supabase.from("communication_plan_recipients").delete().eq("plan_id", planId);
      if (formRecipients.length > 0) {
        await supabase.from("communication_plan_recipients").insert(
          formRecipients.map((r) => ({ plan_id: planId, stakeholder_id: r.stakeholder_id, role: r.role as any }))
        );
      }
      // Generate occurrences
      const { error: rpcErr } = await supabase.rpc("generate_communication_occurrences", { _plan_id: planId });
      if (rpcErr) console.warn("Occurrences generation:", rpcErr.message);
    }

    toast.success(editing ? "Updated" : "Created");
    setDialogOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this communication plan and all its occurrences?")) return;
    await supabase.from("communication_occurrences").delete().eq("plan_id", id);
    await supabase.from("communication_plan_recipients").delete().eq("plan_id", id);
    const { error } = await supabase.from("communication_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const handleRegenerate = async (id: string) => {
    const { error } = await supabase.rpc("generate_communication_occurrences", { _plan_id: id });
    if (error) return toast.error(error.message);
    toast.success("Occurrences regenerated");
  };

  const openOccurrences = (p: Plan) => {
    setOccurrencesPlan(p);
    setOccurrencesOpen(true);
  };

  const filtered = plans.filter((p) => {
    const ms =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.purpose || "").toLowerCase().includes(search.toLowerCase());
    const mc = channelFilter === "all" || p.channel === channelFilter;
    const mst = statusFilter === "all" || (statusFilter === "active" ? p.is_active : !p.is_active);
    return ms && mc && mst;
  });

  const exportData = filtered.map((p) => {
    const recs = recipients.filter((r) => r.plan_id === p.id);
    const sender = stakeholders.find((s) => s.id === p.sender_stakeholder_id);
    return {
      Title: p.title,
      Purpose: p.purpose || "",
      Channel: CHANNELS.find((c) => c.value === p.channel)?.label || p.channel,
      Frequency: FREQUENCIES.find((f) => f.value === p.frequency)?.label || p.frequency,
      Sender: sender?.name || "",
      Recipients: recs
        .map((r) => {
          const s = stakeholders.find((x) => x.id === r.stakeholder_id);
          return s ? `${s.name} (${r.role.toUpperCase()})` : "";
        })
        .filter(Boolean)
        .join("; "),
      "Start Date": p.start_date,
      "End Date": p.end_date || "",
      "Lead Time (days)": p.lead_time_days,
      Mandatory: p.is_mandatory ? "Yes" : "No",
      Status: p.is_active ? "Active" : "Inactive",
    };
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Communication Plan
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-[200px]" />
            </div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <ExcelExportButton data={exportData} fileName="communication_plans" />
            <Button size="sm" onClick={openNew} disabled={!projectId}>
              <Plus className="h-4 w-4 mr-1" />
              New Plan
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No communication plans yet. Create one to start tracking mandatory communications for this study.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Mandatory</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const recs = recipients.filter((r) => r.plan_id === p.id);
                const sender = stakeholders.find((s) => s.id === p.sender_stakeholder_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.title}</div>
                      {p.purpose && <div className="text-xs text-muted-foreground">{p.purpose}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{CHANNELS.find((c) => c.value === p.channel)?.label}</Badge>
                    </TableCell>
                    <TableCell>{FREQUENCIES.find((f) => f.value === p.frequency)?.label}</TableCell>
                    <TableCell className="text-sm">{sender?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{recs.length}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.is_mandatory ? <Badge>Mandatory</Badge> : <Badge variant="outline">Optional</Badge>}
                    </TableCell>
                    <TableCell>
                      {p.is_active ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title="View occurrences" onClick={() => openOccurrences(p)}>
                          <ListChecks className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Regenerate occurrences" onClick={() => handleRegenerate(p.id)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Plan dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "New"} Communication Plan</DialogTitle>
            <DialogDescription>
              Define a recurring mandatory communication: who sends, who receives, channel and frequency.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Monthly enrollment report to Sponsor"
              />
            </div>
            <div>
              <Label>Purpose</Label>
              <Input
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="What this communication is for"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Channel *</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frequency *</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lead Time (days before due)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.lead_time_days}
                  onChange={(e) => setForm({ ...form, lead_time_days: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Sender Stakeholder</Label>
                <Select
                  value={form.sender_stakeholder_id || "none"}
                  onValueChange={(v) => setForm({ ...form, sender_stakeholder_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {stakeholders.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_mandatory} onCheckedChange={(v) => setForm({ ...form, is_mandatory: v })} />
                <Label>Mandatory</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>

            <div>
              <Label>Recipients</Label>
              {stakeholders.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">
                  No stakeholders registered yet. Add stakeholders in the Stakeholders tab first.
                </p>
              ) : (
                <div className="border rounded-md mt-2 max-h-[200px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Stakeholder</TableHead>
                        <TableHead className="w-[140px]">Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stakeholders.map((s) => {
                        const r = formRecipients.find((x) => x.stakeholder_id === s.id);
                        return (
                          <TableRow key={s.id}>
                            <TableCell>
                              <Checkbox checked={!!r} onCheckedChange={() => toggleRecipient(s.id)} />
                            </TableCell>
                            <TableCell>{s.name}</TableCell>
                            <TableCell>
                              {r && (
                                <Select value={r.role} onValueChange={(v) => setRecipientRole(s.id, v)}>
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {RECIPIENT_ROLES.map((rr) => (
                                      <SelectItem key={rr.value} value={rr.value}>
                                        {rr.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Occurrences dialog */}
      <Dialog open={occurrencesOpen} onOpenChange={setOccurrencesOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Occurrences — {occurrencesPlan?.title}</DialogTitle>
            <DialogDescription>Scheduled instances of this communication.</DialogDescription>
          </DialogHeader>
          {occurrencesPlan && <OccurrencesPanel planId={occurrencesPlan.id} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
