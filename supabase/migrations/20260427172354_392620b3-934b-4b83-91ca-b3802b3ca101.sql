
CREATE TABLE public.qualification_scorecard_criteria (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  description text,
  weight numeric NOT NULL DEFAULT 1,
  max_score numeric NOT NULL DEFAULT 10,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.qualification_scorecard_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_qual_criteria" ON public.qualification_scorecard_criteria
  FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX idx_qual_criteria_project ON public.qualification_scorecard_criteria(project_id);

CREATE TRIGGER update_qual_criteria_updated_at BEFORE UPDATE ON public.qualification_scorecard_criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.qualification_scorecard_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qualification_id uuid NOT NULL,
  criterion_id uuid NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  comment text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (qualification_id, criterion_id)
);

ALTER TABLE public.qualification_scorecard_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_qual_responses" ON public.qualification_scorecard_responses
  FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX idx_qual_responses_qual ON public.qualification_scorecard_responses(qualification_id);
CREATE INDEX idx_qual_responses_criterion ON public.qualification_scorecard_responses(criterion_id);

CREATE TRIGGER update_qual_responses_updated_at BEFORE UPDATE ON public.qualification_scorecard_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
