-- Add compliance response and site link to submissions
ALTER TABLE public.regulatory_submissions
  ADD COLUMN IF NOT EXISTS compliance_response text,
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.study_sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reg_subs_site ON public.regulatory_submissions(site_id);

-- Recurring report schedule templates per study
CREATE TABLE IF NOT EXISTS public.regulatory_report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  description text,
  start_event text NOT NULL DEFAULT 'study_start', -- study_start, study_end, custom_date
  custom_start_date date,
  first_due_offset_days integer NOT NULL DEFAULT 0,
  recurrence text NOT NULL DEFAULT 'annual', -- once, monthly, quarterly, semiannual, annual
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.regulatory_report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_reg_report_schedules"
  ON public.regulatory_report_schedules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER set_updated_at_reg_report_schedules
  BEFORE UPDATE ON public.regulatory_report_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_reg_report_schedules_project ON public.regulatory_report_schedules(project_id);