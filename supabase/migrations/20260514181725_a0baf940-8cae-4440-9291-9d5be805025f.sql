ALTER TABLE public.clinical_evaluation_document_versions
ADD COLUMN IF NOT EXISTS revision_type text NOT NULL DEFAULT 'minor',
ADD COLUMN IF NOT EXISTS revision_reason text;