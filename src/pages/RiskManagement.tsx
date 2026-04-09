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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Grid3X3 } from "lucide-react";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";

interface Risk {
  id: string;
  project_id: string;
  risk_code: string;
  description: string;
  category: string;
  probability: number;
  impact: number;
  risk_score: number;
  mitigation_plan: string | null;
  responsible: string | null;
  status: string;
  identified_at: string;
  review_date: string | null;
}

const categoryColors: Record<string, string> = {
  operational: "bg-blue-100 text-blue-800",
  regulatory: "bg-purple-100 text-purple-800",
  quality: "bg-orange-100 text-orange-800",
  safety: "bg-red-100 text-red-800",
};

const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  mitigating: "bg-blue-100 text-blue-800",
  closed: "bg-green-100 text-green-800",
};

const riskScoreColor = (score: number) => {
  if (score >= 16) return "bg-red-500 text-white";
  if (score >= 9) return "bg-orange-500 text-white";
  if (score >= 4) return "bg-yellow-400 text-black";
  return "bg-green-500 text-white";
};

export default function RiskManagement() {
  const navigate = useNavigate();
  const { projectId: persistedProjectId, setProjectId } = usePersistedFilters();
  const [selectedProject, setSelectedProject] = useState(persistedProjectId || "");
  const [records, setRecords] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Risk | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({ risk_code: "", description: "", category: "operational", probability: 3, impact: 3, mitigation_plan: "", responsible: "", status: "open", identified_at: new Date().toISOString().split("T")[0], review_date: "" });

  useEffect(() => { const check = async () => { const { data: { session } } = await supabase.auth.getSession(); if (!session) navigate("/auth"); }; check(); }, []);
  useEffect(() => { if (selectedProject) { setProjectId(selectedProject); loadData(); } }, [selectedProject]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("risks").select("*").eq("project_id", selectedProject).order("risk_score", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  }, [selectedProject]);

  const handleSave = async () => {
    if (!form.risk_code.trim() || !form.description.trim()) { toast.error("Code and description are required"); return; }
    const payload = {
      project_id: selectedProject, risk_code: form.risk_code.trim(), description: form.description.trim(),
      category: form.category, probability: form.probability, impact: form.impact,
      mitigation_plan: form.mitigation_plan.trim() || null, responsible: form.responsible.trim() || null,
      status: form.status, identified_at: form.identified_at, review_date: form.review_date || null,
    };
    if (editing) { await supabase.from("risks").update(payload).eq("id", editing.id); toast.success("Updated"); }
    else { await supabase.from("risks").insert(payload); toast.success("Created"); }
    setDialogOpen(false); setEditing(null); loadData();
  };

  const handleDelete = async (id: string) => { await supabase.from("risks").delete().eq("id", id); toast.success("Deleted"); loadData(); };

  const openNew = () => { setEditing(null); setForm({ risk_code: "", description: "", category: "operational", probability: 3, impact: 3, mitigation_plan: "", responsible: "", status: "open", identified_at: new Date().toISOString().split("T")[0], review_date: "" }); setDialogOpen(true); };
  const openEdit = (r: Risk) => { setEditing(r); setForm({ risk_code: r.risk_code, description: r.description, category: r.category, probability: r.probability, impact: r.impact, mitigation_plan: r.mitigation_plan || "", responsible: r.responsible || "", status: r.status, identified_at: r.identified_at, review_date: r.review_date || "" }); setDialogOpen(true); };

  const filtered = records.filter(r => {
    const matchSearch = r.risk_code.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportData = filtered.map(r => ({
    "Risk ID": r.risk_code, Description: r.description, Category: r.category,
    Probability: r.probability, Impact: r.impact, "Risk Score": r.risk_score,
    "Mitigation Plan": r.mitigation_plan || "", Responsible: r.responsible || "",
    Status: r.status, "Identified At": r.identified_at, "Review Date": r.review_date || "",
  }));

  // Risk matrix data
  const matrixData = Array.from({ length: 5 }, (_, pi) =>
    Array.from({ length: 5 }, (_, ii) => {
      const prob = 5 - pi;
      const imp = ii + 1;
      return filtered.filter(r => r.probability === prob && r.impact === imp);
    })
  );

  return (
    <ModulePageLayout title="Risk Management" subtitle="Identify, assess, and mitigate study risks"
      selectedProject={selectedProject} onProjectChange={setSelectedProject} exportData={exportData} exportFileName="risks"
      actions={<Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Risk</Button>}
    >
      <Tabs defaultValue="list">
        <TabsList className="mb-4"><TabsTrigger value="list">List View</TabsTrigger><TabsTrigger value="matrix">Risk Matrix</TabsTrigger></TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <CardTitle>Risk Register</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[200px]" /></div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="mitigating">Mitigating</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No risks found.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>ID</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>P</TableHead><TableHead>I</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead>Responsible</TableHead><TableHead>Review</TableHead><TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filtered.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono font-medium">{r.risk_code}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.description}</TableCell>
                        <TableCell><Badge className={categoryColors[r.category] || ""}>{r.category}</Badge></TableCell>
                        <TableCell>{r.probability}</TableCell>
                        <TableCell>{r.impact}</TableCell>
                        <TableCell><Badge className={riskScoreColor(r.risk_score)}>{r.risk_score}</Badge></TableCell>
                        <TableCell><Badge className={statusColors[r.status] || ""}>{r.status}</Badge></TableCell>
                        <TableCell>{r.responsible || "-"}</TableCell>
                        <TableCell>{r.review_date || "-"}</TableCell>
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

        <TabsContent value="matrix">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Grid3X3 className="h-5 w-5" />Risk Matrix (Probability × Impact)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-sm font-medium border">P \ I</th>
                      {[1,2,3,4,5].map(i => <th key={i} className="p-2 text-sm font-medium border text-center">{i}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.map((row, pi) => (
                      <tr key={pi}>
                        <td className="p-2 text-sm font-medium border text-center">{5 - pi}</td>
                        {row.map((risks, ii) => {
                          const score = (5 - pi) * (ii + 1);
                          const bgColor = score >= 16 ? "bg-red-100" : score >= 9 ? "bg-orange-100" : score >= 4 ? "bg-yellow-50" : "bg-green-50";
                          return (
                            <td key={ii} className={`p-2 border text-center min-w-[80px] ${bgColor}`}>
                              {risks.length > 0 ? (
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {risks.map(r => <Badge key={r.id} variant="secondary" className="text-xs">{r.risk_code}</Badge>)}
                                </div>
                              ) : <span className="text-xs text-muted-foreground">{score}</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex gap-4 mt-4 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border rounded" /> Low (1–3)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-50 border rounded" /> Medium (4–8)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-100 border rounded" /> High (9–15)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border rounded" /> Critical (16–25)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Risk</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Risk ID</Label><Input value={form.risk_code} onChange={e => setForm({...form, risk_code: e.target.value})} placeholder="R-001" /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="operational">Operational</SelectItem><SelectItem value="regulatory">Regulatory</SelectItem><SelectItem value="quality">Quality</SelectItem><SelectItem value="safety">Safety</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Probability (1-5)</Label><Input type="number" min={1} max={5} value={form.probability} onChange={e => setForm({...form, probability: parseInt(e.target.value) || 1})} /></div>
              <div><Label>Impact (1-5)</Label><Input type="number" min={1} max={5} value={form.impact} onChange={e => setForm({...form, impact: parseInt(e.target.value) || 1})} /></div>
              <div><Label>Score</Label><Input disabled value={form.probability * form.impact} /></div>
            </div>
            <div><Label>Mitigation Plan</Label><Textarea value={form.mitigation_plan} onChange={e => setForm({...form, mitigation_plan: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="mitigating">Mitigating</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Responsible</Label><Input value={form.responsible} onChange={e => setForm({...form, responsible: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Identified At</Label><Input type="date" value={form.identified_at} onChange={e => setForm({...form, identified_at: e.target.value})} /></div>
              <div><Label>Review Date</Label><Input type="date" value={form.review_date} onChange={e => setForm({...form, review_date: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePageLayout>
  );
}
