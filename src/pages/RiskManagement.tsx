import { todayDateOnly, parseLocalDate, formatDateOnly, formatInBrasilia } from "@/lib/dateUtils";
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
import { Plus, Pencil, Trash2, Search, Grid3X3, Upload, AlertTriangle, ArrowUpCircle, History, Activity } from "lucide-react";
import BulkImportDialog, { ColumnMapping } from "@/components/shared/BulkImportDialog";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";

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

interface MitigationAction {
  id: string;
  risk_id: string;
  project_id: string;
  action_type: "preventive" | "corrective";
  action_description: string;
  responsible: string | null;
  deadline: string | null;
  status: "pending" | "in_progress" | "done" | "cancelled";
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ReviewHistoryEntry {
  id: string;
  risk_id: string;
  reviewed_at: string;
  previous_next_review_date: string | null;
  new_next_review_date: string | null;
  reviewer: string | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
}

type ActionDraft = Omit<MitigationAction, "id" | "risk_id" | "project_id" | "created_at" | "updated_at" | "completed_at"> & {
  id?: string;
  _isNew?: boolean;
  _deleted?: boolean;
};

// PCL019 §4 categories
const CATEGORIES: { value: string; label: string }[] = [
  { value: "participant_safety", label: "Participant Safety" },
  { value: "data_quality", label: "Data Quality / Integrity" },
  { value: "regulatory", label: "Regulatory Compliance" },
  { value: "device", label: "Device / Product" },
  { value: "operational", label: "Operational / Timeline" },
  { value: "financial", label: "Financial" },
  { value: "vendor", label: "Vendor / Site" },
  { value: "other", label: "Other" },
];

const categoryColors: Record<string, string> = {
  participant_safety: "bg-red-100 text-red-800",
  data_quality: "bg-purple-100 text-purple-800",
  regulatory: "bg-indigo-100 text-indigo-800",
  device: "bg-pink-100 text-pink-800",
  operational: "bg-blue-100 text-blue-800",
  financial: "bg-amber-100 text-amber-800",
  vendor: "bg-teal-100 text-teal-800",
  other: "bg-gray-100 text-gray-800",
};

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

const ACTION_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

const actionStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

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

const fmt = (d?: string | null) => (d ? format(parseLocalDate(d), "dd/MM/yyyy", { locale: ptBR }) : "-");

export default function RiskManagement() {
  const navigate = useNavigate();
  const { projectId: persistedProjectId, setProjectId } = usePersistedFilters();
  const [selectedProject, setSelectedProject] = useState(persistedProjectId || "");
  const [records, setRecords] = useState<Risk[]>([]);
  const [actions, setActions] = useState<MitigationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Risk | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  // Action monitoring panel filters
  const [actionStatusFilter, setActionStatusFilter] = useState("all");
  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [actionRiskFilter, setActionRiskFilter] = useState("all");

  // Edit-dialog state
  const [actionDrafts, setActionDrafts] = useState<ActionDraft[]>([]);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryEntry[]>([]);

  const blankForm = {
    risk_code: "",
    description: "",
    category: "operational",
    probability: 3,
    impact: 3,
    potential_impact: "",
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

  // Track original next_review_date to detect changes
  const [originalReview, setOriginalReview] = useState<string | null>(null);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewNote, setReviewNote] = useState("");

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
    };
    check();
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    const [risksRes, actionsRes] = await Promise.all([
      supabase.from("risks").select("*").eq("project_id", selectedProject).order("risk_score", { ascending: false }),
      supabase.from("risk_mitigation_actions" as any).select("*").eq("project_id", selectedProject).order("deadline", { ascending: true, nullsFirst: false }),
    ]);
    setRecords((risksRes.data as any) || []);
    setActions((actionsRes.data as any) || []);
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

    const hasMitigation = actionDrafts.some(a => !a._deleted && a.action_description.trim());
    if ((level === "Critical" || level === "High") && !hasMitigation) {
      toast.error(`${level} risks require at least one Mitigation Action (SOP §6.7)`);
      return;
    }
    if ((level === "Critical" || level === "High") && !form.escalation_owner.trim()) {
      toast.error(`${level} risks require an Escalation Owner (SOP §6.8.3)`);
      return;
    }

    const nextReview = form.next_review_date || computeNextReview(form.identified_at, form.review_frequency);

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

    // Build a textual summary so the legacy mitigation_plan column stays in sync (used by exports/audit)
    const summary = actionDrafts
      .filter(a => !a._deleted && a.action_description.trim())
      .map(a => `[${a.action_type === "preventive" ? "P" : "C"}] ${a.action_description}${a.responsible ? ` — ${a.responsible}` : ""}${a.deadline ? ` (${a.deadline})` : ""}`)
      .join("\n");

    const payload: any = {
      project_id: selectedProject,
      risk_code: form.risk_code.trim(),
      description: form.description.trim(),
      category: form.category,
      probability: form.probability,
      impact: form.impact,
      potential_impact: form.potential_impact.trim() || null,
      mitigation_plan: summary || null,
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

    let riskId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("risks").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data, error } = await supabase.from("risks").insert(payload).select("id").single();
      if (error || !data) { toast.error(error?.message || "Failed to create"); return; }
      riskId = (data as any).id;
    }

    // Persist mitigation action changes
    for (const a of actionDrafts) {
      if (a._deleted && a.id) {
        await supabase.from("risk_mitigation_actions" as any).delete().eq("id", a.id);
      } else if (a._isNew && !a._deleted && a.action_description.trim()) {
        await supabase.from("risk_mitigation_actions" as any).insert({
          risk_id: riskId, project_id: selectedProject,
          action_type: a.action_type, action_description: a.action_description.trim(),
          responsible: a.responsible || null, deadline: a.deadline || null, status: a.status,
          notes: a.notes || null,
        });
      } else if (a.id && !a._deleted) {
        await supabase.from("risk_mitigation_actions" as any).update({
          action_type: a.action_type, action_description: a.action_description.trim(),
          responsible: a.responsible || null, deadline: a.deadline || null, status: a.status,
          completed_at: a.status === "done" ? new Date().toISOString() : null,
          notes: a.notes || null,
        }).eq("id", a.id);
      }
    }

    // Persist review history entry if next_review_date changed (or reviewer/note provided)
    if (editing && (originalReview !== nextReview || reviewerName.trim() || reviewNote.trim())) {
      await supabase.from("risk_review_history" as any).insert({
        risk_id: riskId, project_id: selectedProject,
        reviewed_at: todayDateOnly(),
        previous_next_review_date: originalReview,
        new_next_review_date: nextReview,
        reviewer: reviewerName.trim() || null,
        outcome: originalReview === nextReview ? "no_change" : "updated",
        notes: reviewNote.trim() || null,
      });
    }

    toast.success(editing ? "Risk updated" : "Risk created");
    setDialogOpen(false); setEditing(null); setForm(blankForm); setActionDrafts([]); setReviewHistory([]);
    setOriginalReview(null); setReviewerName(""); setReviewNote("");
    loadData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("risks").delete().eq("id", id);
    toast.success("Deleted"); loadData();
  };

  // Inline status update for actions in the monitoring panel
  const updateActionStatus = async (id: string, status: string) => {
    await supabase.from("risk_mitigation_actions" as any).update({
      status, completed_at: status === "done" ? new Date().toISOString() : null,
    }).eq("id", id);
    loadData();
  };

  const openNew = () => {
    setEditing(null); setForm(blankForm); setActionDrafts([]); setReviewHistory([]);
    setOriginalReview(null); setReviewerName(""); setReviewNote("");
    setDialogOpen(true);
  };
  const openEdit = async (r: Risk) => {
    setEditing(r);
    setForm({
      risk_code: r.risk_code,
      description: r.description,
      category: r.category,
      probability: r.probability,
      impact: r.impact,
      potential_impact: r.potential_impact || "",
      responsible: r.responsible || "",
      escalation_owner: r.escalation_owner || "",
      status: r.status,
      identified_at: r.identified_at,
      review_frequency: r.review_frequency || "quarterly",
      next_review_date: r.next_review_date || "",
      residual_probability: r.residual_probability || 0,
      residual_impact: r.residual_impact || 0,
    });
    setOriginalReview(r.next_review_date || null);
    setReviewerName(""); setReviewNote("");

    const [aRes, hRes] = await Promise.all([
      supabase.from("risk_mitigation_actions" as any).select("*").eq("risk_id", r.id).order("created_at"),
      supabase.from("risk_review_history" as any).select("*").eq("risk_id", r.id).order("reviewed_at", { ascending: false }),
    ]);
    const acts: MitigationAction[] = (aRes.data as any) || [];
    setActionDrafts(acts.map(a => ({
      id: a.id, action_type: a.action_type, action_description: a.action_description,
      responsible: a.responsible, deadline: a.deadline, status: a.status, notes: a.notes,
    })));
    setReviewHistory((hRes.data as any) || []);
    setDialogOpen(true);
  };

  const addActionRow = () => setActionDrafts(d => [...d, {
    _isNew: true, action_type: "preventive", action_description: "",
    responsible: "", deadline: "", status: "pending", notes: "",
  }]);
  const updateDraft = (idx: number, patch: Partial<ActionDraft>) => setActionDrafts(d => d.map((a, i) => i === idx ? { ...a, ...patch } : a));
  const removeDraft = (idx: number) => setActionDrafts(d => d.map((a, i) => i === idx ? { ...a, _deleted: true } : a).filter(a => !(a._deleted && a._isNew)));

  const filtered = records.filter(r => {
    const matchSearch = r.risk_code.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchLevel = levelFilter === "all" || classifyRisk(r.risk_score).level === levelFilter;
    return matchSearch && matchStatus && matchLevel;
  });

  const stats = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0, Minimal: 0 };
    records.forEach(r => { counts[classifyRisk(r.risk_score).level as keyof typeof counts]++; });
    return counts;
  }, [records]);

  const overdueReviews = records.filter(r => r.next_review_date && r.next_review_date < todayDateOnly() && r.status !== "closed").length;
  const escalatedCount = records.filter(r => r.escalated_at && r.status !== "closed").length;

  // Mitigation action stats
  const actionStats = useMemo(() => {
    const today = todayDateOnly();
    return {
      total: actions.length,
      pending: actions.filter(a => a.status === "pending").length,
      inProgress: actions.filter(a => a.status === "in_progress").length,
      done: actions.filter(a => a.status === "done").length,
      overdue: actions.filter(a => a.deadline && a.deadline < today && a.status !== "done" && a.status !== "cancelled").length,
    };
  }, [actions]);

  const filteredActions = actions.filter(a => {
    if (actionStatusFilter !== "all" && a.status !== actionStatusFilter) return false;
    if (actionTypeFilter !== "all" && a.action_type !== actionTypeFilter) return false;
    if (actionRiskFilter !== "all" && a.risk_id !== actionRiskFilter) return false;
    return true;
  });

  const riskByCode = useMemo(() => {
    const m = new Map<string, Risk>();
    records.forEach(r => m.set(r.id, r));
    return m;
  }, [records]);

  // Export — multiple sheets
  const risksSheet = filtered.map(r => ({
    "Risk ID": r.risk_code,
    Description: r.description,
    Category: CATEGORIES.find(c => c.value === r.category)?.label || r.category,
    Probability: r.probability,
    Impact: r.impact,
    "Risk Score": r.risk_score,
    "Risk Level": classifyRisk(r.risk_score).level,
    "Potential Impact": r.potential_impact || "",
    "Mitigation Summary": r.mitigation_plan || "",
    Responsible: r.responsible || "",
    "Escalation Owner": r.escalation_owner || "",
    Status: STATUSES.find(s => s.value === r.status)?.label || r.status,
    "Identified At": r.identified_at,
    "Review Frequency": r.review_frequency,
    "Next Review": r.next_review_date || "",
    "Residual Score": r.residual_risk_score || "",
    "Escalated": r.escalated_at ? "Yes" : "No",
    "Materialized": r.materialized_at ? "Yes" : "No",
  }));
  const actionsSheet = actions.map(a => {
    const r = riskByCode.get(a.risk_id);
    return {
      "Risk ID": r?.risk_code || "",
      "Risk Description": r?.description || "",
      "Action Type": a.action_type === "preventive" ? "Preventive" : "Corrective",
      "Action Description": a.action_description,
      Responsible: a.responsible || "",
      Deadline: a.deadline || "",
      Status: ACTION_STATUSES.find(s => s.value === a.status)?.label || a.status,
      "Completed At": a.completed_at ? formatInBrasilia(a.completed_at, "dd/MM/yyyy HH:mm") : "",
      Notes: a.notes || "",
    };
  });

  const exportData = { Risks: risksSheet, "Mitigation Actions": actionsSheet };

  // Import — single sheet for Risks; actions imported via a separate template sheet
  const importColumns: ColumnMapping[] = [
    { excelHeader: "Risk Code", dbColumn: "risk_code", required: true, example: "RSK-001" },
    { excelHeader: "Description", dbColumn: "description", required: true, example: "Low enrollment rate" },
    { excelHeader: "Category", dbColumn: "category", type: "enum", enumValues: CATEGORIES.map(c => c.value), example: "operational" },
    { excelHeader: "Probability", dbColumn: "probability", required: true, type: "integer", example: 3 },
    { excelHeader: "Impact", dbColumn: "impact", required: true, type: "integer", example: 4 },
    { excelHeader: "Potential Impact", dbColumn: "potential_impact" },
    { excelHeader: "Responsible", dbColumn: "responsible", example: "Dr. Silva" },
    { excelHeader: "Escalation Owner", dbColumn: "escalation_owner", example: "Sponsor PM" },
    { excelHeader: "Status", dbColumn: "status", type: "enum", enumValues: STATUSES.map(s => s.value), example: "open" },
    { excelHeader: "Identified At", dbColumn: "identified_at", type: "date", example: "15/01/2025" },
    { excelHeader: "Review Frequency", dbColumn: "review_frequency", type: "enum", enumValues: ["monthly","quarterly","semiannual","ad_hoc"], example: "quarterly" },
    { excelHeader: "Next Review Date", dbColumn: "next_review_date", type: "date", example: "15/04/2025" },
  ];

  const templateSheets = [
    {
      name: "Risks",
      data: [{
        "Risk Code": "RSK-001", "Description": "Low enrollment rate", "Category": "operational",
        "Probability": "3", "Impact": "4", "Potential Impact": "Study timeline delay",
        "Responsible": "Dr. Silva", "Escalation Owner": "Sponsor PM", "Status": "open",
        "Identified At": "15/01/2025", "Review Frequency": "quarterly", "Next Review Date": "15/04/2025",
      }],
    },
    {
      name: "Mitigation Actions",
      data: [{
        "Risk Code": "RSK-001", "Action Type": "preventive",
        "Action Description": "Add 2 backup sites", "Responsible": "CRA Lead",
        "Deadline": "01/03/2025", "Status": "pending", "Notes": "",
      }],
    },
  ];

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
      exportData={exportData as any}
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
          <TabsTrigger value="actions"><Activity className="h-4 w-4 mr-1" />Mitigation Monitoring</TabsTrigger>
          <TabsTrigger value="matrix">Risk Matrix 5×5</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                  <CardTitle>Risk Register</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-[180px]" />
                    </div>
                    <Select value={levelFilter} onValueChange={setLevelFilter}>
                      <SelectTrigger className="w-[120px]"><SelectValue placeholder="Level" /></SelectTrigger>
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
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
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
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>P</TableHead>
                        <TableHead>I</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Next Review</TableHead>
                        <TableHead className="w-[90px]">Actions</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {filtered.map(r => {
                          const lvl = classifyRisk(r.risk_score);
                          const overdue = r.next_review_date && r.next_review_date < todayDateOnly() && r.status !== "closed";
                          const actionCount = actions.filter(a => a.risk_id === r.id && a.status !== "cancelled").length;
                          const doneActions = actions.filter(a => a.risk_id === r.id && a.status === "done").length;
                          return (
                            <TableRow key={r.id} className="cursor-pointer" onClick={() => setActionRiskFilter(r.id)}>
                              <TableCell className="font-mono font-medium">
                                <div className="flex items-center gap-1">
                                  {r.risk_code}
                                  {r.escalated_at && <ArrowUpCircle className="h-3 w-3 text-orange-500" />}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[220px] truncate" title={r.description}>
                                {r.description}
                                {actionCount > 0 && <div className="text-[10px] text-muted-foreground mt-0.5">{doneActions}/{actionCount} actions done</div>}
                              </TableCell>
                              <TableCell><Badge className={categoryColors[r.category] || ""}>{CATEGORIES.find(c => c.value === r.category)?.label || r.category}</Badge></TableCell>
                              <TableCell>{r.probability}</TableCell>
                              <TableCell>{r.impact}</TableCell>
                              <TableCell><Badge className={lvl.color}>{r.risk_score} · {lvl.level}</Badge></TableCell>
                              <TableCell><Badge className={statusColors[r.status] || ""}>{STATUSES.find(s => s.value === r.status)?.label || r.status}</Badge></TableCell>
                              <TableCell className={overdue ? "text-red-600 font-medium" : ""}>{fmt(r.next_review_date)}</TableCell>
                              <TableCell onClick={e => e.stopPropagation()}>
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
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Side panel: action monitoring summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" />Mitigation Snapshot</CardTitle>
                  {actionRiskFilter !== "all" && (
                    <Button size="sm" variant="ghost" onClick={() => setActionRiskFilter("all")}>Clear</Button>
                  )}
                </div>
                {actionRiskFilter !== "all" && (
                  <p className="text-xs text-muted-foreground">Filtered by {riskByCode.get(actionRiskFilter)?.risk_code}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded border p-2"><div className="text-[10px] text-muted-foreground uppercase">Total</div><div className="text-xl font-bold">{actionStats.total}</div></div>
                  <div className="rounded border p-2"><div className="text-[10px] text-muted-foreground uppercase">In Progress</div><div className="text-xl font-bold text-blue-600">{actionStats.inProgress}</div></div>
                  <div className="rounded border p-2"><div className="text-[10px] text-muted-foreground uppercase">Done</div><div className="text-xl font-bold text-green-600">{actionStats.done}</div></div>
                  <div className="rounded border p-2"><div className="text-[10px] text-muted-foreground uppercase">Overdue</div><div className="text-xl font-bold text-red-600">{actionStats.overdue}</div></div>
                </div>
                <div className="max-h-[460px] overflow-y-auto space-y-2">
                  {filteredActions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No mitigation actions.</p>
                  ) : filteredActions.slice(0, 30).map(a => {
                    const r = riskByCode.get(a.risk_id);
                    const overdue = a.deadline && a.deadline < todayDateOnly() && a.status !== "done" && a.status !== "cancelled";
                    return (
                      <div key={a.id} className="border rounded p-2 text-xs space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-mono text-[10px] text-muted-foreground">{r?.risk_code}</span>
                          <Badge variant="outline" className="text-[10px]">{a.action_type === "preventive" ? "Prev" : "Corr"}</Badge>
                        </div>
                        <p className="line-clamp-2">{a.action_description}</p>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">{a.responsible || "—"}</span>
                          <span className={overdue ? "text-red-600 font-medium" : "text-muted-foreground"}>{fmt(a.deadline)}</span>
                        </div>
                        <Select value={a.status} onValueChange={v => updateActionStatus(a.id, v)}>
                          <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{ACTION_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <CardTitle>Mitigation Actions Monitoring</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Select value={actionRiskFilter} onValueChange={setActionRiskFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Risk" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risks</SelectItem>
                      {records.map(r => <SelectItem key={r.id} value={r.id}>{r.risk_code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="preventive">Preventive</SelectItem>
                      <SelectItem value="corrective">Corrective</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={actionStatusFilter} onValueChange={setActionStatusFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {ACTION_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredActions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No mitigation actions.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Risk</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Responsible</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredActions.map(a => {
                      const r = riskByCode.get(a.risk_id);
                      const overdue = a.deadline && a.deadline < todayDateOnly() && a.status !== "done" && a.status !== "cancelled";
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono text-xs">{r?.risk_code || "-"}</TableCell>
                          <TableCell><Badge variant="outline">{a.action_type === "preventive" ? "Preventive" : "Corrective"}</Badge></TableCell>
                          <TableCell className="max-w-[300px]">{a.action_description}</TableCell>
                          <TableCell className="text-xs">{a.responsible || "-"}</TableCell>
                          <TableCell className={overdue ? "text-red-600 font-medium text-xs" : "text-xs"}>{fmt(a.deadline)}</TableCell>
                          <TableCell>
                            <Select value={a.status} onValueChange={v => updateActionStatus(a.id, v)}>
                              <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                              <SelectContent>{ACTION_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                            </Select>
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
                        <th key={i} className="p-2 text-xs font-medium border bg-muted text-center">{i} – {impactLabels[i]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.map((row, pi) => {
                      const prob = 5 - pi;
                      return (
                        <tr key={pi}>
                          <td className="p-2 text-xs font-medium border bg-muted text-center">{prob} – {probabilityLabels[prob].split(" ")[0]}</td>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "New"} Risk</DialogTitle>
            <DialogDescription>Per SOP PCL019 — Critical/High risks require at least one Mitigation Action and an Escalation Owner.</DialogDescription>
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
            <div><Label>Risk Description</Label><Textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div><Label>Potential Impact</Label><Textarea rows={2} value={form.potential_impact} onChange={e => setForm({...form, potential_impact: e.target.value})} /></div>

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

            {/* Mitigation Plan — list of preventive/corrective actions */}
            <div className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Mitigation Plan — Actions {(currentLevel.level === "Critical" || currentLevel.level === "High") && <span className="text-destructive">*</span>}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addActionRow}><Plus className="h-3 w-3 mr-1" />Add Action</Button>
              </div>
              {actionDrafts.filter(a => !a._deleted).length === 0 ? (
                <p className="text-xs text-muted-foreground">No actions yet. Add preventive or corrective actions.</p>
              ) : (
                <div className="space-y-2">
                  {actionDrafts.map((a, idx) => a._deleted ? null : (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-start border rounded p-2">
                      <div className="col-span-2">
                        <Select value={a.action_type} onValueChange={v => updateDraft(idx, { action_type: v as any })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="preventive">Preventive</SelectItem>
                            <SelectItem value="corrective">Corrective</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Input className="col-span-4 h-8 text-xs" placeholder="Action description" value={a.action_description} onChange={e => updateDraft(idx, { action_description: e.target.value })} />
                      <Input className="col-span-2 h-8 text-xs" placeholder="Responsible" value={a.responsible || ""} onChange={e => updateDraft(idx, { responsible: e.target.value })} />
                      <Input type="date" className="col-span-2 h-8 text-xs" value={a.deadline || ""} onChange={e => updateDraft(idx, { deadline: e.target.value })} />
                      <div className="col-span-1">
                        <Select value={a.status} onValueChange={v => updateDraft(idx, { status: v as any })}>
                          <SelectTrigger className="h-8 text-xs px-2"><SelectValue /></SelectTrigger>
                          <SelectContent>{ACTION_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="col-span-1 h-8 w-8" onClick={() => removeDraft(idx)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Responsible</Label><Input value={form.responsible} onChange={e => setForm({...form, responsible: e.target.value})} /></div>
              <div><Label>Escalation Owner {(currentLevel.level === "Critical" || currentLevel.level === "High") && <span className="text-destructive">*</span>}</Label>
                <Input value={form.escalation_owner} onChange={e => setForm({...form, escalation_owner: e.target.value})} />
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

            {/* Review history */}
            {editing && (
              <div className="border rounded-md p-3 space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2"><History className="h-4 w-4" />Review History</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input className="h-8 text-xs" placeholder="Reviewer name (optional)" value={reviewerName} onChange={e => setReviewerName(e.target.value)} />
                  <Input className="h-8 text-xs" placeholder="Review notes (optional)" value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
                </div>
                <p className="text-[10px] text-muted-foreground">A history entry is recorded when Next Review Date changes or when a reviewer/note is provided on save.</p>
                {reviewHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No previous reviews.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="text-xs">Reviewed</TableHead>
                        <TableHead className="text-xs">Previous</TableHead>
                        <TableHead className="text-xs">New</TableHead>
                        <TableHead className="text-xs">Reviewer</TableHead>
                        <TableHead className="text-xs">Outcome</TableHead>
                        <TableHead className="text-xs">Notes</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {reviewHistory.map(h => (
                          <TableRow key={h.id}>
                            <TableCell className="text-xs">{fmt(h.reviewed_at)}</TableCell>
                            <TableCell className="text-xs">{fmt(h.previous_next_review_date)}</TableCell>
                            <TableCell className="text-xs">{fmt(h.new_next_review_date)}</TableCell>
                            <TableCell className="text-xs">{h.reviewer || "-"}</TableCell>
                            <TableCell className="text-xs">{h.outcome || "-"}</TableCell>
                            <TableCell className="text-xs">{h.notes || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

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

      <BulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        tableName="risks"
        entityLabel="Risks"
        projectId={selectedProject}
        columns={importColumns}
        templateSheets={templateSheets}
        sheetName="Risks"
        onSuccess={loadData}
      />
    </ModulePageLayout>
  );
}
