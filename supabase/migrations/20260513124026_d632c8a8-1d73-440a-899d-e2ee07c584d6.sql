-- Add monitoring_visit_id to study_visits if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'study_visits' AND column_name = 'monitoring_visit_id') THEN
        ALTER TABLE public.study_visits ADD COLUMN monitoring_visit_id UUID REFERENCES public.site_monitoring_visits(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create or replace a view for a unified agenda
CREATE OR REPLACE VIEW public.site_monitoring_agenda AS
SELECT 
    smv.id,
    smv.project_id,
    smv.site_id,
    smv.visit_code,
    smv.visit_type,
    smv.status,
    COALESCE(smv.actual_date, smv.planned_date) as scheduled_date,
    smv.monitor_name as monitor,
    p.title as project_title,
    ss.site_code,
    ss.name as site_name,
    'site_monitoring' as source
FROM public.site_monitoring_visits smv
LEFT JOIN public.projects p ON smv.project_id = p.id
LEFT JOIN public.study_sites ss ON smv.site_id = ss.id;

-- Grant access to the view
GRANT SELECT ON public.site_monitoring_agenda TO authenticated;
GRANT SELECT ON public.site_monitoring_agenda TO service_role;
