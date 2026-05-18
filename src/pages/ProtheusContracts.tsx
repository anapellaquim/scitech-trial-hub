import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CTMSNav from "@/components/CTMSNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatDateOnly, parseLocalDate } from "@/lib/dateUtils";

type Contract = {
  id: string;
  contract_number: string;
  description: string | null;
  product: string | null;
  contract_date: string | null;
  supplier: string | null;
  quantity: number;
  unit_value: number;
  total_value: number;
  delivered_quantity: number;
  status: string;
};

const emptyForm = {
  contract_number: "",
  description: "",
  product: "",
  contract_date: "",
  supplier: "",
  quantity: "0",
  unit_value: "0",
  delivered_quantity: "0",
};

export default function ProtheusContracts() {
  const [rows, setRows] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("protheus_contracts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data as Contract[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (r: Contract) => {
    setEditingId(r.id);
    setForm({
      contract_number: r.contract_number,
      description: r.description ?? "",
      product: r.product ?? "",
      contract_date: r.contract_date ?? "",
      supplier: r.supplier ?? "",
      quantity: String(r.quantity ?? 0),
      unit_value: String(r.unit_value ?? 0),
      delivered_quantity: String(r.delivered_quantity ?? 0),
    });
    setOpen(true);
  };

  const qty = Number(form.quantity) || 0;
  const uv = Number(form.unit_value) || 0;
  const totalPreview = qty * uv;

  const save = async () => {
    if (!form.contract_number.trim()) {
      toast.error("Contract number is required");
      return;
    }
    const payload = {
      contract_number: form.contract_number.trim(),
      description: form.description || null,
      product: form.product || null,
      contract_date: form.contract_date || null,
      supplier: form.supplier || null,
      quantity: Number(form.quantity) || 0,
      unit_value: Number(form.unit_value) || 0,
      delivered_quantity: Number(form.delivered_quantity) || 0,
    };
    const q = editingId
      ? (supabase as any).from("protheus_contracts").update(payload).eq("id", editingId)
      : (supabase as any).from("protheus_contracts").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Contract updated" : "Contract created");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this contract?")) return;
    const { error } = await (supabase as any).from("protheus_contracts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Contract deleted");
    load();
  };

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "BRL" }).format(n || 0);

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      <main className="md:ml-[var(--ctms-sidebar-w,240px)] p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Protheus Contracts</h1>
            <p className="text-sm text-muted-foreground">Manage Protheus contracts and deliveries</p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> New Contract
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contracts yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.contract_number}</TableCell>
                      <TableCell>{r.product || "-"}</TableCell>
                      <TableCell>{r.supplier || "-"}</TableCell>
                      <TableCell>{r.contract_date ? formatDateOnly(parseLocalDate(r.contract_date)) : "-"}</TableCell>
                      <TableCell className="text-right">{Number(r.quantity)}</TableCell>
                      <TableCell className="text-right">{fmtMoney(Number(r.unit_value))}</TableCell>
                      <TableCell className="text-right">{fmtMoney(Number(r.total_value))}</TableCell>
                      <TableCell className="text-right">{Number(r.delivered_quantity)}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "inactive" ? "secondary" : "default"}>
                          {r.status === "inactive" ? "Inactive" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Contract" : "New Contract"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <Label>Contract Number *</Label>
                <Input value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} />
              </div>
              <div className="col-span-1">
                <Label>Contract Date</Label>
                <Input type="date" value={form.contract_date} onChange={(e) => setForm({ ...form, contract_date: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="col-span-1">
                <Label>Product</Label>
                <Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
              </div>
              <div className="col-span-1">
                <Label>Supplier</Label>
                <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              </div>
              <div className="col-span-1">
                <Label>Quantity</Label>
                <Input type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="col-span-1">
                <Label>Unit Value</Label>
                <Input type="number" min="0" step="any" value={form.unit_value} onChange={(e) => setForm({ ...form, unit_value: e.target.value })} />
              </div>
              <div className="col-span-1">
                <Label>Total Value (auto)</Label>
                <Input value={fmtMoney(totalPreview)} disabled />
              </div>
              <div className="col-span-1">
                <Label>Delivered Quantity</Label>
                <Input type="number" min="0" step="any" value={form.delivered_quantity} onChange={(e) => setForm({ ...form, delivered_quantity: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
