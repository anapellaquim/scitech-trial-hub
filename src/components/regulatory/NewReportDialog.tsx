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

interface NewReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const recurrenceOptions = [
  { value: "none", label: "No recurrence" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semiannual", label: "Semiannual" },
  { value: "annual", label: "Annual" },
];

export default function NewReportDialog({
  open,
  onOpenChange,
  projects,
  onSuccess,
}: NewReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [formData, setFormData] = useState({
    project_id: "",
    site_id: "none",
    report_type: "",
    due_date: "",
    approval_date: "",
    code: "",
    notes: "",
    recurrence_type: "none",
    recurrence_end_date: "",
  });

  useEffect(() => {
    if (!formData.project_id) { setSites([]); return; }
    supabase.from("research_centers").select("id, code, name").eq("project_id", formData.project_id).then(({ data }) => setSites(data || []));
  }, [formData.project_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || !formData.report_type || !formData.due_date) {
      toast({
        title: "Error",
        description: "Study, report type and due date are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("regulatory_reports").insert({
        project_id: formData.project_id,
        site_id: formData.site_id && formData.site_id !== "none" ? formData.site_id : null,
        report_type: formData.report_type,
        due_date: formData.due_date,
        approval_date: formData.approval_date || null,
        code: formData.code || null,
        notes: formData.notes || null,
        status: "pending",
        recurrence_type: formData.recurrence_type,
        recurrence_end_date: formData.recurrence_end_date || null,
      } as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: formData.recurrence_type !== "none"
          ? "Report created with scheduled recurrence"
          : "Report created successfully",
      });
      onOpenChange(false);
      setFormData({
        project_id: "",
        site_id: "none",
        report_type: "",
        due_date: "",
        approval_date: "",
        code: "",
        notes: "",
        recurrence_type: "none",
        recurrence_end_date: "",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error creating report",
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
          <DialogTitle>New Regulatory Report</DialogTitle>
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
