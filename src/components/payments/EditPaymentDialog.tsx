import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PaymentHistory {
  id: string;
  participant_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  participant?: {
    participant_code: string;
    name: string;
  };
}

interface EditPaymentDialogProps {
  payment: PaymentHistory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditPaymentDialog({ payment, open, onOpenChange, onSuccess }: EditPaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (payment) {
      setAmount(payment.amount.toString());
      setPaymentDate(payment.payment_date);
      setNotes(payment.notes || "");
    }
  }, [payment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return;

    setLoading(true);

    const { error } = await supabase
      .from("payment_history")
      .update({
        amount: parseFloat(amount),
        payment_date: paymentDate,
        notes: notes || null,
      })
      .eq("id", payment.id);

    setLoading(false);

    if (error) {
      toast.error("Erro ao atualizar pagamento");
      return;
    }

    toast.success("Pagamento atualizado com sucesso!");
    onSuccess();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!payment) return;

    if (!confirm("Tem certeza que deseja excluir este pagamento?")) return;

    setLoading(true);

    const { error } = await supabase
      .from("payment_history")
      .delete()
      .eq("id", payment.id);

    setLoading(false);

    if (error) {
      toast.error("Erro ao excluir pagamento");
      return;
    }

    toast.success("Pagamento excluído com sucesso!");
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Pagamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {payment?.participant && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Participante</p>
              <p className="font-medium">{payment.participant.participant_code} - {payment.participant.name}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Data do Pagamento</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o pagamento..."
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
              Excluir
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
