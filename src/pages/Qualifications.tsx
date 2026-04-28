import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ModulePageLayout from "@/components/shared/ModulePageLayout";
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
import { Plus, Pencil, Trash2, Search, Upload } from "lucide-react";
import BulkImportDialog, { ColumnMapping } from "@/components/shared/BulkImportDialog";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";
import QualificationScorecard from "@/components/qualifications/QualificationScorecard";
import ContractsManager from "@/components/qualifications/ContractsManager";
import ContractsOverview from "@/components/qualifications/ContractsOverview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Qualification {
  id: string;
  project_id: string;
  name: string;
  vendor_type: string;
  qualification_status: string;
  feasibility_date: string | null;
  score: number | null;
  next_qualification_date: string | null;
  responsible: string | null;
  contract_status: string;
  nda_status: string;
  rq_pcl006_status: string;
  documents_url: string | null;
  notes: string | null;
}

const vendorTypes = [
  { value: "site", label: "Investigator Site" },
  { value: "cro", label: "CRO" },
  { value: "consultant", label: "Consultant" },
  { value: "statistician", label: "Statistician" },
  { value: "lab", label: "Central Lab" },
  { value: "other", label: "Other" },
];

const qualStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  qualified: "bg-green-100 text-green-800",
  disqualified: "bg-red-100 text-red-800",
  conditional: "bg-blue-100 text-blue-800",
};

const contractStatusColors: Record<string, string> = {
  negotiating: "bg-yellow-100 text-yellow-800",
  signed: "bg-green-100 text-green-800",
  terminated: "bg-red-100 text-red-800",
};

export default function Qualifications() {
  const navigate = useNavigate();
  const { projectId: persistedProjectId, setProjectId } = usePersistedFilters();
  const [selectedProject, setSelectedProject] = useState(persistedProjectId || "");
  const [records, setRecords] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Qualification | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const importColumns: ColumnMapping[] = [
    { excelHeader: "Name", dbColumn: "name", required: true },
    { excelHeader: "Vendor Type", dbColumn: "vendor_type", transform: (v: any) => v || "site" },
    { excelHeader: "Qualification Status", dbColumn: "qualification_status", transform: (v: any) => v || "pending" },
    { excelHeader: "Feasibility Date", dbColumn: "feasibility_date" },
    { excelHeader: "Score", dbColumn: "score", transform: (v: any) => v ? parseFloat(v) : null },
    { excelHeader: "Next Qualification Date", dbColumn: "next_qualification_date" },
    { excelHeader: "Responsible", dbColumn: "responsible" },
    { excelHeader: "Contract Status", dbColumn: "contract_status", transform: (v: any) => v || "negotiating" },
    { excelHeader: "Documents URL", dbColumn: "documents_url" },
    { excelHeader: "Notes", dbColumn: "notes" },
  ];
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState({
    name: "", vendor_type: "site", qualification_status: "pending", feasibility_date: "",
    score: "", next_qualification_date: "", responsible: "", contract_status: "negotiating",
    nda_status: "pending", rq_pcl006_status: "pending", documents_url: "", notes: "",
  });

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
    };
    check();
  }, []);

  useEffect(() => {
    if (selectedProject) { setProjectId(selectedProject); loadData(); }
  }, [selectedProject]);

  const syncResearchCenters = useCallback(async () => {
    // Auto-create qualification entries for research centers registered in Studies
    let centersQuery = supabase.from("research_centers").select("project_id, code, name, pi_name");
    if (selectedProject && selectedProject !== "all") {
      centersQuery = centersQuery.eq("project_id", selectedProject);
    }
    const { data: centers } = await centersQuery;
    if (!centers || centers.length === 0) return;

    let existingQuery = supabase.from("site_vendor_qualifications").select("project_id, name").eq("vendor_type", "site");
    if (selectedProject && selectedProject !== "all") {
      existingQuery = existingQuery.eq("project_id", selectedProject);
    }
    const { data: existing } = await existingQuery;
    const existingKeys = new Set((existing || []).map((r: any) => `${r.project_id}::${(r.name || "").toLowerCase()}`));

    const toInsert = centers
      .map((c: any) => {
        const displayName = c.name ? `${c.code} - ${c.name}` : c.code;
        return {
          project_id: c.project_id,
          name: displayName,
          vendor_type: "site",
          qualification_status: "pending",
          contract_status: "negotiating",
          responsible: c.pi_name || null,
        };
      })
      .filter((r) => !existingKeys.has(`${r.project_id}::${r.name.toLowerCase()}`));

    if (toInsert.length > 0) {
      await supabase.from("site_vendor_qualifications").insert(toInsert);
    }
  }, [selectedProject]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await syncResearchCenters();
    let query = supabase.from("site_vendor_qualifications").select("*").order("name");
    if (selectedProject && selectedProject !== "all") {
      query = query.eq("project_id", selectedProject);
    }
    const { data } = await query;
    setRecords(data || []);
    setLoading(false);
  }, [selectedProject, syncResearchCenters]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!selectedProject || selectedProject === "all") { toast.error("Select a study to create"); return; }
    const payload = {
      project_id: selectedProject, name: form.name.trim(), vendor_type: form.vendor_type,
      qualification_status: form.qualification_status, feasibility_date: form.feasibility_date || null,
      score: form.score ? parseFloat(form.score) : null, next_qualification_date: form.next_qualification_date || null,
      responsible: form.responsible.trim() || null, contract_status: form.contract_status,
      nda_status: form.nda_status,
      documents_url: form.documents_url.trim() || null, notes: form.notes.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from("site_vendor_qualifications").update(payload).eq("id", editing.id);
      if (error) { toast.error("Error updating"); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("site_vendor_qualifications").insert(payload);
      if (error) { toast.error("Error creating"); return; }
      toast.success("Created");
    }
    setDialogOpen(false); setEditing(null); loadData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("site_vendor_qualifications").delete().eq("id", id);
    toast.success("Deleted"); loadData();
  };

  const openEdit = (r: Qualification) => {
    setEditing(r);
    setForm({
      name: r.name, vendor_type: r.vendor_type, qualification_status: r.qualification_status,
      feasibility_date: r.feasibility_date || "", score: r.score?.toString() || "",
      next_qualification_date: r.next_qualification_date || "", responsible: r.responsible || "",
      contract_status: r.contract_status, nda_status: r.nda_status || "pending", documents_url: r.documents_url || "", notes: r.notes || "",
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", vendor_type: "site", qualification_status: "pending", feasibility_date: "", score: "", next_qualification_date: "", responsible: "", contract_status: "negotiating", nda_status: "pending", documents_url: "", notes: "" });
    setDialogOpen(true);
  };

  const filtered = records.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || (r.responsible || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || r.vendor_type === typeFilter;
    return matchSearch && matchType;
  });

  const exportData = filtered.map(r => ({
    Name: r.name, Type: r.vendor_type, "Qualification Status": r.qualification_status,
    "Feasibility Date": r.feasibility_date || "", Score: r.score ?? "",
    "Next Qualification": r.next_qualification_date || "", Responsible: r.responsible || "",
    "Contract Status": r.contract_status, Notes: r.notes || "",
  }));

  return (
    <ModulePageLayout title="Site & Vendor Qualifications" subtitle="Manage feasibility and qualification of sites and vendors"
      selectedProject={selectedProject} onProjectChange={setSelectedProject} exportData={exportData} exportFileName="qualifications" showAllOption
      actions={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setImportOpen(true)} disabled={!selectedProject || selectedProject === "all"}><Upload className="h-4 w-4 mr-1" />Import</Button><Button size="sm" onClick={openNew} disabled={!selectedProject || selectedProject === "all"}><Plus className="h-4 w-4 mr-1" />New Entry</Button></div>}
    >
      <Tabs defaultValue="qualifications" className="w-full">
        <TabsList>
          <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
        </TabsList>

        <TabsContent value="qualifications">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <CardTitle>Qualifications & Contracts</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[200px]" />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {vendorTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No records found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Qualification</TableHead>
                      <TableHead>Feasibility</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Next Qualification</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Responsible</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{vendorTypes.find(t => t.value === r.vendor_type)?.label || r.vendor_type}</TableCell>
                        <TableCell><Badge className={qualStatusColors[r.qualification_status] || ""}>{r.qualification_status}</Badge></TableCell>
                        <TableCell>{r.feasibility_date || "-"}</TableCell>
                        <TableCell>{r.score ?? "-"}</TableCell>
                        <TableCell>{r.next_qualification_date || "-"}</TableCell>
                        <TableCell><Badge className={contractStatusColors[r.contract_status] || ""}>{r.contract_status}</Badge></TableCell>
                        <TableCell>{r.responsible || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <ContractsOverview projectId={selectedProject} />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Qualification</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Type</Label>
                <Select value={form.vendor_type} onValueChange={v => setForm({...form, vendor_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{vendorTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Qualification Status</Label>
                <Select value={form.qualification_status} onValueChange={v => setForm({...form, qualification_status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="disqualified">Disqualified</SelectItem>
                    <SelectItem value="conditional">Conditional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Contract Status</Label>
                <Select value={form.contract_status} onValueChange={v => setForm({...form, contract_status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="negotiating">Negotiating</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>NDA</Label>
                <Select value={form.nda_status} onValueChange={v => setForm({...form, nda_status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Feasibility Date</Label><Input type="date" value={form.feasibility_date} onChange={e => setForm({...form, feasibility_date: e.target.value})} /></div>
              <div><Label>Score</Label><Input type="number" value={form.score} onChange={e => setForm({...form, score: e.target.value})} /></div>
              <div><Label>Next Qualification</Label><Input type="date" value={form.next_qualification_date} onChange={e => setForm({...form, next_qualification_date: e.target.value})} /></div>
            </div>
            <div><Label>Responsible</Label><Input value={form.responsible} onChange={e => setForm({...form, responsible: e.target.value})} /></div>
            <div><Label>Documents URL</Label><Input value={form.documents_url} onChange={e => setForm({...form, documents_url: e.target.value})} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            {editing && (
              <QualificationScorecard
                projectId={editing.project_id}
                qualificationId={editing.id}
                onTotalChange={(pct) => setForm(prev => ({ ...prev, score: pct.toFixed(1) }))}
              />
            )}
            {editing && <ContractsManager qualificationId={editing.id} />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} tableName="site_vendor_qualifications" projectId={selectedProject} columns={importColumns} onSuccess={loadData} />
    </ModulePageLayout>
  );
}
