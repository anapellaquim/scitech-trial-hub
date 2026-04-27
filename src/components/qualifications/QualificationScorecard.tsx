import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ListChecks } from "lucide-react";
import { toast } from "sonner";

interface Criterion {
  id: string;
  project_id: string;
  name: string;
  category: string | null;
  description: string | null;
  weight: number;
  max_score: number;
  display_order: number;
}

interface Response {
  id?: string;
  criterion_id: string;
  score: number;
  comment: string | null;
}

interface Props {
  projectId: string;
  qualificationId: string;
  onTotalChange?: (total: number) => void;
}

export default function QualificationScorecard({ projectId, qualificationId, onTotalChange }: Props) {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [loading, setLoading] = useState(true);
  const [criterionDialogOpen, setCriterionDialogOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const [form, setForm] = useState({ name: "", category: "", description: "", weight: "1", max_score: "10" });

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: crits }, { data: resps }] = await Promise.all([
      supabase.from("qualification_scorecard_criteria" as any).select("*").eq("project_id", projectId).order("display_order").order("name"),
      supabase.from("qualification_scorecard_responses" as any).select("*").eq("qualification_id", qualificationId),
    ]);
    setCriteria((crits as any) || []);
    const map: Record<string, Response> = {};
    ((resps as any) || []).forEach((r: Response) => { map[r.criterion_id] = r; });
    setResponses(map);
    setLoading(false);
  }, [projectId, qualificationId]);

  useEffect(() => { load(); }, [load]);

  const totals = (() => {
    let weighted = 0;
    let maxWeighted = 0;
    criteria.forEach(c => {
      const r = responses[c.id];
      const score = r?.score ?? 0;
      weighted += score * c.weight;
      maxWeighted += c.max_score * c.weight;
    });
    const pct = maxWeighted > 0 ? (weighted / maxWeighted) * 100 : 0;
    return { weighted, maxWeighted, pct };
  })();

  useEffect(() => { onTotalChange?.(totals.pct); }, [totals.pct]);

  const openNew = () => {
    setEditingCriterion(null);
    setForm({ name: "", category: "", description: "", weight: "1", max_score: "10" });
    setCriterionDialogOpen(true);
  };

  const openEdit = (c: Criterion) => {
    setEditingCriterion(c);
    setForm({ name: c.name, category: c.category || "", description: c.description || "", weight: String(c.weight), max_score: String(c.max_score) });
    setCriterionDialogOpen(true);
  };

  const saveCriterion = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const payload = {
      project_id: projectId,
      name: form.name.trim(),
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      weight: parseFloat(form.weight) || 1,
      max_score: parseFloat(form.max_score) || 10,
    };
    if (editingCriterion) {
      const { error } = await supabase.from("qualification_scorecard_criteria" as any).update(payload).eq("id", editingCriterion.id);
      if (error) { toast.error("Error updating criterion"); return; }
    } else {
      const { error } = await supabase.from("qualification_scorecard_criteria" as any).insert(payload);
      if (error) { toast.error("Error creating criterion"); return; }
    }
    toast.success("Criterion saved");
    setCriterionDialogOpen(false);
    load();
  };

  const deleteCriterion = async (id: string) => {
    if (!confirm("Delete this criterion? Existing scores will be removed.")) return;
    await supabase.from("qualification_scorecard_responses" as any).delete().eq("criterion_id", id);
    await supabase.from("qualification_scorecard_criteria" as any).delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  const updateResponse = async (criterion: Criterion, score: number, comment: string | null) => {
    const safeScore = Math.max(0, Math.min(criterion.max_score, score || 0));
    const existing = responses[criterion.id];
    const payload = {
      qualification_id: qualificationId,
      criterion_id: criterion.id,
      score: safeScore,
      comment,
    };
    setResponses(prev => ({ ...prev, [criterion.id]: { ...payload, id: existing?.id } }));
    if (existing?.id) {
      await supabase.from("qualification_scorecard_responses" as any).update(payload).eq("id", existing.id);
    } else {
      const { data } = await supabase.from("qualification_scorecard_responses" as any).insert(payload).select().single();
      if (data) {
        setResponses(prev => ({ ...prev, [criterion.id]: data as any }));
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4" />
            Qualification Scorecard
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              Score: {totals.weighted.toFixed(1)} / {totals.maxWeighted.toFixed(1)} ({totals.pct.toFixed(1)}%)
            </Badge>
            <Button size="sm" variant="outline" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />Add Criterion
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : criteria.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            No criteria defined for this study yet. Add criteria to start scoring.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Criterion</TableHead>
                <TableHead className="w-[120px]">Category</TableHead>
                <TableHead className="w-[80px]">Weight</TableHead>
                <TableHead className="w-[80px]">Max</TableHead>
                <TableHead className="w-[100px]">Score</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {criteria.map(c => {
                const r = responses[c.id];
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                    </TableCell>
                    <TableCell>{c.category || "-"}</TableCell>
                    <TableCell>{c.weight}</TableCell>
                    <TableCell>{c.max_score}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={c.max_score}
                        step="0.1"
                        value={r?.score ?? ""}
                        onChange={e => updateResponse(c, parseFloat(e.target.value), r?.comment ?? null)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={r?.comment ?? ""}
                        onChange={e => updateResponse(c, r?.score ?? 0, e.target.value)}
                        placeholder="Optional"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteCriterion(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={criterionDialogOpen} onOpenChange={setCriterionDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCriterion ? "Edit" : "New"} Criterion</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Infrastructure, Experience" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Weight</Label><Input type="number" step="0.1" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
              <div><Label>Max Score</Label><Input type="number" step="0.1" value={form.max_score} onChange={e => setForm({ ...form, max_score: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriterionDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCriterion}>{editingCriterion ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
