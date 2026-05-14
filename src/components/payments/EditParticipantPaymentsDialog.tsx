import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VisitType {
  id: string;
  visit_number: number;
  name: string;
  value: number;
}

interface Visit {
  id: string;
  participant_id: string;
  visit_number: number;
  status: string;
  payment_status: string;
  payment_amount: number | null;
}

interface EditParticipantPaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: string;
  participantCode: string;
  visits: Visit[];
  visitTypes: VisitType[];
  onSave: () => void;
}

export function EditParticipantPaymentsDialog({
  open,
  onOpenChange,
  participantId,
  participantCode,
  visits,
  visitTypes,
  onSave,
}: EditParticipantPaymentsDialogProps) {
  const [paymentStatus, setPaymentStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const participantVisitsLocal = visits.filter((v) => v.participant_id === participantId);
      const initialStatus: Record<string, boolean> = {};
      visitTypes.forEach((vt) => {
        const visit = participantVisitsLocal.find((v) => v.visit_number === vt.visit_number);
        initialStatus[vt.id] = visit?.payment_status?.toLowerCase() === "paid";
      });
      setPaymentStatus(initialStatus);
    }
  }, [open, visits, visitTypes, participantId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const ops: Promise<{ error: unknown } | { error: null }>[] = [];
      const updatedVisitIds = new Set<string>();

      visitTypes.forEach((vt) => {
        const visit = participantVisits.find((v) => v.visit_number === vt.visit_number);
        const isPaid = !!paymentStatus[vt.id];
        const isUnscheduled =
          vt.visit_number === 99 ||
          vt.name.toLowerCase().includes("random") ||
          vt.name.toLowerCase().includes("unscheduled");

        if (visit) {
          if (updatedVisitIds.has(visit.id)) return;
          updatedVisitIds.add(visit.id);
          ops.push(
            supabase
              .from("patient_visits")
              .update({ payment_status: isPaid ? "Paid" : "Pending" })
              .eq("id", visit.id) as unknown as Promise<{ error: null }>
          );
        } else if (isUnscheduled && isPaid) {
          ops.push(
            supabase
              .from("patient_visits")
              .insert({
                patient_id: participantId,
                protocol_visit_id: vt.id,
                status: "Completed",
                payment_status: "Paid",
              }) as unknown as Promise<{ error: null }>
          );
        }
      });

      const results = await Promise.all(ops);
      const hasError = results.some((r) => r.error);

      if (hasError) {
        toast.error("Erro ao atualizar pagamentos");
      } else {
        toast.success("Pagamentos atualizados com sucesso");
        onSave();
        onOpenChange(false);
      }
    } catch (error) {
      toast.error("Erro ao atualizar pagamentos");
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  const participantVisits = visits.filter((v) => v.participant_id === participantId);
  console.log("EditParticipantPaymentsDialog - Participant visits:", participantVisits);
  console.log("EditParticipantPaymentsDialog - Payment status:", paymentStatus);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Pagamentos - {participantCode}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {visitTypes.map((vt) => {
              const visit = participantVisits.find((v) => v.visit_number === vt.visit_number);
              const isCompleted = visit?.status?.toLowerCase() === "completed";
              const isLostVisit = visit?.status?.toLowerCase() === "lost visit";
              const isUnscheduled = vt.visit_number === 99 || vt.name.toLowerCase().includes("random") || vt.name.toLowerCase().includes("unscheduled");
              const notPerformed = visit?.status?.toLowerCase() === "not_performed";

              if (!visit || notPerformed) {
                return (
                  <div
                    key={vt.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{vt.name}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(vt.value)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isUnscheduled && (
                        <Checkbox
                          id={`vt-${vt.id}`}
                          checked={paymentStatus[`type-${vt.id}`] || false}
                          onCheckedChange={(checked) =>
                            setPaymentStatus((prev) => ({
                              ...prev,
                              [`type-${vt.id}`]: checked === true,
                            }))
                          }
                        />
                      )}
                      <Badge variant="outline" className="text-muted-foreground">
                        {notPerformed ? "Não realizada" : "Não agendada"}
                      </Badge>
                    </div>
                  </div>
                );
              }

              if (!isCompleted) {
                return (
                  <div
                    key={vt.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{vt.name}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(vt.value)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isUnscheduled && (
                        <Checkbox
                          id={`vt-${vt.id}`}
                          checked={paymentStatus[`type-${vt.id}`] || false}
                          onCheckedChange={(checked) =>
                            setPaymentStatus((prev) => ({
                              ...prev,
                              [`type-${vt.id}`]: checked === true,
                            }))
                          }
                        />
                      )}
                      <Badge variant="outline" className={isLostVisit ? "bg-slate-200 text-slate-700" : "text-muted-foreground"}>
                        {isLostVisit ? "Lost Visit" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={vt.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{vt.name}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(vt.value)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`visit-${visit.id}`}
                      checked={paymentStatus[visit.id] || false}
                      onCheckedChange={(checked) =>
                        setPaymentStatus((prev) => ({
                          ...prev,
                          [visit.id]: checked === true,
                        }))
                      }
                    />
                    <Label htmlFor={`visit-${visit.id}`} className="text-sm cursor-pointer">
                      {paymentStatus[visit.id] ? (
                        <Badge className="bg-success">Pago</Badge>
                      ) : (
                        <Badge variant="destructive">A pagar</Badge>
                      )}
                    </Label>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={loading}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alterações</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja salvar as alterações nos pagamentos do participante {participantCode}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
