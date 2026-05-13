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
      const initialStatus: Record<string, boolean> = {};
      visits.forEach((visit) => {
        initialStatus[visit.id] = visit.payment_status === "paid";
      });
      setPaymentStatus(initialStatus);
    }
  }, [open, visits]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates = participantVisits.map((visit) => {
          const isPaid = paymentStatus[visit.id];
          const newStatus = isPaid ? "Paid" : "Pending";
          
          return supabase
            .from("patient_visits")
            .update({
              payment_status: newStatus,
            })
            .eq("id", visit.id);
        });

      const results = await Promise.all(updates);
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
              const isCompleted = visit?.status === "completed";
              const notPerformed = visit?.status === "not_performed";

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
                    <Badge variant="outline" className="text-muted-foreground">
                      {notPerformed ? "Não realizada" : "Não agendada"}
                    </Badge>
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
                    <Badge variant="outline" className="text-muted-foreground">
                      Pendente
                    </Badge>
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
