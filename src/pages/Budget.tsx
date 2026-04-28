import { useState } from "react";
import CTMSNav from "@/components/CTMSNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import GlobalStudySelector from "@/components/shared/GlobalStudySelector";
import DetailedBudgetManager from "@/components/DetailedBudgetManager";
import YearlyBudgetManager from "@/components/YearlyBudgetManager";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";

const Budget = () => {
  const { projectId, setProjectId } = usePersistedFilters();

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      <div className="md:pl-[var(--ctms-sidebar-w,240px)]">
        <main className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Budget</h1>
                <p className="text-sm text-muted-foreground">
                  Manage yearly and detailed budgets per study
                </p>
              </div>
            </div>
            <GlobalStudySelector
              value={projectId}
              onChange={(v) => setFilter("projectId", v)}
            />
          </div>

          {!projectId ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select a study to view its budget.
              </CardContent>
            </Card>
          ) : (
            <>
              <YearlyBudgetManager projectId={projectId} />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Detailed Budget
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailedBudgetManager projectId={projectId} />
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Budget;
