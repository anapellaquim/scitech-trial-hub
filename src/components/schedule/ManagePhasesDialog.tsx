import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProjectPhase } from "@/hooks/usePhases";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onChanged?: () => void;
}

const DEFAULT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

interface RowState extends Partial<ProjectPhase> {
  _local?: boolean;
  _dirty?: boolean;
}

export const ManagePhasesDialog = ({ open, onOpenChange, projectId, onChanged }: Props) => {
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    load();
  }, [open, projectId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_phases")
      .select("*")
      .eq("project_id", projectId)
      .order("display_order");
    if (error) toast.error(error.message);
    setRows((data as ProjectPhase[] || []).map(p => ({ ...p })));
    setLoading(false);
  };

  const addRow = () => {
    setRows([...rows, {
      _local: true,
      _dirty: true,
      project_id: projectId,
      name: "",
      display_order: rows.length,
      color: DEFAULT_COLORS[rows.length % DEFAULT_COLORS.length],
    }]);
  };

  const update = (i: number, patch: Partial<RowState>) => {
    const next = [...rows];
    next[i] = { ...next[i], ...patch, _dirty: true };
    setRows(next);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    next.forEach((r, idx) => { r.display_order = idx; r._dirty = true; });
    setRows(next);
  };

  const remove = async (i: number) => {
    const row = rows[i];
    if (row.id) {
      // check usage
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("phase_id", row.id);
      if ((count ?? 0) > 0) {
        if (!confirm(`Existem ${count} tarefa(s) usando esta fase. Remover a fase manterá as tarefas mas elas ficarão "Sem fase". Continuar?`)) return;
      }
      const { error } = await supabase.from("project_phases").delete().eq("id", row.id);
      if (error) { toast.error(error.message); return; }
    }
    const next = rows.filter((_, idx) => idx !== i);
    next.forEach((r, idx) => { r.display_order = idx; r._dirty = true; });
    setRows(next);
    onChanged?.();
  };

  const save = async () => {
    for (const r of rows) {
      if (!r.name?.trim()) {
        toast.error("Todas as fases precisam de nome");
        return;
      }
    }
    setSaving(true);
    try {
      const toInsert = rows.filter(r => r._local).map(r => ({
        project_id: projectId,
        name: r.name!,
        display_order: r.display_order ?? 0,
        color: r.color ?? null,
      }));
      const toUpdate = rows.filter(r => !r._local && r._dirty && r.id);

      if (toInsert.length) {
        const { error } = await supabase.from("project_phases").insert(toInsert);
        if (error) throw error;
      }
      for (const r of toUpdate) {
        const { error } = await supabase.from("project_phases").update({
          name: r.name!,
          display_order: r.display_order ?? 0,
          color: r.color ?? null,
        }).eq("id", r.id!);
        if (error) throw error;
      }
      toast.success("Fases salvas");
      onChanged?.();
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Fases do Projeto</DialogTitle>
          <DialogDescription>
            Defina as fases para organizar as tarefas deste projeto.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma fase cadastrada.
              </p>
            )}
            {rows.map((row, i) => (
              <div key={row.id ?? `new-${i}`} className="flex items-center gap-2 border rounded-md p-2">
                <div className="flex flex-col">
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(i, 1)} disabled={i === rows.length - 1}>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  type="color"
                  value={row.color ?? "#3b82f6"}
                  onChange={(e) => update(i, { color: e.target.value })}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  value={row.name ?? ""}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="Nome da fase"
                  className="flex-1"
                />
                <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-full mt-2">
              <Plus className="h-4 w-4 mr-2" /> Adicionar Fase
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Fechar</Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManagePhasesDialog;
