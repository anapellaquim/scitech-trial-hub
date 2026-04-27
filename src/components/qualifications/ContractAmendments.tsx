import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, FileSignature } from "lucide-react";
import { toast } from "sonner";

interface Amendment {
  id: string;
  qualification_id: string;
  amendment_number: string;
  title: string;
  description: string | null;
  status: string;
  requested_date: string | null;
  signed_date: string | null;
  effective_date: string | null;
  financial_impact: number | null;
  document_url: string | null;
  notes: string | null;
}

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "signed", label: "Signed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  signed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-zinc-100 text-zinc-800",
};

interface Props {
  qualificationId: string;
}

const emptyForm = {
  amendment_number: "", title: "", description: "", status: "draft",
  requested_date: "", signed_date: "", effective_date: "",
  financial_impact: "", document_url: "", notes: "",
};

export default function ContractAmendments({ qualificationId }: Props) {
  const [items, setItems] = useState<Amendment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Amendment | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("qualification_contract_amendments" as any)
      .select("*")
      .eq("qualification_id", qualificationId)
      .order("created_at", { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  }, [qualificationId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, amendment_number: `A${String(items.length + 1).padStart(2, "0")}` });
    setOpen(true);
  };

  const openEdit = (a: Amendment) => {
    setEditing(a);
    setForm({
      amendment_number: a.amendment_number, title: a.title, description: a.description || "",
      status: a.status, requested_date: a.requested_date || "", signed_date: a.signed_date || "",
      effective_date: a.effective_date || "", financial_impact: a.financial_impact?.toString() || "",
      document_url: a.document_url || "", notes: a.notes || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.amendment_number.trim() || !form.title.trim()) {
      toast.error("Number and title are required"); return;
    }
    const payload = {
      qualification_id: qualificationId,
      amendment_number: form.amendment_number.trim(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      requested_date: form.requested_date || null,
      signed_date: form.signed_date || null,
      effective_date: form.effective_date || null,
      financial_impact: form.financial_impact ? parseFloat(form.financial_impact) : null,
      document_url: form.document_url.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from("qualification_contract_amendments" as any).update(payload).eq("id", editing.id);
      if (error) { toast.error("Error updating"); return; }
    } else {
      const { error } = await supabase.from("qualification_contract_amendments" as any).insert(payload);
      if (error) { toast.error("Error creating"); return; }
    }
    toast.success("Saved");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this amendment?")) return;
    await supabase.from("qualification_contract_amendments" as any).delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSignature className="h-4 w-4" />
            Contract Amendments
          </CardTitle>
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />Add Amendment
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            No contract amendments registered yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Nº</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[110px]">Signed</TableHead>
                <TableHead className="w-[110px]">Effective</TableHead>
                <TableHead className="w-[110px]">Impact</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.amendment_number}</TableCell>
                  <TableCell>
                    <div className="font-medium">{a.title}</div>
                    {a.description && <div className="text-xs text-muted-foreground line-clamp-2">{a.description}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[a.status] || ""}>
                      {statusOptions.find(s => s.value === a.status)?.label || a.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{a.signed_date || "-"}</TableCell>
                  <TableCell>{a.effective_date || "-"}</TableCell>
                  <TableCell>{a.financial_impact != null ? a.financial_impact.toLocaleString() : "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Amendment</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Number</Label><Input value={form.amendment_number} onChange={e => setForm({ ...form, amendment_number: e.target.value })} /></div>
              <div className="col-span-2"><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            </div>
            <div>
              <Label>Description of Changes</Label>
              <Textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the contractual changes introduced by this amendment..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Financial Impact</Label><Input type="number" step="0.01" value={form.financial_impact} onChange={e => setForm({ ...form, financial_impact: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Requested Date</Label><Input type="date" value={form.requested_date} onChange={e => setForm({ ...form, requested_date: e.target.value })} /></div>
              <div><Label>Signed Date</Label><Input type="date" value={form.signed_date} onChange={e => setForm({ ...form, signed_date: e.target.value })} /></div>
              <div><Label>Effective Date</Label><Input type="date" value={form.effective_date} onChange={e => setForm({ ...form, effective_date: e.target.value })} /></div>
            </div>
            <div><Label>Document URL</Label><Input value={form.document_url} onChange={e => setForm({ ...form, document_url: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
