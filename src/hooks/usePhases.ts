import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  display_order: number;
  color: string | null;
}

export function usePhases(projectId?: string | null) {
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setPhases([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("project_phases")
      .select("id, project_id, name, display_order, color")
      .eq("project_id", projectId)
      .order("display_order", { ascending: true });
    setPhases((data as ProjectPhase[]) || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { phases, loading, refresh };
}
