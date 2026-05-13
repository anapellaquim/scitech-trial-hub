-- Adicionar colunas de data de término (caso não tenham sido adicionadas no passo anterior)
ALTER TABLE public.site_monitoring_visits 
ADD COLUMN IF NOT EXISTS planned_date_end DATE,
ADD COLUMN IF NOT EXISTS actual_date_end DATE;

-- Remover a view para evitar conflitos de estrutura de colunas ao recriar
DROP VIEW IF EXISTS public.site_monitoring_agenda;

-- Recriar a view com suporte a períodos
CREATE OR REPLACE VIEW public.site_monitoring_agenda AS
SELECT 
    smv.id,
    smv.project_id,
    smv.site_id,
    smv.visit_code,
    smv.visit_type,
    smv.status,
    COALESCE(smv.actual_date, smv.planned_date) as scheduled_date,
    COALESCE(smv.actual_date_end, smv.planned_date_end) as scheduled_date_end,
    smv.monitor_name as monitor,
    p.title as project_title,
    ss.site_code,
    ss.name as site_name,
    'site_monitoring' as source
FROM public.site_monitoring_visits smv
LEFT JOIN public.projects p ON smv.project_id = p.id
LEFT JOIN public.study_sites ss ON smv.site_id = ss.id;

-- Restaurar permissões
GRANT SELECT ON public.site_monitoring_agenda TO authenticated;
GRANT SELECT ON public.site_monitoring_agenda TO service_role;
