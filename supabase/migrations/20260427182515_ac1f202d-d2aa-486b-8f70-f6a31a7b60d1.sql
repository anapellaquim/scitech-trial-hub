
CREATE TABLE public.site_monitoring_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  site_id uuid REFERENCES public.study_sites(id) ON DELETE CASCADE,
  visit_code text,
  visit_type text NOT NULL DEFAULT 'IMV',
  status text NOT NULL DEFAULT 'planned',
  planned_date date,
  actual_date date,
  monitor_name text,
  purpose text,
  summary text,
  follow_up_actions text,
  report_link text,
  report_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.site_monitoring_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_all_site_monitoring_visits ON public.site_monitoring_visits FOR ALL USING (auth.role() = 'authenticated');
CREATE TRIGGER update_site_monitoring_visits_updated_at BEFORE UPDATE ON public.site_monitoring_visits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_smv_project ON public.site_monitoring_visits(project_id);
CREATE INDEX idx_smv_site ON public.site_monitoring_visits(site_id);
CREATE INDEX idx_smv_status ON public.site_monitoring_visits(status);

CREATE TABLE public.site_monitoring_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoring_visit_id uuid NOT NULL REFERENCES public.site_monitoring_visits(id) ON DELETE CASCADE,
  category text,
  severity text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  action_required text,
  due_date date,
  status text NOT NULL DEFAULT 'open',
  resolved_date date,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.site_monitoring_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_all_site_monitoring_findings ON public.site_monitoring_findings FOR ALL USING (auth.role() = 'authenticated');
CREATE TRIGGER update_site_monitoring_findings_updated_at BEFORE UPDATE ON public.site_monitoring_findings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_smf_visit ON public.site_monitoring_findings(monitoring_visit_id);
