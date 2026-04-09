-- Extend tasks table with planned/actual dates and progress
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS planned_start_date date,
ADD COLUMN IF NOT EXISTS planned_end_date date,
ADD COLUMN IF NOT EXISTS actual_start_date date,
ADD COLUMN IF NOT EXISTS actual_end_date date,
ADD COLUMN IF NOT EXISTS progress_percentage integer DEFAULT 0;

-- Create task_dependencies table
CREATE TABLE public.task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  dependency_type text DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
  lag_days integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id)
);

-- Create task_raci table
CREATE TABLE public.task_raci (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('responsible', 'accountable', 'consulted', 'informed')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, user_id, role)
);

-- Enable RLS
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_raci ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_dependencies
CREATE POLICY "Authenticated users can view task_dependencies"
ON public.task_dependencies FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage task_dependencies"
ON public.task_dependencies FOR ALL
USING (auth.role() = 'authenticated');

-- RLS policies for task_raci
CREATE POLICY "Authenticated users can view task_raci"
ON public.task_raci FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage task_raci"
ON public.task_raci FOR ALL
USING (auth.role() = 'authenticated');