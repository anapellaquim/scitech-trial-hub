-- Rename site_monitoring_findings -> site_monitoring_oversight
ALTER TABLE public.site_monitoring_findings RENAME TO site_monitoring_oversight;

-- Drop old policy and recreate with new name
DROP POLICY IF EXISTS auth_all_site_monitoring_findings ON public.site_monitoring_oversight;
CREATE POLICY auth_all_site_monitoring_oversight
  ON public.site_monitoring_oversight
  FOR ALL
  USING (auth.role() = 'authenticated'::text)
  WITH CHECK (auth.role() = 'authenticated'::text);

-- Soft category validation via trigger (no immutable CHECK constraint)
CREATE OR REPLACE FUNCTION public.validate_oversight_category()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.category IS NOT NULL AND NEW.category NOT IN ('pending','ecrf_query','protocol_deviation','ae_deviation','other') THEN
    -- Coerce unknown categories into 'other' instead of rejecting (backward compat)
    NEW.category := 'other';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_oversight_category ON public.site_monitoring_oversight;
CREATE TRIGGER trg_validate_oversight_category
  BEFORE INSERT OR UPDATE ON public.site_monitoring_oversight
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_oversight_category();

-- Update module mapping function to recognize the renamed table
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
    WHEN 'qualification_contracts' THEN 'qualification'
    WHEN 'qualification_contract_amendments' THEN 'qualification'
    WHEN 'qualification_contract_budget_items' THEN 'qualification'
    WHEN 'site_monitoring_visits' THEN 'monitoring'
    WHEN 'site_monitoring_oversight' THEN 'monitoring'
    WHEN 'monitor_notes' THEN 'monitoring'
    ELSE 'other'
  END
$function$;