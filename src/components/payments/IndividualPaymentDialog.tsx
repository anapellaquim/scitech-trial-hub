import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAYMENT_CATEGORIES = [
  { value: "overhead", label: "Overhead" },
  { value: "startup", label: "Start-up" },
  { value: "regulatory", label: "Regulatório" },
  { value: "ethics", label: "Ética" },
  { value: "equipment", label: "Equipamentos" },
  { value: "supplies", label: "Suprimentos" },
  { value: "training", label: "Treinamento" },
  { value: "travel", label: "Viagem/Deslocamento" },
  { value: "other", label: "Outros" },
];

interface IndividualPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centerCode: string;
  onConfirm: (category: string, amount: number, description: string, paymentDate: string) => Promise<void>;
}

export function IndividualPaymentDialog({
  open,
  onOpenChange,
  centerCode,
  onConfirm,
}: IndividualPaymentDialogProps) {
  const [category, setCategory] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!category || !amount || !paymentDate) return;
    
    setLoading(true);
    try {
      await onConfirm(category, parseFloat(amount), description, paymentDate);
      resetForm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCategory("");
    setAmount("");
    setDescription("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const selectedCategoryLabel = PAYMENT_CATEGORIES.find(c => c.value === category)?.label || "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pagamento Avulso - Centro {centerCode}</DialogTitle>
          <DialogDescription>
            Registre um pagamento avulso para o centro de pesquisa
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais sobre o pagamento..."
              className="resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !category || !amount || !paymentDate}
          >
            {loading ? "Registrando..." : "Registrar Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
