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

interface Submission {
  id: string;
  project_id: string | null;
  site_id?: string | null;
  submission_type: string;
  planned_date: string | null;
  submission_date: string | null;
  approval_date?: string | null;
  code?: string | null;
  status: string;
  notes: string | null;
  compliance_response?: string | null;
}

interface EditSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: Submission | null;
  projects: Project[];
  onSuccess: () => void;
}

const submissionTypes = [
  "ANVISA DICD Submission",
  "ANVISA Protocol Submission",
  "Coordinator Site Initial Submission",
  "Participating Site Initial Submission",
  "EC Protocol Amendment",
  "ANVISA DICD Amendment",
  "ANVISA Protocol Amendment",
  "ANVISA Notification",
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

export default function EditSubmissionDialog({
  open,
  onOpenChange,
  submission,
  projects,
  onSuccess,
}: EditSubmissionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [formData, setFormData] = useState({
    project_id: "",
    site_id: "none",
    submission_type: "",
    planned_date: "",
    submission_date: "",
    approval_date: "",
    code: "",
    status: "pending",
    notes: "",
    compliance_response: "",
    has_requirements: "no",
    requirement_date: "",
    requirement_due_date: "",
    requirement_submitted_date: "",
  });

  useEffect(() => {
    if (submission && open) {
      setFormData({
        project_id: submission.project_id || "",
        site_id: (submission as any).site_id || "none",
        submission_type: submission.submission_type,
        planned_date: submission.planned_date || "",
        submission_date: submission.submission_date || "",
        approval_date: (submission as any).approval_date || "",
        code: (submission as any).code || "",
        status: submission.status,
        notes: submission.notes || "",
        compliance_response: (submission as any).compliance_response || "",
        has_requirements: (submission as any).has_requirements ? "yes" : "no",
        requirement_date: (submission as any).requirement_date || "",
        requirement_due_date: (submission as any).requirement_due_date || "",
        requirement_submitted_date: (submission as any).requirement_submitted_date || "",
      });
    }
  }, [submission, open]);

  useEffect(() => {
    if (!formData.project_id) { setSites([]); return; }
    supabase.from("research_centers").select("id, code, name").eq("project_id", formData.project_id).then(({ data }) => setSites(data || []));
  }, [formData.project_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission || !formData.project_id || !formData.submission_type) {
      toast({
        title: "Error",
        description: "Study and submission type are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const hasReq = formData.has_requirements === "yes";
      let finalStatus = formData.status;
      if (formData.approval_date && !["rejected", "revision_required"].includes(finalStatus)) {
        finalStatus = "approved";
      } else if (hasReq && formData.requirement_submitted_date) {
        if (!["rejected"].includes(finalStatus)) finalStatus = "submitted";
      } else if (hasReq && formData.requirement_date) {
        if (!["rejected"].includes(finalStatus)) finalStatus = "revision_required";
      } else if (!formData.approval_date && !formData.submission_date) {
        finalStatus = "pending";
      }
      const { error } = await supabase
        .from("regulatory_submissions")
        .update({
          project_id: formData.project_id,
          site_id: formData.site_id && formData.site_id !== "none" ? formData.site_id : null,
          submission_type: formData.submission_type,
          planned_date: formData.planned_date || null,
          submission_date: formData.submission_date || null,
          approval_date: formData.approval_date || null,
          code: formData.code || null,
          status: finalStatus as "pending" | "submitted" | "under_review" | "approved" | "rejected" | "revision_required",
          notes: formData.notes || null,
          compliance_response: formData.compliance_response || null,
          requirement_date: formData.requirement_date || null,
          requirement_due_date: formData.requirement_due_date || null,
          requirement_submitted_date: formData.requirement_submitted_date || null,
          has_requirements: formData.has_requirements === "yes",
        } as any)
        .eq("id", submission.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Submission updated successfully",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error updating submission",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!submission) return;
    
    if (!confirm("Are you sure you want to delete this submission?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("regulatory_submissions")
        .delete()
        .eq("id", submission.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Submission deleted successfully",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error deleting submission",
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
          <DialogTitle>Edit Regulatory Submission</DialogTitle>
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
            <Label htmlFor="type">Submission Type *</Label>
            <Select
              value={formData.submission_type}
              onValueChange={(value) => setFormData({ ...formData, submission_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {submissionTypes.map((type) => (
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
            <Label htmlFor="code">Submission / Amendment Code</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., SUB-2026-001 or AMD-2026-002"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="planned_date">Planned Date</Label>
              <Input
                id="planned_date"
                type="date"
                value={formData.planned_date}
                onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submission_date">Submission Date</Label>
              <Input
                id="submission_date"
                type="date"
                value={formData.submission_date}
                onChange={(e) => {
                  const v = e.target.value;
                  const next = { ...formData, submission_date: v };
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
                  else if (!formData.submission_date) next.status = "pending";
                  setFormData(next);
                }}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-semibold">Requirements</Label>
              <Select
                value={formData.has_requirements}
                onValueChange={(v) => {
                  const next = { ...formData, has_requirements: v };
                  if (v === "yes" && !formData.approval_date && !["rejected"].includes(formData.status)) {
                    next.status = formData.requirement_submitted_date ? "submitted" : "revision_required";
                  }
                  setFormData(next);
                }}
              >
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="requirement_date" className="text-xs">Requirement Date</Label>
                <Input
                  id="requirement_date"
                  type="date"
                  disabled={formData.has_requirements !== "yes"}
                  value={formData.requirement_date}
                  onChange={(e) => {
                    const v = e.target.value;
                    const next = { ...formData, requirement_date: v };
                    if (formData.has_requirements === "yes" && v && !formData.requirement_submitted_date && !formData.approval_date && !["rejected"].includes(formData.status)) {
                      next.status = "revision_required";
                    }
                    setFormData(next);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="requirement_due_date" className="text-xs">Due Date</Label>
                <Input
                  id="requirement_due_date"
                  type="date"
                  disabled={formData.has_requirements !== "yes"}
                  value={formData.requirement_due_date}
                  onChange={(e) => setFormData({ ...formData, requirement_due_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="requirement_submitted_date" className="text-xs">Submitted Date</Label>
                <Input
                  id="requirement_submitted_date"
                  type="date"
                  disabled={formData.has_requirements !== "yes"}
                  value={formData.requirement_submitted_date}
                  onChange={(e) => {
                    const v = e.target.value;
                    const next = { ...formData, requirement_submitted_date: v };
                    if (formData.has_requirements === "yes" && v && !formData.approval_date && !["rejected"].includes(formData.status)) {
                      next.status = "submitted";
                    }
                    setFormData(next);
                  }}
                />
              </div>
            </div>
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="compliance_response">Compliance Response</Label>
            <Textarea
              id="compliance_response"
              value={formData.compliance_response}
              onChange={(e) => setFormData({ ...formData, compliance_response: e.target.value })}
              placeholder="Describe requirements received and how they were addressed..."
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
