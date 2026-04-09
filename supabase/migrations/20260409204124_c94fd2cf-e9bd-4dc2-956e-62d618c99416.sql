
-- Study Visit Schedule
CREATE TABLE public.study_visit_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  visit_number INTEGER NOT NULL,
  planned_date DATE,
  window_start DATE,
  window_end DATE,
  actual_date DATE,
  status TEXT NOT NULL DEFAULT 'scheduled',
  observations TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_visit_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_study_visit_schedule" ON public.study_visit_schedule FOR ALL USING (auth.role() = 'authenticated');

-- Site & Vendor Qualifications
CREATE TABLE public.site_vendor_qualifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vendor_type TEXT NOT NULL DEFAULT 'site',
  qualification_status TEXT NOT NULL DEFAULT 'pending',
  feasibility_date DATE,
  score NUMERIC,
  next_qualification_date DATE,
  responsible TEXT,
  contract_status TEXT NOT NULL DEFAULT 'negotiating',
  documents_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_vendor_qualifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_site_vendor" ON public.site_vendor_qualifications FOR ALL USING (auth.role() = 'authenticated');

-- Trainings
CREATE TABLE public.trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  delegate_role TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_trainings" ON public.trainings FOR ALL USING (auth.role() = 'authenticated');

-- Training Records
CREATE TABLE public.training_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  certificate_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_training_records" ON public.training_records FOR ALL USING (auth.role() = 'authenticated');

-- Change Controls
CREATE TABLE public.change_controls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  change_code TEXT NOT NULL,
  description TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'operational',
  impact_assessment TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  responsible TEXT,
  opened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  resolved_at DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.change_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_change_controls" ON public.change_controls FOR ALL USING (auth.role() = 'authenticated');

-- Change Control Approvals
CREATE TABLE public.change_control_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  change_control_id UUID NOT NULL REFERENCES public.change_controls(id) ON DELETE CASCADE,
  approver_name TEXT NOT NULL,
  decision TEXT NOT NULL DEFAULT 'pending',
  decision_date DATE,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.change_control_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_cc_approvals" ON public.change_control_approvals FOR ALL USING (auth.role() = 'authenticated');

-- Risks
CREATE TABLE public.risks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'operational',
  probability INTEGER NOT NULL DEFAULT 3,
  impact INTEGER NOT NULL DEFAULT 3,
  risk_score INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
  mitigation_plan TEXT,
  responsible TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  identified_at DATE NOT NULL DEFAULT CURRENT_DATE,
  review_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_risks" ON public.risks FOR ALL USING (auth.role() = 'authenticated');

-- Committees
CREATE TABLE public.committees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  committee_type TEXT NOT NULL DEFAULT 'CEC',
  meeting_number INTEGER NOT NULL,
  meeting_date DATE NOT NULL,
  agenda TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  next_meeting_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_committees" ON public.committees FOR ALL USING (auth.role() = 'authenticated');

-- Committee Attendees
CREATE TABLE public.committee_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  present BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.committee_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_committee_attendees" ON public.committee_attendees FOR ALL USING (auth.role() = 'authenticated');

-- Committee Deliberations
CREATE TABLE public.committee_deliberations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.committee_deliberations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_committee_deliberations" ON public.committee_deliberations FOR ALL USING (auth.role() = 'authenticated');

-- Steering Decisions
CREATE TABLE public.steering_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  decision_code TEXT NOT NULL,
  meeting_origin TEXT,
  decision_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  impacted_area TEXT,
  responsible TEXT,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.steering_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_steering_decisions" ON public.steering_decisions FOR ALL USING (auth.role() = 'authenticated');

-- Updated_at triggers for all new tables
CREATE TRIGGER update_study_visit_schedule_updated_at BEFORE UPDATE ON public.study_visit_schedule FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_site_vendor_updated_at BEFORE UPDATE ON public.site_vendor_qualifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trainings_updated_at BEFORE UPDATE ON public.trainings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_training_records_updated_at BEFORE UPDATE ON public.training_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_change_controls_updated_at BEFORE UPDATE ON public.change_controls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_committees_updated_at BEFORE UPDATE ON public.committees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_steering_decisions_updated_at BEFORE UPDATE ON public.steering_decisions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
