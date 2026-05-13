import { parseLocalDate, formatDateOnly, todayDateOnly } from "@/lib/dateUtils";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import CTMSNav from "@/components/CTMSNav";
import ExcelExportButton from "@/components/shared/ExcelExportButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, Upload, TrendingUp, TrendingDown, Boxes } from "lucide-react";
import BulkImportDialog, { type ColumnMapping } from "@/components/shared/BulkImportDialog";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";

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

interface SupplyRecord {
  id: string;
  operation: "Acquisition" | "Shipping";
  date: string | null;
  invoice: string | null;
  description: string | null;
  lot_number: string | null;
  expiration_date: string | null;
  quantity: number | null;
  site: string | null;
  value: number | null;
  note: string | null;
}

interface Site {
  id: string;
  name: string;
  code: string;
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

const emptySupply = () => ({
  id: "",
  operation: "Acquisition" as "Acquisition" | "Shipping",
  date: "",
  invoice: "",
  description: "",
  lot_number: "",
  expiration_date: "",
  quantity: "" as string | number,
  site: "",
  value: "" as string | number,
  note: "",
});

function excelDate(v: any): string | null {
  if (v === "" || v == null) return null;
  if (typeof v === "number") {
    const d = parseLocalDate(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) {
    const mm = mdy[1].padStart(2, "0");
    const dd = mdy[2].padStart(2, "0");
    return `${mdy[3]}-${mm}-${dd}`;
  }
  const parsed = parseLocalDate(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

const IP_IMPORT_COLUMNS: ColumnMapping[] = [
  { excelHeader: "Code", dbColumn: "code", required: true },
  { excelHeader: "Description", dbColumn: "description" },
  { excelHeader: "Lot#", dbColumn: "lot_number" },
  { excelHeader: "Expiration", dbColumn: "expiration_date", transform: excelDate },
  { excelHeader: "Quantity", dbColumn: "quantity", transform: (v) => (v === "" || v == null ? null : Number(v)) },
  { excelHeader: "Site", dbColumn: "site" },
  { excelHeader: "Invoice", dbColumn: "invoice" },
  { excelHeader: "Correction Invoice", dbColumn: "correction_invoice" },
  { excelHeader: "Delivery date", dbColumn: "delivery_date", transform: excelDate },
  { excelHeader: "Usage", dbColumn: "usage" },
  { excelHeader: "Usage date", dbColumn: "usage_date", transform: excelDate },
  { excelHeader: "Return", dbColumn: "return_info" },
  { excelHeader: "Note", dbColumn: "note" },
];

const SUPPLY_IMPORT_COLUMNS: ColumnMapping[] = [
  { excelHeader: "Operation", dbColumn: "operation", required: true },
  { excelHeader: "Date", dbColumn: "date", transform: excelDate },
  { excelHeader: "Invoice", dbColumn: "invoice" },
  { excelHeader: "Description", dbColumn: "description" },
  { excelHeader: "Lot#", dbColumn: "lot_number" },
  { excelHeader: "Expiration", dbColumn: "expiration_date", transform: excelDate },
  { excelHeader: "Quantity", dbColumn: "quantity", transform: (v) => (v === "" || v == null ? null : Number(v)) },
  { excelHeader: "Site", dbColumn: "site" },
  { excelHeader: "Value (R$)", dbColumn: "value", transform: (v) => (v === "" || v == null ? null : Number(v)) },
  { excelHeader: "Note", dbColumn: "note" },
];

export default function InvestigationalProducts() {
  const { projectId: selectedProject } = usePersistedFilters();
  const [records, setRecords] = useState<IPRecord[]>([]);
  const [supplies, setSupplies] = useState<SupplyRecord[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<IPRecord | null>(null);
  const [form, setForm] = useState(emptyForm());

  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [supplyImportOpen, setSupplyImportOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<SupplyRecord | null>(null);
  const [supplyForm, setSupplyForm] = useState(emptySupply());

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const [ip, sup, siteData] = await Promise.all([
      supabase.from("investigational_products").select("*").order("created_at", { ascending: false }),
      supabase.from("ip_supply").select("*").order("date", { ascending: false }),
      selectedProject 
        ? supabase.from("study_sites").select("id, name, code").eq("project_id", selectedProject)
        : Promise.resolve({ data: [], error: null })
    ]);
    if (ip.error) toast.error("Failed to load IP: " + ip.error.message);
    else setRecords((ip.data || []) as IPRecord[]);
    if (sup.error) toast.error("Failed to load Supply: " + sup.error.message);
    else setSupplies((sup.data || []) as SupplyRecord[]);
    if (siteData.error) console.error("Failed to load sites:", siteData.error);
    else setSites((siteData.data || []) as Site[]);
    setLoading(false);
  }, [selectedProject]);


  useEffect(() => {
    loadRecords();
  }, [loadRecords]);


  // ===== IP CRUD =====
  const openNew = () => { setEditing(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (r: IPRecord) => {
    setEditing(r);
    setForm({
      id: r.id, code: r.code, description: r.description || "", lot_number: r.lot_number || "",
      expiration_date: r.expiration_date || "", quantity: r.quantity ?? "", site: r.site || "",
      invoice: r.invoice || "", correction_invoice: r.correction_invoice || "",
      delivery_date: r.delivery_date || "", usage: r.usage || "", usage_date: r.usage_date || "",
      return_info: r.return_info || "", note: r.note || "",
    });
    setDialogOpen(true);
  };
  const handleSave = async () => {
    if (!form.code.trim()) { toast.error("Code is required"); return; }
    const payload = {
      code: form.code.trim(), description: form.description || null, lot_number: form.lot_number || null,
      expiration_date: form.expiration_date || null,
      quantity: form.quantity === "" ? null : Number(form.quantity), site: form.site || null,
      invoice: form.invoice || null, correction_invoice: form.correction_invoice || null,
      delivery_date: form.delivery_date || null, usage: form.usage || null,
      usage_date: form.usage_date || null, return_info: form.return_info || null, note: form.note || null,
    };
    const { error } = editing
      ? await supabase.from("investigational_products").update(payload).eq("id", editing.id)
      : await supabase.from("investigational_products").insert(payload);
    if (error) { toast.error("Save failed: " + error.message); return; }
    toast.success(editing ? "IP updated" : "IP created");
    setDialogOpen(false); loadRecords();
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this IP record?")) return;
    const { error } = await supabase.from("investigational_products").delete().eq("id", id);
    if (error) { toast.error("Delete failed: " + error.message); return; }
    toast.success("Deleted"); loadRecords();
  };

  // ===== Supply CRUD =====
  const openNewSupply = () => { setEditingSupply(null); setSupplyForm(emptySupply()); setSupplyDialogOpen(true); };
  const openEditSupply = (r: SupplyRecord) => {
    setEditingSupply(r);
    setSupplyForm({
      id: r.id, operation: r.operation, date: r.date || "", invoice: r.invoice || "",
      description: r.description || "", lot_number: r.lot_number || "",
      expiration_date: r.expiration_date || "", quantity: r.quantity ?? "",
      site: r.site || "", value: r.value ?? "", note: r.note || "",
    });
    setSupplyDialogOpen(true);
  };
  const handleSaveSupply = async () => {
    if (!supplyForm.operation) { toast.error("Operation is required"); return; }
    const payload = {
      operation: supplyForm.operation,
      date: supplyForm.date || null,
      invoice: supplyForm.invoice || null,
      description: supplyForm.description || null,
      lot_number: supplyForm.lot_number || null,
      expiration_date: supplyForm.expiration_date || null,
      quantity: supplyForm.quantity === "" ? null : Number(supplyForm.quantity),
      site: supplyForm.site || null,
      value: supplyForm.value === "" ? null : Number(supplyForm.value),
      note: supplyForm.note || null,
    };
    const { error } = editingSupply
      ? await supabase.from("ip_supply").update(payload).eq("id", editingSupply.id)
      : await supabase.from("ip_supply").insert(payload);
    if (error) { toast.error("Save failed: " + error.message); return; }
    toast.success(editingSupply ? "Supply updated" : "Supply created");
    setSupplyDialogOpen(false); loadRecords();
  };
  const handleDeleteSupply = async (id: string) => {
    if (!confirm("Delete this supply record?")) return;
    const { error } = await supabase.from("ip_supply").delete().eq("id", id);
    if (error) { toast.error("Delete failed: " + error.message); return; }
    toast.success("Deleted"); loadRecords();
  };

  // Inventory search across all columns + per-column filters
  const [invSearch, setInvSearch] = useState("");
  const INV_COLS = [
    "code","description","lot_number","expiration_date","quantity","site",
    "invoice","correction_invoice","delivery_date","usage","usage_date","return_info","note",
  ] as const;
  type InvCol = typeof INV_COLS[number];
  const [colFilters, setColFilters] = useState<Record<InvCol, string>>(
    () => INV_COLS.reduce((acc, c) => ({ ...acc, [c]: "" }), {} as Record<InvCol, string>)
  );
  const setColFilter = (c: InvCol, v: string) => setColFilters((p) => ({ ...p, [c]: v }));

  // Pagination
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(1);
  useEffect(() => { setPage(1); }, [invSearch, colFilters, pageSize]);

  const filteredRecords = useMemo(() => {
    const q = invSearch.trim().toLowerCase();
    return records.filter((r) => {
      if (q) {
        const fields = [
          r.code, r.description, r.lot_number, r.expiration_date, r.quantity,
          r.site, r.invoice, r.correction_invoice, r.delivery_date,
          r.usage, r.usage_date, r.return_info, r.note,
        ];
        if (!fields.some((v) => (v == null ? "" : String(v)).toLowerCase().includes(q))) return false;
      }
      for (const c of INV_COLS) {
        const f = colFilters[c];
        if (!f) continue;
        const val = (r as any)[c];
        const norm = val == null || val === "" ? "—" : String(val);
        if (norm !== f) return false;
      }
      return true;
    });
  }, [records, invSearch, colFilters]);

  // Unique values per column (sorted), for the column filter dropdowns
  const colOptions = useMemo(() => {
    const map = {} as Record<InvCol, string[]>;
    INV_COLS.forEach((c) => {
      const set = new Set<string>();
      records.forEach((r) => {
        const v = (r as any)[c];
        set.add(v == null || v === "" ? "—" : String(v));
      });
      map[c] = Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
    return map;
  }, [records]);

  const exportData = useMemo(() => filteredRecords.map((r) => ({
    Code: r.code, Description: r.description, "Lot#": r.lot_number, Expiration: r.expiration_date,
    Quantity: r.quantity, Site: r.site, Invoice: r.invoice, "Correction Invoice": r.correction_invoice,
    "Delivery date": r.delivery_date, Usage: r.usage, "Usage date": r.usage_date,
    Return: r.return_info, Note: r.note,
  })), [filteredRecords]);

  const supplyExportData = useMemo(() => supplies.map((r) => ({
    Operation: r.operation, Date: r.date, Invoice: r.invoice, Description: r.description,
    "Lot#": r.lot_number, Expiration: r.expiration_date, Quantity: r.quantity,
    Site: r.site, "Value (R$)": r.value, Note: r.note,
  })), [supplies]);

  // Unique items (description) from Acquisition operations for predefined list
  const uniqueItems = useMemo(() => {
    const set = new Set<string>();
    supplies.forEach(s => {
      if (s.operation === "Acquisition" && s.description) {
        set.add(s.description);
      }
    });
    return Array.from(set).sort();
  }, [supplies]);

  // KPIs by description + lot#
  const stockByItem = useMemo(() => {
    const map = new Map<string, {
      description: string; lot_number: string; invoice: string;
      acquisition: number; shipping: number; balance: number;
      acquisitionValue: number;
    }>();
    supplies.forEach((s) => {
      const desc = (s.description || "—").trim();

      const lot = (s.lot_number || "—").trim();
      const invoice = (s.invoice || "—").trim();
      const key = `${desc}||${lot}||${invoice}`;
      const qty = Number(s.quantity || 0);
      const val = Number(s.value || 0);
      const cur = map.get(key) || {
        description: desc, lot_number: lot, invoice: invoice,
        acquisition: 0, shipping: 0, balance: 0, acquisitionValue: 0,
      };
      if (s.operation === "Acquisition") {
        cur.acquisition += qty;
        cur.acquisitionValue += val;
      } else if (s.operation === "Shipping") {
        cur.shipping += qty;
      }
      cur.balance = cur.acquisition - cur.shipping;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.description.localeCompare(b.description) || 
      a.lot_number.localeCompare(b.lot_number) ||
      a.invoice.localeCompare(b.invoice)
    );
  }, [supplies]);

  const totals = useMemo(() => {
    const acquisition = supplies.filter(s => s.operation === "Acquisition")
      .reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    const shipping = supplies.filter(s => s.operation === "Shipping")
      .reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    const totalValue = supplies.filter(s => s.operation === "Acquisition")
      .reduce((sum, s) => sum + Number(s.value || 0), 0);
    return { acquisition, shipping, balance: acquisition - shipping, totalValue };
  }, [supplies]);

  const fmtBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Inventory KPIs by site — subtracts used items (usage_date filled)
  const isUsed = (r: IPRecord) => !!(r.usage_date && String(r.usage_date).trim());

  const inventoryBySite = useMemo(() => {
    const map = new Map<string, { site: string; items: number; used: number; quantity: number }>();
    records.forEach((r) => {
      const site = (r.site || "—").trim() || "—";
      const cur = map.get(site) || { site, items: 0, used: 0, quantity: 0 };
      const qty = Number(r.quantity || 0);
      cur.items += 1;
      if (isUsed(r)) {
        cur.used += qty;
      } else {
        cur.quantity += qty;
      }
      map.set(site, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [records]);

  const inventoryTotals = useMemo(() => {
    let total = 0, used = 0;
    records.forEach((r) => {
      const qty = Number(r.quantity || 0);
      if (isUsed(r)) used += qty; else total += qty;
    });
    return {
      items: records.length,
      quantity: total,
      used,
      sites: new Set(records.map((r) => (r.site || "—").trim() || "—")).size,
    };
  }, [records]);

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-7 w-7" /> IP — Investigational Product
          </h2>
          <p className="text-muted-foreground">
            Shipment, movement and supply control of investigational devices
          </p>
        </div>

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="supply">Supply</TabsTrigger>
          </TabsList>

          {/* ===== INVENTORY TAB ===== */}
          <TabsContent value="inventory" className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <ExcelExportButton data={exportData} fileName="investigational-products" />
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-1" /> Import
              </Button>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-1" /> New IP
              </Button>
            </div>

            {/* Inventory KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" /> Total Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{inventoryTotals.items.toLocaleString("pt-BR")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-primary" /> Available Quantity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{inventoryTotals.quantity.toLocaleString("pt-BR")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" /> Used (Usage date)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{inventoryTotals.used.toLocaleString("pt-BR")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Sites Covered</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{inventoryTotals.sites.toLocaleString("pt-BR")}</p>
                </CardContent>
              </Card>
            </div>

            {/* Quantity by Site */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quantity by Site</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {inventoryBySite.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No inventory yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Site</TableHead>
                          <TableHead className="text-right">Items</TableHead>
                          <TableHead className="text-right">Used</TableHead>
                          <TableHead className="text-right">Available</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryBySite.map((s, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{s.site}</TableCell>
                            <TableCell className="text-right">{s.items.toLocaleString("pt-BR")}</TableCell>
                            <TableCell className="text-right text-red-600">
                              {s.used.toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="default">{s.quantity.toLocaleString("pt-BR")}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : records.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No IP records yet. Click "New IP" to get started.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-muted/30 flex-wrap">
                      <Input
                        value={invSearch}
                        onChange={(e) => setInvSearch(e.target.value)}
                        placeholder="Search across all columns…"
                        className="h-9 max-w-md"
                      />
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</Label>
                          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                            <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[10, 25, 50, 100, 250].map((n) => (
                                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {filteredRecords.length} of {records.length}
                        </span>
                      </div>
                    </div>
                    {(() => {
                      const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
                      const currentPage = Math.min(page, totalPages);
                      const start = (currentPage - 1) * pageSize;
                      const pageRows = filteredRecords.slice(start, start + pageSize);
                      return (
                        <>
                          <div className="overflow-auto max-h-[600px]">
                            <Table>
                              <TableHeader className="sticky top-0 bg-background z-10">
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
                                <TableRow className="bg-muted/20">
                                  {INV_COLS.map((c) => (
                                    <TableHead key={c} className="py-1">
                                      <Select
                                        value={colFilters[c] || "__all__"}
                                        onValueChange={(v) => setColFilter(c, v === "__all__" ? "" : v)}
                                      >
                                        <SelectTrigger className="h-7 text-xs px-2">
                                          <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-72">
                                          <SelectItem value="__all__">All</SelectItem>
                                          {colOptions[c].map((opt) => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableHead>
                                  ))}
                                  <TableHead />
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {pageRows.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                                      No records match your search.
                                    </TableCell>
                                  </TableRow>
                                ) : pageRows.map((r) => (
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
                          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {filteredRecords.length === 0 ? "0" : `${start + 1}–${Math.min(start + pageSize, filteredRecords.length)}`} of {filteredRecords.length}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(1)}>« First</Button>
                              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>‹ Prev</Button>
                              <span className="text-xs px-2">Page {currentPage} of {totalPages}</span>
                              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next ›</Button>
                              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(totalPages)}>Last »</Button>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== SUPPLY TAB ===== */}
          <TabsContent value="supply" className="space-y-4">
            {/* KPI summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" /> Total Acquisition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{totals.acquisition.toLocaleString("pt-BR")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" /> Total Shipping
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{totals.shipping.toLocaleString("pt-BR")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-primary" /> Current Stock
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{totals.balance.toLocaleString("pt-BR")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Acquisition Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{fmtBRL(totals.totalValue)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Stock per item / lot */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stock Balance by Item / Lot#</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {stockByItem.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No supply movements yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Lot#</TableHead>
                          <TableHead className="text-right">Acquisition</TableHead>
                          <TableHead className="text-right">Shipping</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockByItem.map((s, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{s.description}</TableCell>
                            <TableCell>{s.invoice}</TableCell>
                            <TableCell>{s.lot_number}</TableCell>
                            <TableCell className="text-right text-green-600">
                              {s.acquisition.toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {s.shipping.toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={s.balance < 0 ? "destructive" : s.balance === 0 ? "secondary" : "default"}>
                                {s.balance.toLocaleString("pt-BR")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Movements table */}
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <ExcelExportButton data={supplyExportData} fileName="ip-supply" />
              <Button variant="outline" onClick={() => setSupplyImportOpen(true)}>
                <Upload className="h-4 w-4 mr-1" /> Import
              </Button>
              <Button onClick={openNewSupply}>
                <Plus className="h-4 w-4 mr-1" /> New Movement
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : supplies.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No supply movements yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Operation</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Lot#</TableHead>
                          <TableHead>Expiration</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead>Site</TableHead>
                          <TableHead className="text-right">Value (R$)</TableHead>
                          <TableHead>Note</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplies.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Badge variant={r.operation === "Acquisition" ? "default" : "secondary"}>
                                {r.operation}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{r.date || "—"}</TableCell>
                            <TableCell className="text-sm">{r.invoice || "—"}</TableCell>
                            <TableCell className="text-sm">{r.description || "—"}</TableCell>
                            <TableCell className="text-sm">{r.lot_number || "—"}</TableCell>
                            <TableCell className="text-sm">{r.expiration_date || "—"}</TableCell>
                            <TableCell className="text-sm text-right">{r.quantity ?? "—"}</TableCell>
                            <TableCell className="text-sm">{r.site || "—"}</TableCell>
                            <TableCell className="text-sm text-right">
                              {r.value != null ? fmtBRL(Number(r.value)) : "—"}
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate" title={r.note || ""}>
                              {r.note || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button type="button" variant="ghost" size="icon" onClick={() => openEditSupply(r)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteSupply(r.id)}>
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
          </TabsContent>
        </Tabs>

        {/* ===== IP Dialog ===== */}
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

        {/* ===== Supply Dialog ===== */}
        <Dialog open={supplyDialogOpen} onOpenChange={setSupplyDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSupply ? "Edit Movement" : "New Movement"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Operation *</Label>
                <Select
                  value={supplyForm.operation}
                  onValueChange={(v) => setSupplyForm({ ...supplyForm, operation: v as "Acquisition" | "Shipping" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Acquisition">Acquisition</SelectItem>
                    <SelectItem value="Shipping">Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={supplyForm.date} onChange={(e) => setSupplyForm({ ...supplyForm, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Invoice</Label>
                <Input value={supplyForm.invoice} onChange={(e) => setSupplyForm({ ...supplyForm, invoice: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Lot#</Label>
                <Input value={supplyForm.lot_number} onChange={(e) => setSupplyForm({ ...supplyForm, lot_number: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Input value={supplyForm.description} onChange={(e) => setSupplyForm({ ...supplyForm, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Expiration</Label>
                <Input type="date" value={supplyForm.expiration_date} onChange={(e) => setSupplyForm({ ...supplyForm, expiration_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={supplyForm.quantity} onChange={(e) => setSupplyForm({ ...supplyForm, quantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Site</Label>
                <Input value={supplyForm.site} onChange={(e) => setSupplyForm({ ...supplyForm, site: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Value (R$)</Label>
                <Input type="number" step="0.01" value={supplyForm.value} onChange={(e) => setSupplyForm({ ...supplyForm, value: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Note</Label>
                <Textarea rows={3} value={supplyForm.note} onChange={(e) => setSupplyForm({ ...supplyForm, note: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSupplyDialogOpen(false)}>Cancel</Button>
              <Button type="button" onClick={handleSaveSupply}>{editingSupply ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <BulkImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          tableName="investigational_products"
          columns={IP_IMPORT_COLUMNS}
          onSuccess={loadRecords}
        />
        <BulkImportDialog
          open={supplyImportOpen}
          onOpenChange={setSupplyImportOpen}
          tableName="ip_supply"
          columns={SUPPLY_IMPORT_COLUMNS}
          onSuccess={loadRecords}
        />
      </main>
    </div>
  );
}
