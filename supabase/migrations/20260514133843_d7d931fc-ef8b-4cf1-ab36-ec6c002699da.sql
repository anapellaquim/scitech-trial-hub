ALTER TABLE public.regulatory_submissions
  ADD COLUMN IF NOT EXISTS requirement_date date,
  ADD COLUMN IF NOT EXISTS requirement_due_date date,
  ADD COLUMN IF NOT EXISTS requirement_submitted_date date;
ALTER TABLE public.regulatory_reports
  ADD COLUMN IF NOT EXISTS requirement_date date,
  ADD COLUMN IF NOT EXISTS requirement_due_date date,
  ADD COLUMN IF NOT EXISTS requirement_submitted_date date;