ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS planned_date date,
  ADD COLUMN IF NOT EXISTS training_type text NOT NULL DEFAULT 'protocol',
  ADD COLUMN IF NOT EXISTS duration_hours numeric,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS instructor text;

ALTER TABLE public.training_records
  ADD COLUMN IF NOT EXISTS assigned_at date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS team_role text;