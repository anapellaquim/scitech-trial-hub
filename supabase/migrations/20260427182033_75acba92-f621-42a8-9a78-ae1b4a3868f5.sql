
-- Committee types (configurable)
CREATE TABLE public.committee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.committee_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_all_committee_types ON public.committee_types FOR ALL USING (auth.role() = 'authenticated');
CREATE TRIGGER update_committee_types_updated_at BEFORE UPDATE ON public.committee_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.committee_types (code, name, description) VALUES
  ('CEC', 'Clinical Events Committee', 'Adjudicates clinical endpoints'),
  ('DMC', 'Data Monitoring Committee', 'Monitors safety and efficacy data'),
  ('SC',  'Steering Committee', 'Provides strategic oversight'),
  ('IRB', 'Institutional Review Board', 'Ethics review board')
ON CONFLICT (code) DO NOTHING;

-- Committee letters
CREATE TABLE public.committee_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  committee_id uuid,
  committee_type text,
  letter_code text NOT NULL,
  title text NOT NULL,
  letter_date date,
  status text NOT NULL DEFAULT 'draft',
  link text,
  recipient text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.committee_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_all_committee_letters ON public.committee_letters FOR ALL USING (auth.role() = 'authenticated');
CREATE TRIGGER update_committee_letters_updated_at BEFORE UPDATE ON public.committee_letters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_committee_letters_project ON public.committee_letters(project_id);
CREATE INDEX idx_committee_letters_committee ON public.committee_letters(committee_id);
