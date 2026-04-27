ALTER TABLE public.task_raci
  ADD COLUMN IF NOT EXISTS stakeholder_id UUID REFERENCES public.communication_stakeholders(id) ON DELETE CASCADE;

ALTER TABLE public.task_raci DROP CONSTRAINT IF EXISTS task_raci_user_or_department_check;

ALTER TABLE public.task_raci
  ADD CONSTRAINT task_raci_assignee_check CHECK (
    (user_id IS NOT NULL)::int + (department_id IS NOT NULL)::int + (stakeholder_id IS NOT NULL)::int = 1
  );

CREATE UNIQUE INDEX IF NOT EXISTS task_raci_task_stakeholder_role_unique
  ON public.task_raci (task_id, stakeholder_id, role)
  WHERE stakeholder_id IS NOT NULL;