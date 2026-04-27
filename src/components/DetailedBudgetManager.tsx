import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileSpreadsheet, Upload, Download, Receipt } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface BudgetItem {
  id?: string;
  year: number | null;
  category: string;
  description: string;
  quantity: number;
  unit_value: number;
  vendor: string;
  notes: string;
  display_order: number;
  _isNew?: boolean;
}

const CATEGORIES = [
  "personnel", "equipment", "supplies", "vendor_services",
  "site_payments", "regulatory", "travel", "overhead", "other",
];

const CATEGORY_LABELS: Record<string, string> = {
  personnel: "Personnel",
  equipment: "Equipment",
  supplies: "Supplies",
  vendor_services: "Vendor Services",
  site_payments: "Site Payments",
  regulatory: "Regulatory",
  travel: "Travel",
  overhead: "Overhead",
  other: "Other",
};

interface Props {
  projectId: string;
}

const DetailedBudgetManager = ({ projectId }: Props) => {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, [projectId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_budget_items")
      .select("*")
      .eq("project_id", projectId)
      .order("display_order", { ascending: true });
    if (error) { toast.error("Failed to load budget items"); setLoading(false); return; }
    setItems((data || []).map((d: any) => ({
      id: d.id, year: d.year, category: d.category, description: d.description,
      quantity: Number(d.quantity), unit_value: Number(d.unit_value),
      vendor: d.vendor || "", notes: d.notes || "", display_order: d.display_order || 0,
    })));
    setToDelete([]);
    setLoading(false);
  };

  const addItem = () => {
    setItems([...items, {
      year: new Date().getFullYear(), category: "other", description: "",
      quantity: 1, unit_value: 0, vendor: "", notes: "",
      display_order: items.length, _isNew: true,
    }]);
  };

  const updateItem = (i: number, field: keyof BudgetItem, value: any) => {
    const next = [...items];
    (next[i] as any)[field] = value;
    setItems(next);
  };

  const removeItem = (i: number) => {
    const item = items[i];
    if (item.id) setToDelete([...toDelete, item.id]);
    setItems(items.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    setSaving(true);
    try {
      if (toDelete.length) {
        await supabase.from("project_budget_items").delete().in("id", toDelete);
      }
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const payload = {
          project_id: projectId,
          year: it.year || null,
          category: it.category,
          description: it.description,
          quantity: it.quantity,
          unit_value: it.unit_value,
          vendor: it.vendor || null,
          notes: it.notes || null,
          display_order: i,
        };
        if (it.id) {
          await supabase.from("project_budget_items").update(payload).eq("id", it.id);
        } else {
          await supabase.from("project_budget_items").insert(payload);
        }
      }
      toast.success("Budget saved");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    const rows = items.map((it) => ({
      Year: it.year ?? "",
      Category: CATEGORY_LABELS[it.category] || it.category,
      Description: it.description,
      Quantity: it.quantity,
      "Unit Value": it.unit_value,
      Total: it.quantity * it.unit_value,
      Vendor: it.vendor,
      Notes: it.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{
      Year: "", Category: "", Description: "", Quantity: "", "Unit Value": "", Total: "", Vendor: "", Notes: "",
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Budget");
    XLSX.writeFile(wb, `budget_${projectId.slice(0, 8)}.xlsx`);
  };

  const downloadTemplate = () => {
    const sample = [{
      Year: new Date().getFullYear(), Category: "personnel",
      Description: "Study Coordinator (12 months)",
      Quantity: 12, "Unit Value": 8000, Vendor: "", Notes: "",
    }];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "budget_template.xlsx");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!raw.length) { toast.error("Empty file"); return; }
        const imported: BudgetItem[] = raw.map((r, idx) => {
          const catRaw = String(r.Category || "other").toLowerCase().trim();
          const category = CATEGORIES.includes(catRaw)
            ? catRaw
            : (Object.entries(CATEGORY_LABELS).find(([, l]) => l.toLowerCase() === catRaw)?.[0] || "other");
          return {
            year: r.Year ? Number(r.Year) : null,
            category,
            description: String(r.Description || ""),
            quantity: Number(r.Quantity) || 0,
            unit_value: Number(r["Unit Value"]) || 0,
            vendor: String(r.Vendor || ""),
            notes: String(r.Notes || ""),
            display_order: items.length + idx,
            _isNew: true,
          };
        });
        setItems([...items, ...imported]);
        toast.success(`${imported.length} rows imported (review and save)`);
        if (fileRef.current) fileRef.current.value = "";
      } catch {
        toast.error("Failed to parse file");
      }
    };
    reader.readAsBinaryString(file);
  };

  const total = items.reduce((s, it) => s + it.quantity * it.unit_value, 0);
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  if (loading) return <div className="text-sm text-muted-foreground">Loading detailed budget...</div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Detailed Budget</CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Template
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Import
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImport}
            />
            <Button type="button" variant="outline" size="sm" onClick={exportExcel} disabled={!items.length}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No budget items yet. Add manually or import from a spreadsheet.
          </p>
        ) : (
          <div className="overflow-x-auto border rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Year</TableHead>
                  <TableHead className="w-36">Category</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="w-20">Qty</TableHead>
                  <TableHead className="w-28">Unit Value</TableHead>
                  <TableHead className="w-28">Total</TableHead>
                  <TableHead className="w-32">Vendor</TableHead>
                  <TableHead className="w-32">Notes</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Input type="number" value={it.year ?? ""} className="h-8"
                        onChange={(e) => updateItem(i, "year", e.target.value ? parseInt(e.target.value) : null)} />
                    </TableCell>
                    <TableCell>
                      <Select value={it.category} onValueChange={(v) => updateItem(i, "category", v)}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input value={it.description} className="h-8"
                        onChange={(e) => updateItem(i, "description", e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" value={it.quantity} className="h-8"
                        onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" value={it.unit_value} className="h-8"
                        onChange={(e) => updateItem(i, "unit_value", parseFloat(e.target.value) || 0)} />
                    </TableCell>
                    <TableCell className="text-sm font-medium">{fmt(it.quantity * it.unit_value)}</TableCell>
                    <TableCell>
                      <Input value={it.vendor} className="h-8"
                        onChange={(e) => updateItem(i, "vendor", e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Input value={it.notes} className="h-8"
                        onChange={(e) => updateItem(i, "notes", e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => removeItem(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="pt-3 border-t flex items-center justify-between">
          <div className="text-sm font-medium">
            Total: <span className="text-primary">{fmt(total)}</span>
            <span className="text-muted-foreground ml-2">({items.length} items)</span>
          </div>
          <Button type="button" onClick={save} disabled={saving} size="sm">
            {saving ? "Saving..." : "Save Budget"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DetailedBudgetManager;
