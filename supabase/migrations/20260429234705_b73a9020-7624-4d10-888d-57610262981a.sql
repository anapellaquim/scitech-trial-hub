
-- Adapt risks table to PCL019 SOP
ALTER TABLE public.risks
  ADD COLUMN IF NOT EXISTS potential_impact text,
  ADD COLUMN IF NOT EXISTS contingency_plan text,
  ADD COLUMN IF NOT EXISTS residual_probability integer CHECK (residual_probability BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS residual_impact integer CHECK (residual_impact BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS escalation_owner text,
  ADD COLUMN IF NOT EXISTS review_frequency text NOT NULL DEFAULT 'quarterly',
  ADD COLUMN IF NOT EXISTS next_review_date date,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_reason text,
  ADD COLUMN IF NOT EXISTS materialized_at timestamptz,
  ADD COLUMN IF NOT EXISTS monitoring_method text;

-- residual score generated
ALTER TABLE public.risks DROP COLUMN IF EXISTS residual_risk_score;
ALTER TABLE public.risks ADD COLUMN residual_risk_score integer
  GENERATED ALWAYS AS (COALESCE(residual_probability,0) * COALESCE(residual_impact,0)) STORED;

-- Risk Indicators (KPI/KRI) per PCL019 6.8.2
CREATE TABLE IF NOT EXISTS public.risk_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  indicator_type text NOT NULL CHECK (indicator_type IN ('KPI','KRI')),
  area text NOT NULL,
  name text NOT NULL,
  description text,
  target_value text,
  current_value text,
  unit text,
  status text NOT NULL DEFAULT 'on_track' CHECK (status IN ('on_track','at_risk','breached')),
  measurement_frequency text NOT NULL DEFAULT 'monthly',
  last_measured_at date,
  responsible text,
  linked_risk_id uuid REFERENCES public.risks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_indicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_risk_indicators" ON public.risk_indicators;
CREATE POLICY "auth_all_risk_indicators" ON public.risk_indicators
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS update_risk_indicators_updated_at ON public.risk_indicators;
CREATE TRIGGER update_risk_indicators_updated_at
  BEFORE UPDATE ON public.risk_indicators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_risk_indicators_project ON public.risk_indicators(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_next_review ON public.risks(next_review_date);
