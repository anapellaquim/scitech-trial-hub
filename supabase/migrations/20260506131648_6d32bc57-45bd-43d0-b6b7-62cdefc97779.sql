
CREATE TABLE public.task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  assignee_type text NOT NULL CHECK (assignee_type IN ('user','stakeholder','site')),
  assignee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, assignee_type, assignee_id)
);
CREATE INDEX idx_task_assignees_task ON public.task_assignees(task_id);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view task_assignees" ON public.task_assignees FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage task_assignees" ON public.task_assignees FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE TABLE public.task_subtask_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtask_id uuid NOT NULL REFERENCES public.task_subtasks(id) ON DELETE CASCADE,
  assignee_type text NOT NULL CHECK (assignee_type IN ('user','stakeholder','site')),
  assignee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subtask_id, assignee_type, assignee_id)
);
CREATE INDEX idx_task_subtask_assignees_subtask ON public.task_subtask_assignees(subtask_id);

ALTER TABLE public.task_subtask_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view task_subtask_assignees" ON public.task_subtask_assignees FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage task_subtask_assignees" ON public.task_subtask_assignees FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
