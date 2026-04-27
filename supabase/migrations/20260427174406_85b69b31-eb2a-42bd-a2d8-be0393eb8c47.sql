-- Add budget fields to qualification_contracts
ALTER TABLE public.qualification_contracts
  ADD COLUMN IF NOT EXISTS total_value numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS payment_terms text;

-- Detailed budget line items per contract
CREATE TABLE IF NOT EXISTS public.qualification_contract_budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  qualification_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_value numeric NOT NULL DEFAULT 0,
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qualification_contract_budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_qual_contract_budget_items"
  ON public.qualification_contract_budget_items
  FOR ALL
  USING (auth.role() = 'authenticated'::text);

CREATE TRIGGER set_updated_at_qual_contract_budget_items
  BEFORE UPDATE ON public.qualification_contract_budget_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger
CREATE TRIGGER audit_qual_contract_budget_items
  AFTER INSERT OR UPDATE OR DELETE ON public.qualification_contract_budget_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Update module mapping
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
    ELSE 'other'
  END
$function$;