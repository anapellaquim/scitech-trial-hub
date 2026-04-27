
-- Map new tables to the 'qualification' audit module
CREATE OR REPLACE FUNCTION public.get_module_from_table(table_name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE table_name
    WHEN 'studies' THEN 'study'
    WHEN 'study_sites' THEN 'study'
    WHEN 'study_visits' THEN 'visit'
    WHEN 'visit_findings' THEN 'visit'
    WHEN 'visit_checklist_items' THEN 'visit'
    WHEN 'crf_entries' THEN 'edc'
    WHEN 'crf_field_values' THEN 'edc'
    WHEN 'crf_templates' THEN 'edc'
    WHEN 'tmf_documents' THEN 'etmf'
    WHEN 'tmf_document_versions' THEN 'etmf'
    WHEN 'regulatory_submissions' THEN 'regulatory'
    WHEN 'regulatory_reports' THEN 'regulatory'
    WHEN 'vendor_payments' THEN 'payment'
    WHEN 'payment_history' THEN 'payment'
    WHEN 'user_roles' THEN 'user'
    WHEN 'profiles' THEN 'user'
    WHEN 'projects' THEN 'project'
    WHEN 'tasks' THEN 'project'
    WHEN 'participants' THEN 'participant'
    WHEN 'site_vendor_qualifications' THEN 'qualification'
    WHEN 'qualification_scorecard_criteria' THEN 'qualification'
    WHEN 'qualification_scorecard_responses' THEN 'qualification'
    ELSE 'other'
  END
$function$;

-- Attach audit triggers
DROP TRIGGER IF EXISTS audit_qual_criteria ON public.qualification_scorecard_criteria;
CREATE TRIGGER audit_qual_criteria
  AFTER INSERT OR UPDATE OR DELETE ON public.qualification_scorecard_criteria
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_qual_responses ON public.qualification_scorecard_responses;
CREATE TRIGGER audit_qual_responses
  AFTER INSERT OR UPDATE OR DELETE ON public.qualification_scorecard_responses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
