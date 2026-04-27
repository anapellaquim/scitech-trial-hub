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
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import ExcelExportButton from "@/components/shared/ExcelExportButton";

export interface Stakeholder {
  id: string;
  project_id: string;
  stakeholder_type: string;
  name: string;
  organization: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
}

const STAKEHOLDER_TYPES = [
  { value: "sponsor", label: "Sponsor" },
  { value: "ethics_committee", label: "Ethics Committee" },
  { value: "regulatory_authority", label: "Regulatory Authority" },
  { value: "research_center", label: "Research Center" },
  { value: "vendor", label: "Vendor" },
  { value: "dsmb", label: "DSMB" },
  { value: "steering_committee", label: "Steering Committee" },
  { value: "investigator", label: "Investigator" },
  { value: "internal_team", label: "Internal Team" },
  { value: "other", label: "Other" },
];

interface Props {
  projectId: string;
}

export default function StakeholderList({ projectId }: Props) {
  const [records, setRecords] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Stakeholder | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState({
    stakeholder_type: "sponsor",
    name: "",
    organization: "",
    contact_email: "",
    contact_phone: "",
    notes: "",
  });

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data } = await supabase
      .from("communication_stakeholders")
      .select("*")
      .eq("project_id", projectId)
      .order("name");
    setRecords(data || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ stakeholder_type: "sponsor", name: "", organization: "", contact_email: "", contact_phone: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (s: Stakeholder) => {
    setEditing(s);
    setForm({
      stakeholder_type: s.stakeholder_type,
      name: s.name,
      organization: s.organization || "",
      contact_email: s.contact_email || "",
      contact_phone: s.contact_phone || "",
      notes: s.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload = {
      project_id: projectId,
      stakeholder_type: form.stakeholder_type as any,
      name: form.name.trim(),
      organization: form.organization.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from("communication_stakeholders").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("communication_stakeholders").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Created");
    }
    setDialogOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("communication_stakeholders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const filtered = records.filter((r) => {
    const ms =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.organization || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.contact_email || "").toLowerCase().includes(search.toLowerCase());
    const mt = typeFilter === "all" || r.stakeholder_type === typeFilter;
    return ms && mt;
  });

  const exportData = filtered.map((r) => ({
    Type: STAKEHOLDER_TYPES.find((t) => t.value === r.stakeholder_type)?.label || r.stakeholder_type,
    Name: r.name,
    Organization: r.organization || "",
    Email: r.contact_email || "",
    Phone: r.contact_phone || "",
    Notes: r.notes || "",
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Stakeholders
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-[200px]" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {STAKEHOLDER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExcelExportButton data={exportData} fileName="stakeholders" />
            <Button size="sm" onClick={openNew} disabled={!projectId}>
              <Plus className="h-4 w-4 mr-1" />
              New Stakeholder
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No stakeholders registered.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {STAKEHOLDER_TYPES.find((t) => t.value === r.stakeholder_type)?.label || r.stakeholder_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.organization || "-"}</TableCell>
                  <TableCell>{r.contact_email || "-"}</TableCell>
                  <TableCell>{r.contact_phone || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "New"} Stakeholder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Type *</Label>
              <Select value={form.stakeholder_type} onValueChange={(v) => setForm({ ...form, stakeholder_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAKEHOLDER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., John Smith or Sponsor PharmaCo" />
            </div>
            <div>
              <Label>Organization</Label>
              <Input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
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
    </Card>
  );
}
