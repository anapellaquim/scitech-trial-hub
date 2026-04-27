import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";

interface BudgetItem {
  id?: string;
  category: string;
  description: string;
  quantity: number;
  unit_value: number;
  notes: string;
  display_order: number;
  _isNew?: boolean;
}

const CATEGORIES = [
  "service_fee", "milestone", "pass_through", "expenses",
  "personnel", "equipment", "supplies", "travel", "other",
];

const CATEGORY_LABELS: Record<string, string> = {
  service_fee: "Service Fee",
  milestone: "Milestone",
  pass_through: "Pass-through",
  expenses: "Expenses",
  personnel: "Personnel",
  equipment: "Equipment",
  supplies: "Supplies",
  travel: "Travel",
  other: "Other",
};

interface Props {
  contractId: string;
  qualificationId: string;
  currency?: string;
}

export default function ContractBudgetItems({ contractId, qualificationId, currency = "USD" }: Props) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("qualification_contract_budget_items" as any)
      .select("*")
      .eq("contract_id", contractId)
      .order("display_order", { ascending: true });
    if (error) { toast.error("Failed to load budget"); setLoading(false); return; }
    setItems(((data as any) || []).map((d: any) => ({
      id: d.id, category: d.category, description: d.description,
      quantity: Number(d.quantity), unit_value: Number(d.unit_value),
      notes: d.notes || "", display_order: d.display_order || 0,
    })));
    setToDelete([]);
    setLoading(false);
  }, [contractId]);

  useEffect(() => { load(); }, [load]);

  const addItem = () => {
    setItems([...items, {
      category: "service_fee", description: "", quantity: 1, unit_value: 0,
      notes: "", display_order: items.length, _isNew: true,
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
        await supabase.from("qualification_contract_budget_items" as any).delete().in("id", toDelete);
      }
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const payload: any = {
          contract_id: contractId,
          qualification_id: qualificationId,
          category: it.category,
          description: it.description,
          quantity: it.quantity,
          unit_value: it.unit_value,
          notes: it.notes || null,
          display_order: i,
        };
        if (it.id) {
          await supabase.from("qualification_contract_budget_items" as any).update(payload).eq("id", it.id);
        } else {
          await supabase.from("qualification_contract_budget_items" as any).insert(payload);
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

  const total = items.reduce((s, it) => s + it.quantity * it.unit_value, 0);
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(n);

  return (
    <div className="border rounded-md p-3 mt-3 bg-muted/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Receipt className="h-4 w-4" /> Budget Items
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No budget items.</p>
      ) : (
        <div className="overflow-x-auto bg-background rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Category</TableHead>
                <TableHead className="min-w-[180px]">Description</TableHead>
                <TableHead className="w-20">Qty</TableHead>
                <TableHead className="w-28">Unit Value</TableHead>
                <TableHead className="w-28">Total</TableHead>
                <TableHead className="w-32">Notes</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Select value={it.category} onValueChange={v => updateItem(i, "category", v)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input value={it.description} className="h-8" onChange={e => updateItem(i, "description", e.target.value)} /></TableCell>
                  <TableCell><Input type="number" step="0.01" value={it.quantity} className="h-8" onChange={e => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} /></TableCell>
                  <TableCell><Input type="number" step="0.01" value={it.unit_value} className="h-8" onChange={e => updateItem(i, "unit_value", parseFloat(e.target.value) || 0)} /></TableCell>
                  <TableCell className="text-sm font-medium">{fmt(it.quantity * it.unit_value)}</TableCell>
                  <TableCell><Input value={it.notes} className="h-8" onChange={e => updateItem(i, "notes", e.target.value)} /></TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 mt-2 border-t">
        <div className="text-sm">Total: <span className="font-medium text-primary">{fmt(total)}</span> <span className="text-muted-foreground">({items.length} items)</span></div>
        <Button type="button" size="sm" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Budget"}</Button>
      </div>
    </div>
  );
}
