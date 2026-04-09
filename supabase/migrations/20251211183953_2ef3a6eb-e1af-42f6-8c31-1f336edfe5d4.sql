-- Add new columns to visit_findings table
ALTER TABLE public.visit_findings 
ADD COLUMN participant_code text,
ADD COLUMN finding_type text DEFAULT 'NA',
ADD COLUMN form_name text,
ADD COLUMN responsible_name text;

-- Add check constraint for finding_type
ALTER TABLE public.visit_findings 
ADD CONSTRAINT check_finding_type CHECK (finding_type IN ('Desvio', 'eCRF', 'Prontuário', 'Violação', 'Binder', 'CEP', 'NA'));