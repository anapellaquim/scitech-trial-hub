
-- Mitigation actions per risk (preventive/corrective)
CREATE TABLE IF NOT EXISTS public.risk_mitigation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id uuid NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  action_type text NOT NULL DEFAULT 'preventive', -- 'preventive' | 'corrective'
  action_description text NOT NULL,
  responsible text,
  deadline date,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'in_progress' | 'done' | 'cancelled'
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rma_risk ON public.risk_mitigation_actions(risk_id);
CREATE INDEX IF NOT EXISTS idx_rma_project ON public.risk_mitigation_actions(project_id);

ALTER TABLE public.risk_mitigation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rma_select" ON public.risk_mitigation_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rma_insert" ON public.risk_mitigation_actions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "rma_update" ON public.risk_mitigation_actions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "rma_delete" ON public.risk_mitigation_actions FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_rma_updated_at BEFORE UPDATE ON public.risk_mitigation_actions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Risk review history (audit of Next Review Date changes / reviews performed)
CREATE TABLE IF NOT EXISTS public.risk_review_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id uuid NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  reviewed_at date NOT NULL DEFAULT CURRENT_DATE,
  previous_next_review_date date,
  new_next_review_date date,
  reviewer text,
  outcome text, -- 'no_change' | 'updated' | 'closed' | 'escalated'
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rrh_risk ON public.risk_review_history(risk_id);
CREATE INDEX IF NOT EXISTS idx_rrh_project ON public.risk_review_history(project_id);

ALTER TABLE public.risk_review_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rrh_select" ON public.risk_review_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "rrh_insert" ON public.risk_review_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "rrh_update" ON public.risk_review_history FOR UPDATE TO authenticated USING (true);
CREATE POLICY "rrh_delete" ON public.risk_review_history FOR DELETE TO authenticated USING (true);
