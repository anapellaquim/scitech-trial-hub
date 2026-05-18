-- Add is_paid flag to protocol_visit_schedules so visits can be marked as non-paid per site/global
ALTER TABLE public.protocol_visit_schedules
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT true;