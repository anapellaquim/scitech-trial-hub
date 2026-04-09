import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Visit {
  id: string;
  visit_type: string;
  scheduled_date: string;
  status: string;
  completed_at: string | null;
}

interface ResearchCenter {
  id: string;
  code: string;
  name: string | null;
  pi_name: string | null;
  coordinator_name: string | null;
  notes?: string | null;
}

interface EditCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  center: ResearchCenter | null;
  onSuccess: () => void;
}

const EditCenterDialog = ({ open, onOpenChange, center, onSuccess }: EditCenterDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [notes, setNotes] = useState("");
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    if (open && center) {
      setNotes(center.notes || "");
      loadVisits();
    }
  }, [open, center]);

  const loadVisits = async () => {
    if (!center) return;
    
    setLoadingVisits(true);
    try {
      const { data, error } = await supabase
        .from("study_visits")
        .select("id, visit_type, scheduled_date, status, completed_at")
        .eq("research_center_id", center.id)
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      setVisits(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar visitas: " + error.message);
    } finally {
      setLoadingVisits(false);
    }
  };

  const handleSave = async () => {
    if (!center) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("research_centers")
        .update({ notes: notes.trim() || null })
        .eq("id", center.id);

      if (error) throw error;
      
      toast.success("Centro atualizado com sucesso");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const completedVisits = visits.filter(v => v.status === "completed");
  const scheduledVisits = visits.filter(v => 
    v.status === "scheduled" && isAfter(parseISO(v.scheduled_date), today)
  );
  const overdueVisits = visits.filter(v => 
    v.status === "scheduled" && isBefore(parseISO(v.scheduled_date), today)
  );

  const getVisitTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      SQV: "bg-blue-100 text-blue-800",
      SIV: "bg-green-100 text-green-800",
      IMV: "bg-purple-100 text-purple-800",
      COV: "bg-orange-100 text-orange-800"
    };
    return <Badge className={colors[type] || "bg-gray-100 text-gray-800"}>{type}</Badge>;
  };

  if (!center) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {center.code} - {center.name || "Centro sem nome"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Center Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Investigador Principal:</span>
              <p className="font-medium">{center.pi_name || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Coordenador:</span>
              <p className="font-medium">{center.coordinator_name || "-"}</p>
            </div>
          </div>

          <Separator />

          {/* Visit Statistics */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Monitorias
            </h3>
            
            {loadingVisits ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Realizadas</p>
                      <p className="text-lg font-bold text-green-600">{completedVisits.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Agendadas</p>
                      <p className="text-lg font-bold text-blue-600">{scheduledVisits.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Atrasadas</p>
                      <p className="text-lg font-bold text-red-600">{overdueVisits.length}</p>
                    </div>
                  </div>
                </div>

                {/* Upcoming visits */}
                {scheduledVisits.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Próximas visitas:</p>
                    <div className="space-y-2">
                      {scheduledVisits.slice(0, 3).map((visit) => (
                        <div key={visit.id} className="flex items-center justify-between p-2 rounded border">
                          {getVisitTypeBadge(visit.visit_type)}
                          <span className="text-sm">
                            {format(parseISO(visit.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      ))}
                      {scheduledVisits.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{scheduledVisits.length - 3} outras visitas agendadas
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Recent completed visits */}
                {completedVisits.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Últimas visitas realizadas:</p>
                    <div className="space-y-2">
                      {completedVisits.slice(0, 3).map((visit) => (
                        <div key={visit.id} className="flex items-center justify-between p-2 rounded border">
                          {getVisitTypeBadge(visit.visit_type)}
                          <span className="text-sm text-green-600">
                            {visit.completed_at 
                              ? format(parseISO(visit.completed_at), "dd/MM/yyyy", { locale: ptBR })
                              : format(parseISO(visit.scheduled_date), "dd/MM/yyyy", { locale: ptBR })
                            }
                          </span>
                        </div>
                      ))}
                      {completedVisits.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{completedVisits.length - 3} outras visitas realizadas
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {visits.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma monitoria registrada para este centro
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o centro, contatos, pendências gerais..."
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/2000
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCenterDialog;
