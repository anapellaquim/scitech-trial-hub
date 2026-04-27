import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import ContractAmendments from "./ContractAmendments";
import ContractBudgetItems from "./ContractBudgetItems";

interface Contract {
  id: string;
  qualification_id: string;
  contract_number: string;
  title: string;
  contract_type: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  signed_date: string | null;
  value: number | null;
  currency: string | null;
  payment_terms: string | null;
  description: string | null;
  document_url: string | null;
  notes: string | null;
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

const emptyForm = {
  contract_number: "", title: "", contract_type: "", status: "negotiating",
  start_date: "", end_date: "", signed_date: "",
  value: "", currency: "BRL", payment_terms: "",
  description: "", document_url: "", notes: "",
};

interface Props {
  qualificationId: string;
}

export default function ContractsManager({ qualificationId }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("qualification_contracts" as any)
      .select("*")
      .eq("qualification_id", qualificationId)
      .order("created_at", { ascending: false });
    setContracts((data as any) || []);
    setLoading(false);
  }, [qualificationId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, contract_number: `C${String(contracts.length + 1).padStart(2, "0")}` });
    setOpen(true);
  };

  const openEdit = (c: Contract) => {
    setEditing(c);
    setForm({
      contract_number: c.contract_number, title: c.title, contract_type: c.contract_type || "",
      status: c.status, start_date: c.start_date || "", end_date: c.end_date || "",
      signed_date: c.signed_date || "", value: c.value?.toString() || "", currency: c.currency || "BRL",
      payment_terms: c.payment_terms || "",
      description: c.description || "", document_url: c.document_url || "", notes: c.notes || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.contract_number.trim() || !form.title.trim()) {
      toast.error("Number and title are required"); return;
    }
    const payload = {
      qualification_id: qualificationId,
      contract_number: form.contract_number.trim(),
      title: form.title.trim(),
      contract_type: form.contract_type.trim() || null,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      signed_date: form.signed_date || null,
      value: form.value ? parseFloat(form.value) : null,
      currency: form.currency || "BRL",
      description: form.description.trim() || null,
      document_url: form.document_url.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from("qualification_contracts" as any).update(payload).eq("id", editing.id);
      if (error) { toast.error("Error updating"); return; }
    } else {
      const { error } = await supabase.from("qualification_contracts" as any).insert(payload);
      if (error) { toast.error("Error creating"); return; }
    }
    toast.success("Saved");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this contract and all its amendments?")) return;
    await supabase.from("qualification_contract_amendments" as any).delete().eq("contract_id", id);
    await supabase.from("qualification_contracts" as any).delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Contracts
          </CardTitle>
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />Add Contract
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : contracts.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            No contracts registered yet for this vendor.
          </p>
        ) : (
          <Accordion type="multiple" className="w-full">
            {contracts.map(c => (
              <AccordionItem key={c.id} value={c.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <span className="font-mono text-xs text-muted-foreground">{c.contract_number}</span>
                    <span className="font-medium">{c.title}</span>
                    {c.contract_type && <Badge variant="outline">{c.contract_type}</Badge>}
                    <Badge className={statusColors[c.status] || ""}>
                      {statusOptions.find(s => s.value === c.status)?.label || c.status}
                    </Badge>
                    {c.value != null && (
                      <span className="text-sm text-muted-foreground ml-auto">
                        {c.currency} {c.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Signed:</span> {c.signed_date || "-"}</div>
                      <div><span className="text-muted-foreground">Start:</span> {c.start_date || "-"}</div>
                      <div><span className="text-muted-foreground">End:</span> {c.end_date || "-"}</div>
                    </div>
                    {c.description && <p className="text-sm">{c.description}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                        <Pencil className="h-3 w-3 mr-1" />Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => remove(c.id)}>
                        <Trash2 className="h-3 w-3 mr-1 text-destructive" />Delete
                      </Button>
                    </div>
                    <ContractAmendments qualificationId={qualificationId} contractId={c.id} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Contract</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Number</Label><Input value={form.contract_number} onChange={e => setForm({ ...form, contract_number: e.target.value })} /></div>
              <div className="col-span-2"><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type</Label><Input value={form.contract_type} onChange={e => setForm({ ...form, contract_type: e.target.value })} placeholder="MSA, SOW, NDA, ..." /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Signed Date</Label><Input type="date" value={form.signed_date} onChange={e => setForm({ ...form, signed_date: e.target.value })} /></div>
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2"><Label>Value</Label><Input type="number" step="0.01" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></div>
              <div><Label>Currency</Label><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
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
