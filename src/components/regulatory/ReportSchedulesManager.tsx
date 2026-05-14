import { parseLocalDate, formatDateOnly, todayDateOnly } from "@/lib/dateUtils";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CalendarClock, Plus, Pencil, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { addMonths, addDays, format } from "date-fns";

interface Schedule {
  id: string;
  project_id: string;
  report_type: string;
  description: string | null;
  start_event: string;
  custom_start_date: string | null;
  first_due_offset_days: number;
  recurrence: string;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
}

interface Project { id: string; title: string; start_date?: string | null; end_date?: string | null; }

const startEventOptions = [
  { value: "study_start", label: "Início do estudo" },
  { value: "study_end", label: "Fim do estudo" },
  { value: "custom_date", label: "Data específica" },
];

const recurrenceOptions = [
  { value: "once", label: "Única" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
];

const emptyForm = {
  report_type: "", description: "", start_event: "study_start", custom_start_date: "",
  first_due_offset_days: "0", recurrence: "annual", end_date: "", is_active: true, notes: "",
};

interface Props { projects: Project[]; }

export default function ReportSchedulesManager({ projects }: Props) {
  const [projectId, setProjectId] = useState<string>("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    if (!projectId) { setSchedules([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("regulatory_report_schedules" as any)
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setSchedules((data as any) || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (s: Schedule) => {
    setEditing(s);
    setForm({
      report_type: s.report_type, description: s.description || "",
      start_event: s.start_event, custom_start_date: s.custom_start_date || "",
      first_due_offset_days: String(s.first_due_offset_days), recurrence: s.recurrence,
      end_date: s.end_date || "", is_active: s.is_active, notes: s.notes || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!projectId) { toast.error("Selecione um estudo"); return; }
    if (!form.report_type.trim()) { toast.error("Tipo de relatório é obrigatório"); return; }
    const payload: any = {
      project_id: projectId,
      report_type: form.report_type.trim(),
      description: form.description.trim() || null,
      start_event: form.start_event,
      custom_start_date: form.start_event === "custom_date" ? (form.custom_start_date || null) : null,
      first_due_offset_days: parseInt(form.first_due_offset_days) || 0,
      recurrence: form.recurrence,
      end_date: form.end_date || null,
      is_active: form.is_active,
      notes: form.notes.trim() || null,
    };
    const op = editing
      ? supabase.from("regulatory_report_schedules" as any).update(payload).eq("id", editing.id)
      : supabase.from("regulatory_report_schedules" as any).insert(payload);
    const { error } = await op;
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este template?")) return;
    await supabase.from("regulatory_report_schedules" as any).delete().eq("id", id);
    toast.success("Excluído"); load();
  };

  const project = projects.find(p => p.id === projectId);

  const computeStartDate = (s: Schedule): Date | null => {
    if (s.start_event === "custom_date" && s.custom_start_date) return parseLocalDate(s.custom_start_date);
    if (s.start_event === "study_start" && project?.start_date) return parseLocalDate(project.start_date);
    if (s.start_event === "study_end" && project?.end_date) return parseLocalDate(project.end_date);
    return null;
  };

  const generate = async (s: Schedule) => {
    const start = computeStartDate(s);
    if (!start) { toast.error("Estudo sem data de referência. Configure start/end date."); return; }
    const firstDue = addDays(start, s.first_due_offset_days);
    const horizon = s.end_date ? parseLocalDate(s.end_date) : (project?.end_date ? parseLocalDate(project.end_date) : addMonths(new Date(), 24));
    const stepMonths: Record<string, number> = { once: 0, monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };
    const step = stepMonths[s.recurrence] ?? 12;

    const occurrences: { due_date: string }[] = [];
    let cursor = firstDue;
    if (s.recurrence === "once") {
      occurrences.push({ due_date: format(cursor, "yyyy-MM-dd") });
    } else {
      while (cursor <= horizon && occurrences.length < 60) {
        occurrences.push({ due_date: format(cursor, "yyyy-MM-dd") });
        cursor = addMonths(cursor, step);
      }
    }
    if (!occurrences.length) { toast.error("Nenhuma ocorrência no horizonte"); return; }

    // Skip ones already created with same project + type + due_date
    const dueDates = occurrences.map(o => o.due_date);
    const { data: existing } = await supabase
      .from("regulatory_reports")
      .select("due_date")
      .eq("project_id", projectId)
      .eq("report_type", s.report_type)
      .in("due_date", dueDates);
    const existingSet = new Set((existing || []).map((r: any) => r.due_date));
    const toInsert = occurrences
      .filter(o => !existingSet.has(o.due_date))
      .map(o => ({
        project_id: projectId,
        report_type: s.report_type,
        due_date: o.due_date,
        status: "pending" as const,
        notes: s.description || null,
      }));
    if (!toInsert.length) { toast.info("Nenhuma nova ocorrência (todas já existem)"); return; }
    const { error } = await supabase.from("regulatory_reports").insert(toInsert);
    if (error) { toast.error(error.message); return; }
    toast.success(`${toInsert.length} relatório(s) gerado(s)`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Cronograma de Relatórios Previstos
          </CardTitle>
          <div className="flex gap-2">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-[260px]"><SelectValue placeholder="Selecione um estudo" /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={openNew} disabled={!projectId}>
              <Plus className="h-4 w-4 mr-1" /> Novo Template
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!projectId ? (
          <p className="text-muted-foreground text-center py-8">Selecione um estudo para gerenciar o cronograma.</p>
        ) : loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : schedules.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum template cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>1º vencimento (dias após)</TableHead>
                <TableHead>Recorrência</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.report_type}</TableCell>
                  <TableCell>{startEventOptions.find(o => o.value === s.start_event)?.label || s.start_event}{s.start_event === "custom_date" && s.custom_start_date ? ` (${s.custom_start_date})` : ""}</TableCell>
                  <TableCell>{s.first_due_offset_days}</TableCell>
                  <TableCell>{recurrenceOptions.find(o => o.value === s.recurrence)?.label || s.recurrence}</TableCell>
                  <TableCell>{s.end_date || "—"}</TableCell>
                  <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Sim" : "Não"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="outline" onClick={() => generate(s)} title="Gerar relatórios">
                        <Wand2 className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Template</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>Tipo de Relatório *</Label><Input value={form.report_type} onChange={e => setForm({ ...form, report_type: e.target.value })} placeholder="Relatório de Segurança Anual, ..." /></div>
            <div><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Evento de Início</Label>
                <Select value={form.start_event} onValueChange={v => setForm({ ...form, start_event: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {startEventOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.start_event === "custom_date" && (
                <div><Label>Data específica</Label><Input type="date" value={form.custom_start_date} onChange={e => setForm({ ...form, custom_start_date: e.target.value })} /></div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>1º vencimento (dias após início)</Label><Input type="number" value={form.first_due_offset_days} onChange={e => setForm({ ...form, first_due_offset_days: e.target.value })} /></div>
              <div>
                <Label>Recorrência</Label>
                <Select value={form.recurrence} onValueChange={v => setForm({ ...form, recurrence: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {recurrenceOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Data limite (encerra geração)</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Ativo</Label>
            </div>
            <div><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Atualizar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
