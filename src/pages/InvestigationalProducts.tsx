import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import CTMSNav from "@/components/CTMSNav";
import ExcelExportButton from "@/components/shared/ExcelExportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, Upload } from "lucide-react";
import BulkImportDialog, { type ColumnMapping } from "@/components/shared/BulkImportDialog";

interface IPRecord {
  id: string;
  code: string;
  description: string | null;
  lot_number: string | null;
  expiration_date: string | null;
  quantity: number | null;
  site: string | null;
  invoice: string | null;
  correction_invoice: string | null;
  delivery_date: string | null;
  usage: string | null;
  usage_date: string | null;
  return_info: string | null;
  note: string | null;
}

const emptyForm = () => ({
  id: "",
  code: "",
  description: "",
  lot_number: "",
  expiration_date: "",
  quantity: "" as string | number,
  site: "",
  invoice: "",
  correction_invoice: "",
  delivery_date: "",
  usage: "",
  usage_date: "",
  return_info: "",
  note: "",
});

export default function InvestigationalProducts() {
  const [records, setRecords] = useState<IPRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<IPRecord | null>(null);
  const [form, setForm] = useState(emptyForm());

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("investigational_products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load: " + error.message);
    else setRecords((data || []) as IPRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (r: IPRecord) => {
    setEditing(r);
    setForm({
      id: r.id,
      code: r.code,
      description: r.description || "",
      lot_number: r.lot_number || "",
      expiration_date: r.expiration_date || "",
      quantity: r.quantity ?? "",
      site: r.site || "",
      invoice: r.invoice || "",
      correction_invoice: r.correction_invoice || "",
      delivery_date: r.delivery_date || "",
      usage: r.usage || "",
      usage_date: r.usage_date || "",
      return_info: r.return_info || "",
      note: r.note || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error("Code is required");
      return;
    }
    const payload = {
      code: form.code.trim(),
      description: form.description || null,
      lot_number: form.lot_number || null,
      expiration_date: form.expiration_date || null,
      quantity: form.quantity === "" ? null : Number(form.quantity),
      site: form.site || null,
      invoice: form.invoice || null,
      correction_invoice: form.correction_invoice || null,
      delivery_date: form.delivery_date || null,
      usage: form.usage || null,
      usage_date: form.usage_date || null,
      return_info: form.return_info || null,
      note: form.note || null,
    };
    const { error } = editing
      ? await supabase.from("investigational_products").update(payload).eq("id", editing.id)
      : await supabase.from("investigational_products").insert(payload);
    if (error) {
      toast.error("Save failed: " + error.message);
      return;
    }
    toast.success(editing ? "IP updated" : "IP created");
    setDialogOpen(false);
    loadRecords();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this IP record?")) return;
    const { error } = await supabase.from("investigational_products").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed: " + error.message);
      return;
    }
    toast.success("Deleted");
    loadRecords();
  };

  const exportData = useMemo(
    () =>
      records.map((r) => ({
        Code: r.code,
        Description: r.description,
        "Lot#": r.lot_number,
        Expiration: r.expiration_date,
        Quantity: r.quantity,
        Site: r.site,
        Invoice: r.invoice,
        "Correction Invoice": r.correction_invoice,
        "Delivery date": r.delivery_date,
        Usage: r.usage,
        "Usage date": r.usage_date,
        Return: r.return_info,
        Note: r.note,
      })),
    [records],
  );

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-7 w-7" /> IP — Investigational Product
            </h2>
            <p className="text-muted-foreground">
              Shipment and movement control of investigational devices
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ExcelExportButton data={exportData} fileName="investigational-products" />
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> New IP
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No IP records yet. Click "New IP" to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Lot#</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Correction Invoice</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Usage date</TableHead>
                      <TableHead>Return</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.code}</TableCell>
                        <TableCell className="text-sm">{r.description || "—"}</TableCell>
                        <TableCell className="text-sm">{r.lot_number || "—"}</TableCell>
                        <TableCell className="text-sm">{r.expiration_date || "—"}</TableCell>
                        <TableCell className="text-sm">{r.quantity ?? "—"}</TableCell>
                        <TableCell className="text-sm">{r.site || "—"}</TableCell>
                        <TableCell className="text-sm">{r.invoice || "—"}</TableCell>
                        <TableCell className="text-sm">{r.correction_invoice || "—"}</TableCell>
                        <TableCell className="text-sm">{r.delivery_date || "—"}</TableCell>
                        <TableCell className="text-sm">{r.usage || "—"}</TableCell>
                        <TableCell className="text-sm">{r.usage_date || "—"}</TableCell>
                        <TableCell className="text-sm">{r.return_info || "—"}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={r.note || ""}>
                          {r.note || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit IP" : "New IP"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Lot#</Label>
                <Input value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Expiration</Label>
                <Input type="date" value={form.expiration_date} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Site</Label>
                <Input value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Delivery date</Label>
                <Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Invoice</Label>
                <Input value={form.invoice} onChange={(e) => setForm({ ...form, invoice: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Correction Invoice</Label>
                <Input value={form.correction_invoice} onChange={(e) => setForm({ ...form, correction_invoice: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Usage</Label>
                <Input value={form.usage} onChange={(e) => setForm({ ...form, usage: e.target.value })} placeholder="e.g. implanted, discarded" />
              </div>
              <div className="space-y-2">
                <Label>Usage date</Label>
                <Input type="date" value={form.usage_date} onChange={(e) => setForm({ ...form, usage_date: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Return</Label>
                <Input value={form.return_info} onChange={(e) => setForm({ ...form, return_info: e.target.value })} placeholder="Return info / date / reason" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Note</Label>
                <Textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="button" onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
