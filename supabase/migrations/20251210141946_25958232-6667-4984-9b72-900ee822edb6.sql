-- Add recurrence columns to regulatory_reports table
ALTER TABLE public.regulatory_reports
ADD COLUMN recurrence_type text DEFAULT 'none',
ADD COLUMN recurrence_end_date date;

-- Add comment for documentation
COMMENT ON COLUMN public.regulatory_reports.recurrence_type IS 'Recurrence pattern: none, weekly, monthly, quarterly, semiannual, annual';
COMMENT ON COLUMN public.regulatory_reports.recurrence_end_date IS 'Optional end date for recurring reports';