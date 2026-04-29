import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import ModulePageLayout from "@/components/shared/ModulePageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, ExternalLink, ClipboardCheck, FileText, AlertTriangle, CheckCircle2, Target, TrendingUp } from "lucide-react";

interface Survey {
  id: string;
  project_id: string;
  survey_code: string;
  title: string;
  description: string | null;
  form_link: string | null;
  target_audience: string | null;
  expected_monthly_fills: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  responsible: string | null;
  manual_target: number | null;
}

interface MonthlyCheck {
  id: string;
  survey_id: string;
  project_id: string;
  reference_month: string;
  fills_count: number;
  expected_count: number;
  status: string;
  checked_at: string;
  checked_by: string | null;
  notes: string | null;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  closed: "bg-gray-200 text-gray-800",
};

const checkStatusColors: Record<string, string> = {
  compliant: "bg-green-100 text-green-800",
  below_target: "bg-red-100 text-red-800",
  above_target: "bg-blue-100 text-blue-800",
};

export default function PMCFSurvey() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [projects, setProjects] = useState<{ id: string; title: string; protocol_number: string | null }[]>([]);
  const [titleSearch, setTitleSearch] = useState("");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [checks, setChecks] = useState<MonthlyCheck[]>([]);
  const [loading, setLoading] = useState(false);

  const [surveyDialogOpen, setSurveyDialogOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [surveyForm, setSurveyForm] = useState<Partial<Survey>>({});

  const [checkDialogOpen, setCheckDialogOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<MonthlyCheck | null>(null);
  const [checkForm, setCheckForm] = useState<Partial<MonthlyCheck>>({});

  const loadData = async () => {
    setLoading(true);
    const [{ data: s }, { data: c }, { data: p }] = await Promise.all([
      supabase.from("pmcf_surveys" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("pmcf_monthly_checks" as any).select("*").order("reference_month", { ascending: false }),
      supabase.from("projects").select("id, title, protocol_number").order("title"),
    ]);
    setSurveys((s as any) || []);
    setChecks((c as any) || []);
    setProjects((p as any) || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const openNewSurvey = () => {
    setEditingSurvey(null);
    setSurveyForm({ status: "active", expected_monthly_fills: 0 });
    setSurveyDialogOpen(true);
  };

  const openEditSurvey = (s: Survey) => {
    setEditingSurvey(s);
    setSurveyForm(s);
    setSurveyDialogOpen(true);
  };

  const saveSurvey = async () => {
    if (!surveyForm.survey_code || !surveyForm.title) {
      toast.error("Code and title are required");
      return;
    }
    if (!surveyForm.project_id) {
      toast.error("Study is required");
      return;
    }
    const payload = { ...surveyForm };
    const { error } = editingSurvey
      ? await supabase.from("pmcf_surveys" as any).update(payload).eq("id", editingSurvey.id)
      : await supabase.from("pmcf_surveys" as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editingSurvey ? "Survey updated" : "Survey created");
    setSurveyDialogOpen(false);
    loadData();
  };

  const deleteSurvey = async (id: string) => {
    if (!confirm("Delete this survey and all related monthly checks?")) return;
    const { error } = await supabase.from("pmcf_surveys" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Survey deleted");
    loadData();
  };

  const updateManualTarget = async (id: string, value: number | null) => {
    const { error } = await supabase.from("pmcf_surveys" as any).update({ manual_target: value }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(value == null ? "Target reset to auto" : "Target updated");
    loadData();
  };

  const openNewCheck = (surveyId?: string) => {
    setEditingCheck(null);
    const survey = surveys.find(s => s.id === surveyId);
    const now = new Date();
    const refMonth = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
    setCheckForm({
      survey_id: surveyId,
      reference_month: refMonth,
      fills_count: 0,
      expected_count: survey?.manual_target ?? 0,
      status: "compliant",
      checked_at: format(now, "yyyy-MM-dd"),
    });
    setCheckDialogOpen(true);
  };

  const openEditCheck = (c: MonthlyCheck) => {
    setEditingCheck(c);
    setCheckForm(c);
    setCheckDialogOpen(true);
  };

  const computeStatus = (fills: number, expected: number) => {
    if (expected === 0) return "compliant";
    if (fills < expected) return "below_target";
    if (fills > expected) return "above_target";
    return "compliant";
  };

  const saveCheck = async () => {
    if (!checkForm.survey_id || !checkForm.reference_month) {
      toast.error("Survey and reference month are required");
      return;
    }
    const status = computeStatus(checkForm.fills_count ?? 0, checkForm.expected_count ?? 0);
    const survey = surveys.find(s => s.id === checkForm.survey_id);
    const payload = { ...checkForm, project_id: survey?.project_id, status };
    const { error } = editingCheck
      ? await supabase.from("pmcf_monthly_checks" as any).update(payload).eq("id", editingCheck.id)
      : await supabase.from("pmcf_monthly_checks" as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editingCheck ? "Check updated" : "Check recorded");
    setCheckDialogOpen(false);
    loadData();
  };

  const deleteCheck = async (id: string) => {
    if (!confirm("Delete this monthly check?")) return;
    const { error } = await supabase.from("pmcf_monthly_checks" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Check deleted");
    loadData();
  };

  const surveyMap = useMemo(() => Object.fromEntries(surveys.map(s => [s.id, s])), [surveys]);

  const stats = useMemo(() => ({
    total: surveys.length,
    active: surveys.filter(s => s.status === "active").length,
    belowTarget: checks.filter(c => c.status === "below_target").length,
    compliant: checks.filter(c => c.status === "compliant").length,
  }), [surveys, checks]);

  // Tracking: progress per survey vs Sample Size (manual_target)
  const tracking = useMemo(() => {
    return surveys.map(s => {
      const surveyChecks = checks.filter(c => c.survey_id === s.id);
      const totalFills = surveyChecks.reduce((sum, c) => sum + (c.fills_count || 0), 0);
      const monthsTracked = surveyChecks.length;
      const sampleSize = s.manual_target ?? 0;
      const progressPct = sampleSize > 0 ? Math.min(100, (totalFills / sampleSize) * 100) : 0;
      const lastCheck = surveyChecks.sort((a, b) => b.reference_month.localeCompare(a.reference_month))[0];
      return {
        survey: s,
        totalFills,
        monthsTracked,
        sampleSize,
        cumulativeTarget: sampleSize,
        isManual: s.manual_target != null,
        progressPct,
        lastCheck,
        gap: sampleSize - totalFills,
      };
    });
  }, [surveys, checks]);

  const trackingMap = useMemo(
    () => Object.fromEntries(tracking.map(t => [t.survey.id, t])),
    [tracking]
  );

  const exportData = checks.map(c => ({
    Survey: surveyMap[c.survey_id]?.title ?? "",
    Code: surveyMap[c.survey_id]?.survey_code ?? "",
    Month: format(new Date(c.reference_month), "MM/yyyy"),
    Fills: c.fills_count,
    Expected: c.expected_count,
    Status: c.status,
    CheckedAt: c.checked_at,
    CheckedBy: c.checked_by ?? "",
    Notes: c.notes ?? "",
  }));

  return (
    <ModulePageLayout
      title="PMCF Survey"
      subtitle="Post-Market Clinical Follow-up form management & monthly fill tracking"
      selectedProject={selectedProject}
      onProjectChange={setSelectedProject}
      exportData={exportData}
      exportFileName="pmcf_monthly_checks"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Surveys</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><ClipboardCheck className="h-5 w-5 text-green-600" /><div><p className="text-2xl font-bold">{stats.active}</p><p className="text-xs text-muted-foreground">Active</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-600" /><div><p className="text-2xl font-bold">{stats.compliant}</p><p className="text-xs text-muted-foreground">Compliant Checks</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-red-600" /><div><p className="text-2xl font-bold">{stats.belowTarget}</p><p className="text-xs text-muted-foreground">Below Target</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="surveys">
        <TabsList>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="checks">Monthly Checks</TabsTrigger>
        </TabsList>

        <TabsContent value="surveys">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Forms</CardTitle>
              <Button onClick={openNewSurvey} disabled={!selectedProject}><Plus className="h-4 w-4 mr-1" />New Survey</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Sample Size</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.map(s => {
                    const t = trackingMap[s.id];
                    const pct = t?.progressPct ?? 0;
                    const barColor = pct >= 90 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500";
                    const pctColor = pct >= 90 ? "text-green-700" : pct >= 60 ? "text-yellow-700" : "text-red-700";
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">{s.survey_code}</TableCell>
                        <TableCell>{s.title}</TableCell>
                        <TableCell>{s.target_audience}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            defaultValue={s.manual_target ?? ""}
                            key={`ss-${s.id}-${s.manual_target ?? "n"}`}
                            placeholder="—"
                            className="h-8 w-20 text-sm"
                            onBlur={(e) => {
                              const raw = e.target.value;
                              const v = raw === "" ? null : parseInt(raw);
                              if (v !== null && isNaN(v)) return;
                              if (v === (s.manual_target ?? null)) return;
                              updateManualTarget(s.id, v);
                            }}
                          />
                        </TableCell>
                        <TableCell className="min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                            <span className={`text-xs font-semibold ${pctColor}`}>{pct.toFixed(0)}%</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{t?.totalFills ?? 0} / {t?.sampleSize ?? 0}</p>
                        </TableCell>
                        <TableCell className="text-xs">{s.start_date ? format(new Date(s.start_date), "MM/dd/yyyy") : "—"} → {s.end_date ? format(new Date(s.end_date), "MM/dd/yyyy") : "—"}</TableCell>
                        <TableCell><Badge className={statusColors[s.status]}>{s.status}</Badge></TableCell>
                        <TableCell>{s.form_link && <a href={s.form_link} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 text-primary" /></a>}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => openNewCheck(s.id)}><ClipboardCheck className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => openEditSurvey(s)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteSurvey(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!surveys.length && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">{loading ? "Loading…" : "No surveys registered"}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Monthly Verification Log</CardTitle>
              <Button onClick={() => openNewCheck()} disabled={!surveys.length}><Plus className="h-4 w-4 mr-1" />New Check</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Survey</TableHead>
                    <TableHead>Fills</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Checked At</TableHead>
                    <TableHead>Checked By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checks.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>{format(new Date(c.reference_month), "MM/yyyy")}</TableCell>
                      <TableCell>{surveyMap[c.survey_id]?.title ?? "—"}</TableCell>
                      <TableCell className="font-semibold">{c.fills_count}</TableCell>
                      <TableCell>{c.expected_count}</TableCell>
                      <TableCell><Badge className={checkStatusColors[c.status]}>{c.status.replace("_", " ")}</Badge></TableCell>
                      <TableCell>{format(new Date(c.checked_at), "MM/dd/yyyy")}</TableCell>
                      <TableCell>{c.checked_by}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEditCheck(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteCheck(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!checks.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No monthly checks recorded</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Survey Dialog */}
      <Dialog open={surveyDialogOpen} onOpenChange={setSurveyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingSurvey ? "Edit Survey" : "New Survey"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Code *</Label><Input value={surveyForm.survey_code ?? ""} onChange={e => setSurveyForm({ ...surveyForm, survey_code: e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={surveyForm.status} onValueChange={v => setSurveyForm({ ...surveyForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Title *</Label><Input value={surveyForm.title ?? ""} onChange={e => setSurveyForm({ ...surveyForm, title: e.target.value })} /></div>
            <div className="col-span-2"><Label>Description</Label><Textarea value={surveyForm.description ?? ""} onChange={e => setSurveyForm({ ...surveyForm, description: e.target.value })} /></div>
            <div className="col-span-2"><Label>Form Link</Label><Input type="url" placeholder="https://…" value={surveyForm.form_link ?? ""} onChange={e => setSurveyForm({ ...surveyForm, form_link: e.target.value })} /></div>
            <div><Label>Target Audience</Label><Input value={surveyForm.target_audience ?? ""} onChange={e => setSurveyForm({ ...surveyForm, target_audience: e.target.value })} /></div>
            <div>
              <Label>Sample Size</Label>
              <Input
                type="number"
                placeholder="Total expected fills"
                value={surveyForm.manual_target ?? ""}
                onChange={e => setSurveyForm({ ...surveyForm, manual_target: e.target.value === "" ? null : parseInt(e.target.value) || 0 })}
              />
            </div>
            <div><Label>Start Date</Label><Input type="date" value={surveyForm.start_date ?? ""} onChange={e => setSurveyForm({ ...surveyForm, start_date: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={surveyForm.end_date ?? ""} onChange={e => setSurveyForm({ ...surveyForm, end_date: e.target.value })} /></div>
            <div className="col-span-2"><Label>Responsible</Label><Input value={surveyForm.responsible ?? ""} onChange={e => setSurveyForm({ ...surveyForm, responsible: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSurveyDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveSurvey}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Monthly Check Dialog */}
      <Dialog open={checkDialogOpen} onOpenChange={setCheckDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCheck ? "Edit Monthly Check" : "New Monthly Check"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Survey *</Label>
              <Select value={checkForm.survey_id} onValueChange={v => {
                const surv = surveys.find(s => s.id === v);
                setCheckForm({ ...checkForm, survey_id: v, expected_count: surv?.manual_target ?? 0 });
              }}>
                <SelectTrigger><SelectValue placeholder="Select survey" /></SelectTrigger>
                <SelectContent>{surveys.map(s => <SelectItem key={s.id} value={s.id}>{s.survey_code} — {s.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Reference Month *</Label><Input type="month" value={checkForm.reference_month?.slice(0, 7) ?? ""} onChange={e => setCheckForm({ ...checkForm, reference_month: e.target.value + "-01" })} /></div>
            <div><Label>Checked At</Label><Input type="date" value={checkForm.checked_at ?? ""} onChange={e => setCheckForm({ ...checkForm, checked_at: e.target.value })} /></div>
            <div><Label>Fills Count</Label><Input type="number" value={checkForm.fills_count ?? 0} onChange={e => setCheckForm({ ...checkForm, fills_count: parseInt(e.target.value) || 0 })} /></div>
            <div>
              <Label>Sample Size</Label>
              <Input type="number" disabled value={surveys.find(s => s.id === checkForm.survey_id)?.manual_target ?? ""} placeholder="Set on Survey" />
            </div>
            <div className="col-span-2"><Label>Checked By</Label><Input value={checkForm.checked_by ?? ""} onChange={e => setCheckForm({ ...checkForm, checked_by: e.target.value })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={checkForm.notes ?? ""} onChange={e => setCheckForm({ ...checkForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCheck}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePageLayout>
  );
}
