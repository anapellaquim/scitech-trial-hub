import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Project {
  id: string;
  title: string;
}

interface Site {
  id: string;
  site_code: string;
  name: string;
}

interface NewVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onSuccess: () => void;
}

export default function NewVisitDialog({ open, onOpenChange, projects, onSuccess }: NewVisitDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [formData, setFormData] = useState({
    project_id: "",
    research_center_id: "",
    visit_type: "" as "SQV" | "SIV" | "IMV" | "COV" | "",
    visit_number: "",
    scheduled_date: "",
    scheduled_time: "",
    notes: "",
  });

  useEffect(() => {
    if (formData.project_id) {
      fetchSites(formData.project_id);
    } else {
      setSites([]);
      setFormData(prev => ({ ...prev, research_center_id: "" }));
    }
  }, [formData.project_id]);

  const fetchSites = async (projectId: string) => {
    // Fetch research centers associated with the project
    const { data } = await supabase
      .from("research_centers")
      .select("id, code, name")
      .eq("project_id", projectId)
      .order("code");
    
    // Map to site format
    setSites(data?.map(rc => ({ 
      id: rc.id, 
      site_code: rc.code, 
      name: rc.name || rc.code 
    })) || []);
  };

  const applyChecklistTemplate = async (visitId: string, visitType: "SQV" | "SIV" | "IMV" | "COV") => {
    try {
      // Fetch template for this visit type
      const { data: template } = await supabase
        .from("checklist_templates")
        .select("items")
        .eq("visit_type", visitType)
        .eq("is_global", true)
        .maybeSingle();

      if (template && Array.isArray(template.items)) {
        const items = (template.items as { text: string; required?: boolean }[]).map((item, index) => ({
          visit_id: visitId,
          item_text: item.text,
          item_order: index,
          is_required: item.required || false,
        }));

        if (items.length > 0) {
          await supabase.from("visit_checklist_items").insert(items);
        }
      }
    } catch (error) {
      console.error("Error applying checklist template:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.visit_type) {
      toast.error("Selecione o tipo de visita");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const visitTypeValue = formData.visit_type as "SQV" | "SIV" | "IMV" | "COV";
      
      const { data: visit, error } = await supabase
        .from("study_visits")
        .insert({
          project_id: formData.project_id,
          research_center_id: formData.research_center_id,
          visit_type: visitTypeValue,
          visit_number: formData.visit_number ? parseInt(formData.visit_number) : null,
          scheduled_date: formData.scheduled_date,
          scheduled_time: formData.scheduled_time || null,
          notes: formData.notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Apply checklist template
      await applyChecklistTemplate(visit.id, visitTypeValue);

      // Get site and project info for task title
      const selectedSite = sites.find(s => s.id === formData.research_center_id);
      const selectedProject = projects.find(p => p.id === formData.project_id);
      
      // Create associated task
      const visitTypeNames: Record<string, string> = {
        SQV: "Site Qualification Visit",
        SIV: "Site Initiation Visit",
        IMV: "Interim Monitoring Visit",
        COV: "Close-Out Visit",
      };
      
      const taskTitle = `${visitTypeValue}${formData.visit_number ? ` #${formData.visit_number}` : ""} - ${selectedSite?.site_code || "Site"} (${selectedProject?.title || "Projeto"})`;
      
      await supabase.from("tasks").insert({
        title: taskTitle,
        description: `Preparação para ${visitTypeNames[visitTypeValue]} no site ${selectedSite?.name || ""}\n\n${formData.notes || ""}`.trim(),
        end_date: formData.scheduled_date,
        status: "pending",
        priority: "medium",
        created_by: user?.id,
        project_id: formData.project_id,
      });

      toast.success("Visita agendada e tarefa criada com sucesso!");
      setFormData({
        project_id: "",
        research_center_id: "",
        visit_type: "",
        visit_number: "",
        scheduled_date: "",
        scheduled_time: "",
        notes: "",
      });
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao agendar visita: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agendar Nova Visita</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Projeto *</Label>
            <Select
              value={formData.project_id}
              onValueChange={(v) => setFormData({ ...formData, project_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o projeto" />
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
            <Label>Centro de Pesquisa *</Label>
            <Select
              value={formData.research_center_id}
              onValueChange={(v) => setFormData({ ...formData, research_center_id: v })}
              disabled={!formData.project_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.project_id ? "Selecione o centro" : "Selecione um projeto primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.site_code} - {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Visita *</Label>
              <Select
                value={formData.visit_type}
                onValueChange={(v) => setFormData({ ...formData, visit_type: v as "SQV" | "SIV" | "IMV" | "COV" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SQV">SQV - Site Qualification Visit</SelectItem>
                  <SelectItem value="SIV">SIV - Site Initiation Visit</SelectItem>
                  <SelectItem value="IMV">IMV - Interim Monitoring Visit</SelectItem>
                  <SelectItem value="COV">COV - Close-Out Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Número da Visita</Label>
              <Input
                type="number"
                value={formData.visit_number}
                onChange={(e) => setFormData({ ...formData, visit_number: e.target.value })}
                placeholder="Ex: 1, 2, 3..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Horário</Label>
              <Input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações sobre a visita..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.project_id || !formData.research_center_id || !formData.visit_type}>
              {loading ? "Agendando..." : "Agendar Visita"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
