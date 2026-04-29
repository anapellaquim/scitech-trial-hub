import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Site { id: string; code: string; name: string; }

interface Project {
  id: string;
  title: string;
}

interface NewSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export default function NewSubmissionDialog({
  open,
  onOpenChange,
  projects,
  onSuccess,
}: NewSubmissionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [formData, setFormData] = useState({
    project_id: "",
    site_id: "none",
    submission_type: "",
    planned_date: "",
    approval_date: "",
    code: "",
    notes: "",
    compliance_response: "",
  });

  useEffect(() => {
    if (!formData.project_id) { setSites([]); return; }
    supabase.from("research_centers").select("id, code, name").eq("project_id", formData.project_id).then(({ data }) => setSites(data || []));
  }, [formData.project_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || !formData.submission_type) {
      toast({
        title: "Error",
        description: "Study and submission type are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("regulatory_submissions").insert({
        project_id: formData.project_id,
        site_id: formData.site_id && formData.site_id !== "none" ? formData.site_id : null,
        submission_type: formData.submission_type,
        planned_date: formData.planned_date || null,
        approval_date: formData.approval_date || null,
        code: formData.code || null,
        notes: formData.notes || null,
        compliance_response: formData.compliance_response || null,
        status: "pending",
      } as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Submission created successfully",
      });
      onOpenChange(false);
      setFormData({ project_id: "", site_id: "none", submission_type: "", planned_date: "", approval_date: "", code: "", notes: "", compliance_response: "" });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error creating submission",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Regulatory Submission</DialogTitle>
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
            <Label htmlFor="code">Submission / Amendment Code</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., SUB-2026-001 or AMD-2026-002"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="approval_date">Approval Date</Label>
              <Input
                id="approval_date"
                type="date"
                value={formData.approval_date}
                onChange={(e) => setFormData({ ...formData, approval_date: e.target.value })}
              />
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Submission"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
