import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface YearlyBudget {
  id?: string;
  year: number;
  planned_amount: number;
}

interface YearlyBudgetManagerProps {
  projectId: string;
}

const YearlyBudgetManager = ({ projectId }: YearlyBudgetManagerProps) => {
  const [budgets, setBudgets] = useState<YearlyBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBudgets();
  }, [projectId]);

  const loadBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from("project_yearly_budgets")
        .select("*")
        .eq("project_id", projectId)
        .order("year", { ascending: true });

      if (error) throw error;

      setBudgets(
        data?.map((b) => ({
          id: b.id,
          year: b.year,
          planned_amount: Number(b.planned_amount),
        })) || []
      );
    } catch (error) {
      console.error("Error loading yearly budgets:", error);
    } finally {
      setLoading(false);
    }
  };

  const addYear = () => {
    const currentYear = new Date().getFullYear();
    const existingYears = budgets.map((b) => b.year);
    let newYear = currentYear;
    
    while (existingYears.includes(newYear)) {
      newYear++;
    }

    setBudgets([...budgets, { year: newYear, planned_amount: 0 }]);
  };

  const updateBudget = (index: number, field: "year" | "planned_amount", value: number) => {
    const updated = [...budgets];
    updated[index] = { ...updated[index], [field]: value };
    setBudgets(updated);
  };

  const removeBudget = async (index: number) => {
    const budget = budgets[index];
    
    if (budget.id) {
      try {
        const { error } = await supabase
          .from("project_yearly_budgets")
          .delete()
          .eq("id", budget.id);

        if (error) throw error;
        toast.success("Orçamento removido");
      } catch (error) {
        console.error("Error removing budget:", error);
        toast.error("Erro ao remover orçamento");
        return;
      }
    }

    setBudgets(budgets.filter((_, i) => i !== index));
  };

  const saveBudgets = async () => {
    setSaving(true);
    try {
      for (const budget of budgets) {
        if (budget.id) {
          // Update existing
          const { error } = await supabase
            .from("project_yearly_budgets")
            .update({
              year: budget.year,
              planned_amount: budget.planned_amount,
            })
            .eq("id", budget.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from("project_yearly_budgets")
            .insert({
              project_id: projectId,
              year: budget.year,
              planned_amount: budget.planned_amount,
            });

          if (error) throw error;
        }
      }

      toast.success("Orçamentos salvos com sucesso!");
      loadBudgets(); // Reload to get IDs
    } catch (error: any) {
      console.error("Error saving budgets:", error);
      toast.error(error.message || "Erro ao salvar orçamentos");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalPlanned = budgets.reduce((sum, b) => sum + b.planned_amount, 0);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando orçamentos...</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Orçamento Previsto por Ano</CardTitle>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addYear}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Ano
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum orçamento cadastrado. Clique em "Adicionar Ano" para começar.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {budgets.map((budget, index) => (
                <div key={index} className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label htmlFor={`year-${index}`}>Ano</Label>
                    <Input
                      id={`year-${index}`}
                      type="number"
                      value={budget.year}
                      onChange={(e) => updateBudget(index, "year", parseInt(e.target.value) || 0)}
                      min="2000"
                      max="2100"
                    />
                  </div>
                  <div className="flex-[2]">
                    <Label htmlFor={`amount-${index}`}>Valor Previsto (R$)</Label>
                    <Input
                      id={`amount-${index}`}
                      type="number"
                      value={budget.planned_amount}
                      onChange={(e) => updateBudget(index, "planned_amount", parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBudget(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t flex items-center justify-between">
              <div className="text-sm font-medium">
                Total Previsto: <span className="text-primary">{formatCurrency(totalPlanned)}</span>
              </div>
              <Button type="button" onClick={saveBudgets} disabled={saving} size="sm">
                {saving ? "Salvando..." : "Salvar Orçamentos"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default YearlyBudgetManager;
