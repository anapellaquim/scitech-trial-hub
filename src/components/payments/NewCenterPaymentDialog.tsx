import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { todayDateOnly } from "@/lib/dateUtils";

interface Project {
  id: string;
  title: string;
  protocol_number?: string | null;
}

interface ResearchCenter {
  id: string;
  code: string;
  name: string | null;
  project_id: string;
}

interface NewCenterPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
  defaultCenterCode?: string;
  onCreated?: () => void;
}

const STATUS_OPTIONS = [
  { value: "programado", label: "Programado" },
  { value: "pago", label: "Pago" },
  { value: "cancelado", label: "Cancelado" },
];

export function NewCenterPaymentDialog({
  open,
  onOpenChange,
  defaultProjectId,
  defaultCenterCode,
  onCreated,
}: NewCenterPaymentDialogProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [centers, setCenters] = useState<ResearchCenter[]>([]);
  const [loading, setLoading] = useState(false);

  const [projectId, setProjectId] = useState<string>(defaultProjectId || "");
  const [centerCode, setCenterCode] = useState<string>(defaultCenterCode || "");
  const [amount, setAmount] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [protheusCode, setProtheusCode] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("programado");
  const [paymentDate, setPaymentDate] = useState(todayDateOnly());
  const [costCenter, setCostCenter] = useState("");
  const [valueClass, setValueClass] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, title, protocol_number")
        .order("title");
      setProjects(data || []);
    })();
  }, [open]);

  useEffect(() => {
    if (!projectId) {
      setCenters([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("research_centers")
        .select("id, code, name, project_id")
        .eq("project_id", projectId)
        .order("code");
      setCenters(data || []);
    })();
  }, [projectId]);

  useEffect(() => {
    if (open) {
      setProjectId(defaultProjectId || "");
      setCenterCode(defaultCenterCode || "");
      setAmount("");
      setInvoiceNumber("");
      setProtheusCode("");
      setDescription("");
      setStatus("programado");
      setPaymentDate(todayDateOnly());
      setCostCenter("");
      setValueClass("");
    }
  }, [open, defaultProjectId, defaultCenterCode]);

  const handleSubmit = async () => {
    if (!projectId || !centerCode || !amount || !paymentDate) {
      toast.error("Preencha estudo, centro, valor e data");
      return;
    }
    setLoading(true);
    const center = centers.find((c) => c.code === centerCode);
    const vendorName = center?.name
      ? `Centro ${center.code} - ${center.name}`
      : `Centro ${centerCode}`;

    const { error } = await supabase.from("vendor_payments").insert({
      project_id: projectId,
      vendor_name: vendorName,
      category: "center",
      description: description.trim() || null,
      amount: parseFloat(amount),
      payment_date: paymentDate,
      invoice_number: invoiceNumber.trim() || null,
      protheus_code: protheusCode.trim() || null,
      status,
      paid_at: status === "pago" ? paymentDate : null,
      cost_center: costCenter.trim() || null,
      value_class: valueClass.trim() || null,
    } as any);

    setLoading(false);
    if (error) {
      console.error(error);
      toast.error("Erro ao registrar pagamento");
      return;
    }
    toast.success("Pagamento registrado!");
    onCreated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pagamento</DialogTitle>
          <DialogDescription>
            Registre manualmente um pagamento para um centro de pesquisa
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Estudo Vinculado</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um estudo" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.protocol_number || p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Centro</Label>
              <Select value={centerCode} onValueChange={setCenterCode} disabled={!projectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um centro" />
                </SelectTrigger>
                <SelectContent>
                  {centers.map((c) => (
                    <SelectItem key={c.id} value={c.code}>
                      {c.code}{c.name ? ` - ${c.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="grid gap-2">
              <Label>Data Programada</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Número da Nota Fiscal</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="NF-0000"
              />
            </div>
            <div className="grid gap-2">
              <Label>Código Protheus</Label>
              <Input
                value={protheusCode}
                onChange={(e) => setProtheusCode(e.target.value)}
                placeholder="Ex: PRO-12345"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais sobre o pagamento..."
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Centro de Custo</Label>
              <Input
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                placeholder="Ex: CC-001"
              />
            </div>
            <div className="grid gap-2">
              <Label>Classe de Valor</Label>
              <Input
                value={valueClass}
                onChange={(e) => setValueClass(e.target.value)}
                placeholder="Ex: Overhead"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Registrando..." : "Registrar Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
