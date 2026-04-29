ALTER TABLE public.regulatory_reports
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.study_sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_date date,
  ADD COLUMN IF NOT EXISTS code text;

CREATE INDEX IF NOT EXISTS idx_reg_reports_site ON public.regulatory_reports(site_id);

ALTER TABLE public.regulatory_submissions
  ADD COLUMN IF NOT EXISTS approval_date date,
  ADD COLUMN IF NOT EXISTS code text;