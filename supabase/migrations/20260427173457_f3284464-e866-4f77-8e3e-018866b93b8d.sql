
CREATE TABLE public.qualification_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qualification_id uuid NOT NULL,
  contract_number text NOT NULL,
  title text NOT NULL,
  contract_type text,
  status text NOT NULL DEFAULT 'negotiating',
  start_date date,
  end_date date,
  signed_date date,
  value numeric,
  currency text DEFAULT 'BRL',
  description text,
  document_url text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.qualification_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_qual_contracts" ON public.qualification_contracts
  FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX idx_qual_contracts_qual ON public.qualification_contracts(qualification_id);

CREATE TRIGGER update_qual_contracts_updated_at BEFORE UPDATE ON public.qualification_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link amendments to a specific contract
ALTER TABLE public.qualification_contract_amendments
  ADD COLUMN contract_id uuid;

CREATE INDEX idx_qual_amendments_contract ON public.qualification_contract_amendments(contract_id);

-- Audit trail
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
    ELSE 'other'
  END
$function$;

CREATE TRIGGER audit_qual_contracts
  AFTER INSERT OR UPDATE OR DELETE ON public.qualification_contracts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
