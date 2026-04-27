CREATE TABLE public.pmcf_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  survey_code text NOT NULL,
  title text NOT NULL,
  description text,
  form_link text,
  target_audience text,
  expected_monthly_fills integer NOT NULL DEFAULT 0,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  responsible text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pmcf_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_pmcf_surveys" ON public.pmcf_surveys
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TRIGGER update_pmcf_surveys_updated_at
  BEFORE UPDATE ON public.pmcf_surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pmcf_surveys_project ON public.pmcf_surveys(project_id);

CREATE TABLE public.pmcf_monthly_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.pmcf_surveys(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  reference_month date NOT NULL,
  fills_count integer NOT NULL DEFAULT 0,
  expected_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'compliant',
  checked_at date NOT NULL DEFAULT CURRENT_DATE,
  checked_by text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(survey_id, reference_month)
);

ALTER TABLE public.pmcf_monthly_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_pmcf_monthly_checks" ON public.pmcf_monthly_checks
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TRIGGER update_pmcf_monthly_checks_updated_at
  BEFORE UPDATE ON public.pmcf_monthly_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pmcf_checks_survey ON public.pmcf_monthly_checks(survey_id);
CREATE INDEX idx_pmcf_checks_project ON public.pmcf_monthly_checks(project_id);