import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import CTMSNav from "@/components/CTMSNav";
import ExcelExportButton from "@/components/shared/ExcelExportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, History, ExternalLink, FileCheck, AlertCircle, FileText, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import KpiCards from "@/components/shared/KpiCards";
import { format, addMonths, parseISO, differenceInDays } from "date-fns";

type DocType = "clinical_evaluation_report" | "systematic_literature_review" | "other";
type DocStatus = "draft" | "under_review" | "approved" | "superseded" | "archived";

interface CEDocument {
  id: string;
  project_id: string | null;
  document_type: DocType;
  title: string;
  code: string | null;
  version: string;
  status: DocStatus;
  author: string | null;
  approver: string | null;
  issue_date: string | null;
  approval_date: string | null;
  review_periodicity_months: number;
  last_review_date: string | null;
  next_review_date: string | null;
  link: string | null;
  notes: string | null;
}

interface CEVersion {
  id: string;
  document_id: string;
  version: string;
  change_summary: string | null;
  link: string | null;
  author: string | null;
  issued_at: string | null;
  created_at: string;
  revision_type: "minor" | "major";
  revision_reason: string | null;
}

const DOC_TYPE_LABEL: Record<DocType, string> = {
  clinical_evaluation_report: "Clinical Evaluation Report",
  systematic_literature_review: "Systematic Literature Review",
  other: "Other",
};

const STATUS_COLORS: Record<DocStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  superseded: "bg-blue-100 text-blue-800",
  archived: "bg-slate-200 text-slate-700",
};

const STATUS_LABEL: Record<DocStatus, string> = {
  draft: "Draft",
  under_review: "Under Review",
  approved: "Approved",
  superseded: "Superseded",
  archived: "Archived",
};

const emptyForm = () => ({
  id: "" as string,
  document_type: "clinical_evaluation_report" as DocType,
  title: "",
  code: "",
  version: "1.0",
  status: "draft" as DocStatus,
  author: "",
  approver: "",
  issue_date: "",
  approval_date: "",
  review_periodicity_months: 12,
  last_review_date: "",
  next_review_date: "",
  link: "",
  notes: "",
});

function computeNextReview(last: string | null, months: number): string | null {
  if (!last || !months) return null;
  try {
    return format(addMonths(parseISO(last), months), "yyyy-MM-dd");
  } catch {
    return null;
  }
}

function reviewBadge(nextReview: string | null) {
  if (!nextReview) return null;
  const days = differenceInDays(parseISO(nextReview), new Date());
  if (days < 0) return <Badge className="bg-red-100 text-red-800 gap-1"><AlertCircle className="h-3 w-3" />Overdue ({Math.abs(days)}d)</Badge>;
  if (days <= 30) return <Badge className="bg-orange-100 text-orange-800">Due in {days}d</Badge>;
  if (days <= 90) return <Badge className="bg-yellow-100 text-yellow-800">In {days}d</Badge>;
  return <Badge className="bg-green-100 text-green-800">In {days}d</Badge>;
}

export default function ClinicalEvaluation() {
  const [records, setRecords] = useState<CEDocument[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CEDocument | null>(null);
  const [form, setForm] = useState(emptyForm());

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDoc, setHistoryDoc] = useState<CEDocument | null>(null);
  const [versions, setVersions] = useState<CEVersion[]>([]);
  const [newVersion, setNewVersion] = useState({ version: "", change_summary: "", link: "", author: "", issued_at: "", revision_type: "minor" as "minor" | "major", revision_reason: "" });

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clinical_evaluation_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load documents: " + error.message);
    } else {
      setRecords((data || []) as CEDocument[]);
    }
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

  const openEdit = (r: CEDocument) => {
    setEditing(r);
    setForm({
      id: r.id,
      document_type: r.document_type,
      title: r.title,
      code: r.code || "",
      version: r.version,
      status: r.status,
      author: r.author || "",
      approver: r.approver || "",
      issue_date: r.issue_date || "",
      approval_date: r.approval_date || "",
      review_periodicity_months: r.review_periodicity_months,
      last_review_date: r.last_review_date || "",
      next_review_date: r.next_review_date || "",
      link: r.link || "",
      notes: r.notes || "",
    });
    setDialogOpen(true);
  };

  // Auto-compute next review when last_review or periodicity changes (unless user overrode)
  useEffect(() => {
    if (!dialogOpen) return;
    const computed = computeNextReview(form.last_review_date || null, form.review_periodicity_months);
    if (computed && !form.next_review_date) {
      setForm((f) => ({ ...f, next_review_date: computed }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.last_review_date, form.review_periodicity_months]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const payload = {
      document_type: form.document_type,
      title: form.title.trim(),
      code: form.code || null,
      version: form.version || "1.0",
      status: form.status,
      author: form.author || null,
      approver: form.approver || null,
      issue_date: form.issue_date || null,
      approval_date: form.approval_date || null,
      review_periodicity_months: form.review_periodicity_months || 12,
      last_review_date: form.last_review_date || null,
      next_review_date:
        form.next_review_date ||
        computeNextReview(form.last_review_date || null, form.review_periodicity_months),
      link: form.link || null,
      notes: form.notes || null,
    };

    const { error } = editing
      ? await supabase.from("clinical_evaluation_documents").update(payload).eq("id", editing.id)
      : await supabase.from("clinical_evaluation_documents").insert(payload);

    if (error) {
      toast.error("Save failed: " + error.message);
      return;
    }
    toast.success(editing ? "Document updated" : "Document created");
    setDialogOpen(false);
    loadRecords();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document and its version history?")) return;
    const { error } = await supabase.from("clinical_evaluation_documents").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed: " + error.message);
      return;
    }
    toast.success("Document deleted");
    loadRecords();
  };

  const openHistory = async (doc: CEDocument) => {
    setHistoryDoc(doc);
    setHistoryOpen(true);
    setNewVersion({ version: "", change_summary: "", link: "", author: "", issued_at: "", revision_type: "minor", revision_reason: "" });
    const { data, error } = await supabase
      .from("clinical_evaluation_document_versions")
      .select("*")
      .eq("document_id", doc.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load history: " + error.message);
      return;
    }
    setVersions((data || []) as CEVersion[]);
  };

  const addVersion = async () => {
    if (!historyDoc) return;
    if (!newVersion.version.trim()) {
      toast.error("Version is required");
      return;
    }
    const { error } = await supabase.from("clinical_evaluation_document_versions").insert({
      document_id: historyDoc.id,
      version: newVersion.version.trim(),
      change_summary: newVersion.change_summary || null,
      link: newVersion.link || null,
      author: newVersion.author || null,
      issued_at: newVersion.issued_at || null,
      revision_type: newVersion.revision_type,
      revision_reason: newVersion.revision_reason || null,
    } as any);
    if (error) {
      toast.error("Failed to add version: " + error.message);
      return;
    }
    // Also update the document's current version
    await supabase
      .from("clinical_evaluation_documents")
      .update({ version: newVersion.version.trim() })
      .eq("id", historyDoc.id);

    toast.success("Version added");
    openHistory(historyDoc);
    loadRecords();
  };

  const activeRecords = useMemo(
    () => records.filter((r) => r.status !== "superseded"),
    [records]
  );

  const exportData = useMemo(
    () =>
      activeRecords.map((r) => ({
        Title: r.title,
        Code: r.code,
        Type: DOC_TYPE_LABEL[r.document_type],
        Version: r.version,
        Status: STATUS_LABEL[r.status],
        Author: r.author,
        Approver: r.approver,
        "Issue Date": r.issue_date,
        "Approval Date": r.approval_date,
        "Review Periodicity (months)": r.review_periodicity_months,
        "Last Review": r.last_review_date,
        "Next Review": r.next_review_date,
        Link: r.link,
      })),
    [activeRecords],
  );

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Clinical Evaluation</h2>
            <p className="text-muted-foreground">Document control for clinical evaluation reports and systematic literature reviews</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ExcelExportButton data={exportData} fileName="clinical-evaluation-documents" />
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> New Document
            </Button>
          </div>
        </div>
      {(() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const total = activeRecords.length;
        const approved = activeRecords.filter(r => r.status === "approved").length;
        const drafts = activeRecords.filter(r => r.status === "draft" || r.status === "under_review").length;
        const overdue = activeRecords.filter(r => r.next_review_date && new Date(r.next_review_date) < today).length;
        const dueSoon = activeRecords.filter(r => {
          if (!r.next_review_date) return false;
          const d = new Date(r.next_review_date);
          const diff = (d.getTime() - today.getTime()) / 86400000;
          return diff >= 0 && diff <= 60;
        }).length;
        const archived = activeRecords.filter(r => r.status === "archived").length;
        return (
          <div className="mb-6">
            <KpiCards cols={6} items={[
              { label: "Total Documents", value: total, icon: FileText, accent: "primary" },
              { label: "Approved", value: approved, icon: CheckCircle2, accent: "success" },
              { label: "Draft / In Review", value: drafts, icon: Clock, accent: "warning" },
              { label: "Review Overdue", value: overdue, icon: AlertTriangle, accent: "danger" },
              { label: "Review ≤ 60d", value: dueSoon, icon: AlertCircle, accent: "warning" },
              { label: "Archived", value: archived, icon: FileCheck, accent: "muted" },
            ]} />
          </div>
        );
      })()}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : activeRecords.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No documents yet. Click "New Document" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Review</TableHead>
                  <TableHead>Next Review</TableHead>
                  <TableHead>Periodicity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRecords.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.title}</div>
                      {r.code && <div className="text-xs text-muted-foreground">{r.code}</div>}
                    </TableCell>
                    <TableCell>{DOC_TYPE_LABEL[r.document_type]}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <FileCheck className="h-3 w-3" />
                        {r.version}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.last_review_date || "—"}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col gap-1">
                        <span>{r.next_review_date || "—"}</span>
                        {reviewBadge(r.next_review_date)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.review_periodicity_months}m</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {r.link && (
                          <Button type="button" variant="ghost" size="icon" asChild>
                            <a href={r.link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button type="button" variant="ghost" size="icon" onClick={() => openHistory(r)}>
                          <History className="h-4 w-4" />
                        </Button>
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
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Document" : "New Document"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. CER-001" />
            </div>
            <div className="space-y-2">
              <Label>Current Version</Label>
              <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as DocStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Author</Label>
              <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Approver</Label>
              <Input value={form.approver} onChange={(e) => setForm({ ...form, approver: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Approval Date</Label>
              <Input type="date" value={form.approval_date} onChange={(e) => setForm({ ...form, approval_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Review Periodicity (months)</Label>
              <Input
                type="number"
                min={1}
                value={form.review_periodicity_months}
                onChange={(e) => setForm({ ...form, review_periodicity_months: parseInt(e.target.value) || 12 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Last Review Date</Label>
              <Input type="date" value={form.last_review_date} onChange={(e) => setForm({ ...form, last_review_date: e.target.value, next_review_date: "" })} />
            </div>
            <div className="space-y-2">
              <Label>Next Review Date</Label>
              <Input type="date" value={form.next_review_date} onChange={(e) => setForm({ ...form, next_review_date: e.target.value })} />
              <p className="text-xs text-muted-foreground">Auto-calculated from last review + periodicity. Editable.</p>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Document Link</Label>
              <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version History — {historyDoc?.title}</DialogTitle>
          </DialogHeader>

          <div className="border rounded-md p-4 space-y-3 bg-muted/30">
            <div className="font-medium text-sm">Add new version</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Version *</Label>
                <Input value={newVersion.version} onChange={(e) => setNewVersion({ ...newVersion, version: e.target.value })} placeholder="e.g. 2.0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Issued at</Label>
                <Input type="date" value={newVersion.issued_at} onChange={(e) => setNewVersion({ ...newVersion, issued_at: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Revision Type *</Label>
                <Select value={newVersion.revision_type} onValueChange={(v) => setNewVersion({ ...newVersion, revision_type: v as "minor" | "major" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor Revision</SelectItem>
                    <SelectItem value="major">Major Revision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Author</Label>
                <Input value={newVersion.author} onChange={(e) => setNewVersion({ ...newVersion, author: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Link</Label>
                <Input value={newVersion.link} onChange={(e) => setNewVersion({ ...newVersion, link: e.target.value })} placeholder="https://..." />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Revision Reason</Label>
                <Textarea rows={2} value={newVersion.revision_reason} onChange={(e) => setNewVersion({ ...newVersion, revision_reason: e.target.value })} placeholder="Why was this revision made?" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Change summary</Label>
                <Textarea rows={2} value={newVersion.change_summary} onChange={(e) => setNewVersion({ ...newVersion, change_summary: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={addVersion}>
                <Plus className="h-4 w-4 mr-1" /> Add version
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Change Summary</TableHead>
                <TableHead>Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">No versions recorded yet.</TableCell>
                </TableRow>
              ) : (
                versions.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell><Badge variant="outline">{v.version}</Badge></TableCell>
                    <TableCell>
                      <Badge className={v.revision_type === "major" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
                        {v.revision_type === "major" ? "Major" : "Minor"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{v.issued_at || "—"}</TableCell>
                    <TableCell className="text-sm">{v.author || "—"}</TableCell>
                    <TableCell className="text-sm">{v.revision_reason || "—"}</TableCell>
                    <TableCell className="text-sm">{v.change_summary || "—"}</TableCell>
                    <TableCell>
                      {v.link ? (
                        <a href={v.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> Open
                        </a>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
      </main>
    </div>
  );
}
