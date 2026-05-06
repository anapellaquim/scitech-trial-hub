import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  item_order: number;
}

export const useTaskSubtasks = () => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [byTask, setByTask] = useState<Record<string, Subtask[]>>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const fetchFor = useCallback(async (taskId: string) => {
    setLoading(prev => new Set(prev).add(taskId));
    const { data } = await supabase
      .from("task_subtasks")
      .select("id,task_id,title,completed,due_date,item_order")
      .eq("task_id", taskId)
      .order("item_order", { ascending: true })
      .order("created_at", { ascending: true });
    setByTask(prev => ({ ...prev, [taskId]: (data as Subtask[]) ?? [] }));
    setLoading(prev => {
      const n = new Set(prev);
      n.delete(taskId);
      return n;
    });
  }, []);

  const toggleExpanded = useCallback(
    (taskId: string) => {
      setExpanded(prev => {
        const next = new Set(prev);
        if (next.has(taskId)) {
          next.delete(taskId);
        } else {
          next.add(taskId);
          if (!byTask[taskId]) fetchFor(taskId);
        }
        return next;
      });
    },
    [byTask, fetchFor]
  );

  const toggleCompleted = useCallback(
    async (s: Subtask) => {
      await supabase
        .from("task_subtasks")
        .update({
          completed: !s.completed,
          completed_at: !s.completed ? new Date().toISOString() : null,
        })
        .eq("id", s.id);
      fetchFor(s.task_id);
    },
    [fetchFor]
  );

  return { expanded, byTask, loading, toggleExpanded, toggleCompleted, refresh: fetchFor };
};
