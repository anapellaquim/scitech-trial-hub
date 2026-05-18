import { todayDateOnly, parseLocalDate, formatDateOnly } from "@/lib/dateUtils";
import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Grid3X3, Upload, AlertTriangle, ArrowUpCircle } from "lucide-react";
import BulkImportDialog, { ColumnMapping } from "@/components/shared/BulkImportDialog";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";
import RiskIndicatorsTab from "@/components/risks/RiskIndicatorsTab";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Risk {
  id: string;
  project_id: string;
  risk_code: string;
  description: string;
  category: string;
  probability: number;
  impact: number;
  risk_score: number;
  potential_impact: string | null;
  mitigation_plan: string | null;
  contingency_plan: string | null;
  monitoring_method: string | null;
  responsible: string | null;
  escalation_owner: string | null;
  status: string;
  identified_at: string;
  review_frequency: string;
  next_review_date: string | null;
  review_date: string | null;
  residual_probability: number | null;
  residual_impact: number | null;
  residual_risk_score: number | null;
  escalated_at: string | null;
  escalation_reason: string | null;
  materialized_at: string | null;
}

// PCL019 §4 categories
const CATEGORIES: { value: string; label: string }[] = [
  { value: "participant_safety", label: "Participant Safety" },
  { value: "data_quality", label: "Data Quality / Integrity" },
  { value: "regulatory", label: "Regulatory Compliance" },
  { value: "device", label: "Device / Product" },
  { value: "operational", label: "Operational / Timeline" },
  { value: "financial", label: "Financial" },
  { value: "vendor", label: "Vendor / Site" },
];

const categoryColors: Record<string, string> = {
  participant_safety: "bg-red-100 text-red-800",
  data_quality: "bg-purple-100 text-purple-800",
  regulatory: "bg-indigo-100 text-indigo-800",
  device: "bg-pink-100 text-pink-800",
  operational: "bg-blue-100 text-blue-800",
  financial: "bg-amber-100 text-amber-800",
  vendor: "bg-teal-100 text-teal-800",
};

// PCL019 §6 statuses
const STATUSES: { value: string; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "mitigating", label: "Mitigating" },
  { value: "monitoring", label: "Monitoring" },
  { value: "escalated", label: "Escalated" },
  { value: "materialized", label: "Materialized" },
  { value: "closed", label: "Closed" },
];

const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  mitigating: "bg-blue-100 text-blue-800",
  monitoring: "bg-cyan-100 text-cyan-800",
  escalated: "bg-orange-100 text-orange-800",
  materialized: "bg-red-100 text-red-800",
  closed: "bg-green-100 text-green-800",
};

// PCL019 §6.5 — 5-tier classification
export const classifyRisk = (score: number) => {
  if (score >= 16) return { level: "Critical", color: "bg-red-500 text-white", cell: "bg-red-200" };
  if (score >= 10) return { level: "High", color: "bg-orange-500 text-white", cell: "bg-orange-200" };
  if (score >= 6) return { level: "Medium", color: "bg-yellow-400 text-black", cell: "bg-yellow-100" };
  if (score >= 3) return { level: "Low", color: "bg-green-500 text-white", cell: "bg-green-100" };
  return { level: "Minimal", color: "bg-blue-400 text-white", cell: "bg-blue-50" };
};

const probabilityLabels = ["", "Very Unlikely (<5%)", "Unlikely (5-25%)", "Possible (25-50%)", "Likely (50-75%)", "Very Likely (>75%)"];
const impactLabels = ["", "Minimal", "Low", "Medium", "High", "Critical"];

const reviewFrequencies = [
  { value: "quarterly", label: "Quarterly (per SOP §6.8.1.a)" },
  { value: "semiannual", label: "Semiannual (per SOP §6.8.1.b)" },
  { value: "monthly", label: "Monthly" },
  { value: "ad_hoc", label: "Ad hoc" },
];

const addMonths = (dateStr: string, months: number) => {
  const d = parseLocalDate(dateStr);
  d.setMonth(d.getMonth() + months);
  return formatDateOnly(d);
};
const computeNextReview = (identified: string, freq: string) => {
  const m = freq === "monthly" ? 1 : freq === "quarterly" ? 3 : freq === "semiannual" ? 6 : 3;
  return addMonths(identified, m);
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
  const [importOpen, setImportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  const blankForm = {
    risk_code: "",
    description: "",
    category: "operational",
    probability: 3,
    impact: 3,
    potential_impact: "",
    mitigation_plan: "",
    contingency_plan: "",
    monitoring_method: "",
    responsible: "",
    escalation_owner: "",
    status: "open",
    identified_at: todayDateOnly(),
    review_frequency: "quarterly",
    next_review_date: "",
    residual_probability: 0,
    residual_impact: 0,
  };
  const [form, setForm] = useState(blankForm);

  const importColumns: ColumnMapping[] = [
    { excelHeader: "Risk Code", dbColumn: "risk_code", required: true },
    { excelHeader: "Description", dbColumn: "description", required: true },
    { excelHeader: "Category", dbColumn: "category", transform: (v: any) => v || "operational" },
    { excelHeader: "Probability", dbColumn: "probability", required: true, transform: (v: any) => parseInt(v) || 3 },
    { excelHeader: "Impact", dbColumn: "impact", required: true, transform: (v: any) => parseInt(v) || 3 },
    { excelHeader: "Potential Impact", dbColumn: "potential_impact" },
    { excelHeader: "Mitigation Plan", dbColumn: "mitigation_plan" },
    { excelHeader: "Contingency Plan", dbColumn: "contingency_plan" },
    { excelHeader: "Monitoring Method", dbColumn: "monitoring_method" },
    { excelHeader: "Responsible", dbColumn: "responsible" },
    { excelHeader: "Escalation Owner", dbColumn: "escalation_owner" },
    { excelHeader: "Status", dbColumn: "status", transform: (v: any) => v || "open" },
    { excelHeader: "Identified At", dbColumn: "identified_at", transform: (v: any) => v || todayDateOnly() },
    { excelHeader: "Review Frequency", dbColumn: "review_frequency", transform: (v: any) => v || "quarterly" },
    { excelHeader: "Next Review Date", dbColumn: "next_review_date" },
  ];

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
    };
    check();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("risks")
      .select("*")
      .eq("project_id", selectedProject)
      .order("risk_score", { ascending: false });
    setRecords((data as any) || []);
    setLoading(false);
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject) { setProjectId(selectedProject); loadData(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  const handleSave = async () => {
    if (!form.risk_code.trim() || !form.description.trim()) {
      toast.error("Risk Code and description are required");
      return;
    }
    const score = form.probability * form.impact;
    const level = classifyRisk(score).level;

    // PCL019 §6.7 — Critical/High require mitigation plan
    if ((level === "Critical" || level === "High") && !form.mitigation_plan.trim()) {
      toast.error(`${level} risks require a Mitigation Plan (SOP §6.7)`);
      return;
    }
    // PCL019 §6.8.3 — Critical/High need escalation owner
    if ((level === "Critical" || level === "High") && !form.escalation_owner.trim()) {
      toast.error(`${level} risks require an Escalation Owner (SOP §6.8.3)`);
      return;
    }

    const nextReview = form.next_review_date || computeNextReview(form.identified_at, form.review_frequency);

    // Auto-escalation for Critical or status=materialized
    let escalated_at: string | null = editing?.escalated_at || null;
    let escalation_reason = editing?.escalation_reason || null;
    if (level === "Critical" && !escalated_at) {
      escalated_at = new Date().toISOString();
      escalation_reason = "Auto-escalated: Critical priority risk per SOP §6.8.3";
    }
    if (form.status === "materialized" && !escalated_at) {
      escalated_at = new Date().toISOString();
      escalation_reason = "Auto-escalated: Risk materialized per SOP §6.8.3";
    }

    const payload: any = {
      project_id: selectedProject,
      risk_code: form.risk_code.trim(),
      description: form.description.trim(),
      category: form.category,
      probability: form.probability,
      impact: form.impact,
      potential_impact: form.potential_impact.trim() || null,
      mitigation_plan: form.mitigation_plan.trim() || null,
      contingency_plan: form.contingency_plan.trim() || null,
      monitoring_method: form.monitoring_method.trim() || null,
      responsible: form.responsible.trim() || null,
      escalation_owner: form.escalation_owner.trim() || null,
      status: form.status,
      identified_at: form.identified_at,
      review_frequency: form.review_frequency,
      next_review_date: nextReview,
      review_date: form.next_review_date || null,
      residual_probability: form.residual_probability || null,
      residual_impact: form.residual_impact || null,
      escalated_at,
      escalation_reason,
      materialized_at: form.status === "materialized" ? (editing?.materialized_at || new Date().toISOString()) : editing?.materialized_at || null,
    };

    if (editing) {
      await supabase.from("risks").update(payload).eq("id", editing.id);
      toast.success("Risk updated");
    } else {
      await supabase.from("risks").insert(payload);
      toast.success("Risk created");
    }
    setDialogOpen(false); setEditing(null); setForm(blankForm); loadData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("risks").delete().eq("id", id);
    toast.success("Deleted"); loadData();
  };

  const openNew = () => { setEditing(null); setForm(blankForm); setDialogOpen(true); };
  const openEdit = (r: Risk) => {
    setEditing(r);
    setForm({
      risk_code: r.risk_code,
      description: r.description,
      category: r.category,
      probability: r.probability,
      impact: r.impact,
      potential_impact: r.potential_impact || "",
      mitigation_plan: r.mitigation_plan || "",
      contingency_plan: r.contingency_plan || "",
      monitoring_method: r.monitoring_method || "",
      responsible: r.responsible || "",
      escalation_owner: r.escalation_owner || "",
      status: r.status,
      identified_at: r.identified_at,
      review_frequency: r.review_frequency || "quarterly",
      next_review_date: r.next_review_date || "",
      residual_probability: r.residual_probability || 0,
      residual_impact: r.residual_impact || 0,
    });
    setDialogOpen(true);
  };

  const filtered = records.filter(r => {
    const matchSearch = r.risk_code.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchLevel = levelFilter === "all" || classifyRisk(r.risk_score).level === levelFilter;
    return matchSearch && matchStatus && matchLevel;
  });

  // Summary stats
  const stats = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0, Minimal: 0 };
    records.forEach(r => { counts[classifyRisk(r.risk_score).level as keyof typeof counts]++; });
    return counts;
  }, [records]);

  const overdueReviews = records.filter(r => r.next_review_date && r.next_review_date < todayDateOnly() && r.status !== "closed").length;
  const escalatedCount = records.filter(r => r.escalated_at && r.status !== "closed").length;

  const exportData = filtered.map(r => ({
    "Risk ID": r.risk_code,
    Description: r.description,
    Category: r.category,
    Probability: r.probability,
    Impact: r.impact,
    "Risk Score": r.risk_score,
    "Risk Level": classifyRisk(r.risk_score).level,
    "Potential Impact": r.potential_impact || "",
    "Mitigation Plan": r.mitigation_plan || "",
    "Contingency Plan": r.contingency_plan || "",
    "Monitoring Method": r.monitoring_method || "",
    Responsible: r.responsible || "",
    "Escalation Owner": r.escalation_owner || "",
    Status: r.status,
    "Identified At": r.identified_at,
    "Review Frequency": r.review_frequency,
    "Next Review": r.next_review_date || "",
    "Residual Score": r.residual_risk_score || "",
    "Escalated": r.escalated_at ? "Yes" : "No",
    "Materialized": r.materialized_at ? "Yes" : "No",
  }));

  // Visual matrix (PCL019 §6.6)
  const matrixData = Array.from({ length: 5 }, (_, pi) =>
    Array.from({ length: 5 }, (_, ii) => {
      const prob = 5 - pi;
      const imp = ii + 1;
      return filtered.filter(r => r.probability === prob && r.impact === imp);
    })
  );

  const currentLevel = classifyRisk(form.probability * form.impact);
  const residualScore = (form.residual_probability || 0) * (form.residual_impact || 0);
  const residualLevel = residualScore > 0 ? classifyRisk(residualScore) : null;

  return (
    <ModulePageLayout
      title="Risk Management"
      subtitle="Clinical Trial Risk Management Plan — per SOP PCL019"
      selectedProject={selectedProject}
      onProjectChange={setSelectedProject}
      exportData={exportData}
      exportFileName="risks"
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" />Import</Button>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Risk</Button>
        </div>
      }
    >
      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-4">
        {(["Critical","High","Medium","Low","Minimal"] as const).map(lv => {
          const c = classifyRisk(lv === "Critical" ? 20 : lv === "High" ? 12 : lv === "Medium" ? 7 : lv === "Low" ? 4 : 1);
          return (
            <Card key={lv}><CardContent className="p-3">
              <div className="text-xs text-muted-foreground">{lv}</div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{stats[lv]}</span>
                <Badge className={c.color}>{lv[0]}</Badge>
              </div>
            </CardContent></Card>
          );
        })}
        <Card><CardContent className="p-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpCircle className="h-3 w-3" />Escalated</div>
          <div className="text-2xl font-bold text-orange-600">{escalatedCount}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Overdue Reviews</div>
          <div className="text-2xl font-bold text-red-600">{overdueReviews}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="mb-4">
          <TabsTrigger value="list">Risk Register</TabsTrigger>
          <TabsTrigger value="matrix">Risk Matrix 5×5</TabsTrigger>
          <TabsTrigger value="indicators">KPIs / KRIs</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <CardTitle>Risk Register</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[200px]" />
                  </div>
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
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
                    <TableHead>ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>P</TableHead>
                    <TableHead>I</TableHead>
                    <TableHead>Score / Level</TableHead>
                    <TableHead>Residual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Next Review</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filtered.map(r => {
                      const lvl = classifyRisk(r.risk_score);
                      const overdue = r.next_review_date && r.next_review_date < todayDateOnly() && r.status !== "closed";
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono font-medium">
                            <div className="flex items-center gap-1">
                              {r.risk_code}
                              {r.escalated_at && <span title="Escalated"><ArrowUpCircle className="h-3 w-3 text-orange-500" /></span>}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate" title={r.description}>{r.description}</TableCell>
                          <TableCell><Badge className={categoryColors[r.category] || ""}>{CATEGORIES.find(c => c.value === r.category)?.label || r.category}</Badge></TableCell>
                          <TableCell>{r.probability}</TableCell>
                          <TableCell>{r.impact}</TableCell>
                          <TableCell><Badge className={lvl.color}>{r.risk_score} · {lvl.level}</Badge></TableCell>
                          <TableCell>{r.residual_risk_score ? <Badge variant="outline" className={classifyRisk(r.residual_risk_score).color}>{r.residual_risk_score}</Badge> : "-"}</TableCell>
                          <TableCell><Badge className={statusColors[r.status] || ""}>{STATUSES.find(s => s.value === r.status)?.label || r.status}</Badge></TableCell>
                          <TableCell className="text-xs">{r.responsible || "-"}</TableCell>
                          <TableCell className={overdue ? "text-red-600 font-medium" : ""}>
                            {r.next_review_date ? format(parseLocalDate(r.next_review_date), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Grid3X3 className="h-5 w-5" />Visual Risk Matrix 5×5 — per SOP §6.6</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-xs font-medium border bg-muted">Probability ↓ / Impact →</th>
                      {[1,2,3,4,5].map(i => (
                        <th key={i} className="p-2 text-xs font-medium border bg-muted text-center">
                          {i} – {impactLabels[i]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.map((row, pi) => {
                      const prob = 5 - pi;
                      return (
                        <tr key={pi}>
                          <td className="p-2 text-xs font-medium border bg-muted text-center">
                            {prob} – {probabilityLabels[prob].split(" ")[0]}
                          </td>
                          {row.map((risks, ii) => {
                            const score = prob * (ii + 1);
                            const cls = classifyRisk(score);
                            return (
                              <td key={ii} className={`p-2 border text-center min-w-[100px] align-top ${cls.cell}`}>
                                <div className="text-xs font-bold mb-1">{score} · {cls.level}</div>
                                {risks.length > 0 && (
                                  <div className="flex flex-wrap gap-1 justify-center">
                                    {risks.map(r => <Badge key={r.id} variant="secondary" className="text-xs">{r.risk_code}</Badge>)}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex flex-wrap gap-4 mt-4 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-50 border rounded" /> Minimal (1–2)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border rounded" /> Low (3–5)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 border rounded" /> Medium (6–9)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-200 border rounded" /> High (10–15)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-200 border rounded" /> Critical (16–25)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicators">
          {selectedProject && <RiskIndicatorsTab projectId={selectedProject} />}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "New"} Risk</DialogTitle>
            <DialogDescription>Per SOP PCL019 — Critical/High risks require Mitigation Plan and Escalation Owner.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Risk ID</Label><Input value={form.risk_code} onChange={e => setForm({...form, risk_code: e.target.value})} placeholder="R-001" /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Risk Description</Label><Textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe the uncertain event/condition" /></div>
            <div><Label>Potential Impact</Label><Textarea rows={2} value={form.potential_impact} onChange={e => setForm({...form, potential_impact: e.target.value})} placeholder="Consequences if it occurs (safety, data, regulatory, timeline...)" /></div>

            <div className="grid grid-cols-3 gap-4 items-end">
              <div><Label>Probability (1–5)</Label>
                <Select value={String(form.probability)} onValueChange={v => setForm({...form, probability: parseInt(v)})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} – {probabilityLabels[n]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Impact (1–5)</Label>
                <Select value={String(form.impact)} onValueChange={v => setForm({...form, impact: parseInt(v)})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} – {impactLabels[n]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Score · Level</Label>
                <div className="h-10 flex items-center"><Badge className={`${currentLevel.color} text-base px-3 py-1`}>{form.probability * form.impact} · {currentLevel.level}</Badge></div>
              </div>
            </div>

            <div><Label>Mitigation Plan {(currentLevel.level === "Critical" || currentLevel.level === "High") && <span className="text-destructive">*</span>}</Label>
              <Textarea rows={3} value={form.mitigation_plan} onChange={e => setForm({...form, mitigation_plan: e.target.value})} placeholder="Preventive/corrective actions (required for Critical/High)" />
            </div>
            <div><Label>Contingency Plan</Label>
              <Textarea rows={2} value={form.contingency_plan} onChange={e => setForm({...form, contingency_plan: e.target.value})} placeholder="Backup actions if mitigation fails" />
            </div>
            <div><Label>Monitoring Method</Label>
              <Input value={form.monitoring_method} onChange={e => setForm({...form, monitoring_method: e.target.value})} placeholder="e.g., Weekly compliance reports, KRI dashboard..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Responsible</Label><Input value={form.responsible} onChange={e => setForm({...form, responsible: e.target.value})} placeholder="Action owner" /></div>
              <div><Label>Escalation Owner {(currentLevel.level === "Critical" || currentLevel.level === "High") && <span className="text-destructive">*</span>}</Label>
                <Input value={form.escalation_owner} onChange={e => setForm({...form, escalation_owner: e.target.value})} placeholder="Sponsor / Coordinator / PI" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Identified At</Label><Input type="date" value={form.identified_at} onChange={e => setForm({...form, identified_at: e.target.value})} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Review Frequency</Label>
                <Select value={form.review_frequency} onValueChange={v => setForm({...form, review_frequency: v, next_review_date: computeNextReview(form.identified_at, v)})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{reviewFrequencies.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Next Review Date</Label><Input type="date" value={form.next_review_date || computeNextReview(form.identified_at, form.review_frequency)} onChange={e => setForm({...form, next_review_date: e.target.value})} /></div>
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm font-semibold">Residual Risk (after mitigation)</Label>
              <div className="grid grid-cols-3 gap-4 mt-2 items-end">
                <div><Label className="text-xs">Residual Probability</Label>
                  <Select value={String(form.residual_probability)} onValueChange={v => setForm({...form, residual_probability: parseInt(v)})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">— Not assessed —</SelectItem>
                      {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Residual Impact</Label>
                  <Select value={String(form.residual_impact)} onValueChange={v => setForm({...form, residual_impact: parseInt(v)})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">— Not assessed —</SelectItem>
                      {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Residual Score</Label>
                  <div className="h-10 flex items-center">
                    {residualLevel ? <Badge className={residualLevel.color}>{residualScore} · {residualLevel.level}</Badge> : <span className="text-muted-foreground text-sm">—</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} tableName="risks" projectId={selectedProject} columns={importColumns} onSuccess={loadData} />
    </ModulePageLayout>
  );
}
