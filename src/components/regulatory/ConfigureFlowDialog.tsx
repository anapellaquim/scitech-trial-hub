import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface Project {
  id: string;
  title: string;
}

interface FlowStep {
  id?: string;
  step_name: string;
  step_order: number;
  deadline_days: number | null;
}

interface ConfigureFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onSuccess: () => void;
}

export default function ConfigureFlowDialog({
  open,
  onOpenChange,
  projects,
  onSuccess,
}: ConfigureFlowDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [steps, setSteps] = useState<FlowStep[]>([]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchSteps();
    } else {
      setSteps([]);
    }
  }, [selectedProjectId]);

  const fetchSteps = async () => {
    try {
      const { data, error } = await supabase
        .from("regulatory_flow_steps")
        .select("*")
        .eq("project_id", selectedProjectId)
        .order("step_order");

      if (error) throw error;
      setSteps(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading steps",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addStep = () => {
    setSteps([
      ...steps,
      {
        step_name: "",
        step_order: steps.length + 1,
        deadline_days: null,
      },
    ]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps.map((step, i) => ({ ...step, step_order: i + 1 })));
  };

  const updateStep = (index: number, field: keyof FlowStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const handleSave = async () => {
    if (!selectedProjectId) {
      toast({
        title: "Error",
        description: "Select a study",
        variant: "destructive",
      });
      return;
    }

    const invalidSteps = steps.filter((s) => !s.step_name.trim());
    if (invalidSteps.length > 0) {
      toast({
        title: "Error",
        description: "All steps must have a name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await supabase
        .from("regulatory_flow_steps")
        .delete()
        .eq("project_id", selectedProjectId);

      if (steps.length > 0) {
        const { error } = await supabase.from("regulatory_flow_steps").insert(
          steps.map((step) => ({
            project_id: selectedProjectId,
            step_name: step.step_name,
            step_order: step.step_order,
            deadline_days: step.deadline_days,
          }))
        );

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Regulatory flow configured successfully",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error saving flow",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Regulatory Flow</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project">Study</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
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

          {selectedProjectId && (
            <>
              <div className="flex items-center justify-between">
                <Label>Flow Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              </div>

              <div className="space-y-3">
                {steps.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No steps configured. Click "Add Step" to begin.
                    </CardContent>
                  </Card>
                ) : (
                  steps.map((step, index) => (
                    <Card key={index}>
                      <CardContent className="py-3">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                            {step.step_order}
                          </div>
                          <div className="flex-1 space-y-3">
                            <Input
                              placeholder="Step name"
                              value={step.step_name}
                              onChange={(e) => updateStep(index, "step_name", e.target.value)}
                            />
                            <div className="flex items-center gap-2">
                              <Label className="text-sm text-muted-foreground whitespace-nowrap">
                                Deadline (days):
                              </Label>
                              <Input
                                type="number"
                                placeholder="e.g., 30"
                                className="w-24"
                                value={step.deadline_days || ""}
                                onChange={(e) =>
                                  updateStep(
                                    index,
                                    "deadline_days",
                                    e.target.value ? parseInt(e.target.value) : null
                                  )
                                }
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeStep(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !selectedProjectId}>
              {loading ? "Saving..." : "Save Flow"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
