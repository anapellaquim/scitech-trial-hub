import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Project {
  id: string;
  title: string;
}

interface Site { id: string; code: string; name: string; }

interface Report {
  id: string;
  project_id: string | null;
  site_id?: string | null;
  report_type: string;
  due_date: string;
  submitted_date: string | null;
  approval_date?: string | null;
  code?: string | null;
  status: string;
  notes: string | null;
  recurrence_type?: string | null;
  recurrence_end_date?: string | null;
}

interface EditReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: Report | null;
  projects: Project[];
  onSuccess: () => void;
}

const reportTypes = [
  "Safety Report",
  "Study Progress Report",
  "Adverse Event Report",
  "Protocol Deviation Report",
  "ANVISA Annual Progress Report",
  "ANVISA Final Report",
  "Other",
];

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "revision_required", label: "Revision Required" },
];

const recurrenceOptions = [
  { value: "none", label: "No recurrence" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semiannual", label: "Semiannual" },
  { value: "annual", label: "Annual" },
];

export default function EditReportDialog({
  open,
  onOpenChange,
  report,
  projects,
  onSuccess,
}: EditReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [formData, setFormData] = useState({
    project_id: "",
    site_id: "none",
    report_type: "",
    due_date: "",
    submitted_date: "",
    approval_date: "",
    code: "",
    status: "pending",
    notes: "",
    recurrence_type: "none",
    recurrence_end_date: "",
    has_requirements: "no",
    requirement_date: "",
    requirement_due_date: "",
    requirement_submitted_date: "",
  });

  useEffect(() => {
    if (report && open) {
      setFormData({
        project_id: report.project_id || "",
        site_id: (report as any).site_id || "none",
        report_type: report.report_type,
        due_date: report.due_date || "",
        submitted_date: report.submitted_date || "",
        approval_date: (report as any).approval_date || "",
        code: (report as any).code || "",
        status: report.status,
        notes: report.notes || "",
        recurrence_type: report.recurrence_type || "none",
        recurrence_end_date: report.recurrence_end_date || "",
        has_requirements: (report as any).has_requirements ? "yes" : "no",
        requirement_date: (report as any).requirement_date || "",
        requirement_due_date: (report as any).requirement_due_date || "",
        requirement_submitted_date: (report as any).requirement_submitted_date || "",
      });
    }
  }, [report, open]);

  useEffect(() => {
    if (!formData.project_id) { setSites([]); return; }
    supabase.from("research_centers").select("id, code, name").eq("project_id", formData.project_id).then(({ data }) => setSites(data || []));
  }, [formData.project_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !formData.project_id || !formData.report_type || !formData.due_date) {
      toast({
        title: "Error",
        description: "Study, report type and due date are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let finalStatus = formData.status;
      if (formData.approval_date && !["rejected", "revision_required"].includes(finalStatus)) {
        finalStatus = "approved";
      } else if (!formData.approval_date && !formData.submitted_date) {
        finalStatus = "pending";
      }
      const { error } = await supabase
        .from("regulatory_reports")
        .update({
          project_id: formData.project_id,
          site_id: formData.site_id && formData.site_id !== "none" ? formData.site_id : null,
          report_type: formData.report_type,
          due_date: formData.due_date,
          submitted_date: formData.submitted_date || null,
          approval_date: formData.approval_date || null,
          code: formData.code || null,
          status: finalStatus as "pending" | "submitted" | "under_review" | "approved" | "rejected" | "revision_required",
          notes: formData.notes || null,
          recurrence_type: formData.recurrence_type,
          recurrence_end_date: formData.recurrence_end_date || null,
          requirement_date: formData.requirement_date || null,
          requirement_due_date: formData.requirement_due_date || null,
          requirement_submitted_date: formData.requirement_submitted_date || null,
        } as any)
        .eq("id", report.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report updated successfully",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error updating report",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!report) return;

    if (!confirm("Are you sure you want to delete this report?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("regulatory_reports")
        .delete()
        .eq("id", report.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report deleted successfully",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error deleting report",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Regulatory Report</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project">Study *</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select study" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Report Type *</Label>
            <Select
              value={formData.report_type}
              onValueChange={(value) => setFormData({ ...formData, report_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Site</Label>
            <Select value={formData.site_id} onValueChange={v => setFormData({ ...formData, site_id: v })} disabled={!formData.project_id}>
              <SelectTrigger><SelectValue placeholder={formData.project_id ? "Optional" : "Select a study first"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None (entire study) —</SelectItem>
                {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.code} · {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Report Code</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., REP-2026-001"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submitted_date">Submitted Date</Label>
              <Input
                id="submitted_date"
                type="date"
                value={formData.submitted_date}
                onChange={(e) => {
                  const v = e.target.value;
                  const next = { ...formData, submitted_date: v };
                  if (v) next.status = "submitted";
                  else if (!formData.approval_date) next.status = "pending";
                  setFormData(next);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="approval_date">Approval Date</Label>
              <Input
                id="approval_date"
                type="date"
                value={formData.approval_date}
                onChange={(e) => {
                  const v = e.target.value;
                  const next = { ...formData, approval_date: v };
                  if (v) next.status = "approved";
                  else if (!formData.submitted_date) next.status = "pending";
                  setFormData(next);
                }}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <Label className="text-sm font-semibold">Requirements</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="requirement_date" className="text-xs">Requirement Date</Label>
                <Input
                  id="requirement_date"
                  type="date"
                  value={formData.requirement_date}
                  onChange={(e) => setFormData({ ...formData, requirement_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="requirement_due_date" className="text-xs">Due Date</Label>
                <Input
                  id="requirement_due_date"
                  type="date"
                  value={formData.requirement_due_date}
                  onChange={(e) => setFormData({ ...formData, requirement_due_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="requirement_submitted_date" className="text-xs">Submitted Date</Label>
                <Input
                  id="requirement_submitted_date"
                  type="date"
                  value={formData.requirement_submitted_date}
                  onChange={(e) => setFormData({ ...formData, requirement_submitted_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurrence">Recurrence</Label>
            <Select
              value={formData.recurrence_type}
              onValueChange={(value) => setFormData({ ...formData, recurrence_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recurrence" />
              </SelectTrigger>
              <SelectContent>
                {recurrenceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.recurrence_type !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="recurrence_end_date">Recurrence End Date</Label>
              <Input
                id="recurrence_end_date"
                type="date"
                value={formData.recurrence_end_date}
                onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                min={formData.due_date}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank for indefinite recurrence
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
              Delete
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
