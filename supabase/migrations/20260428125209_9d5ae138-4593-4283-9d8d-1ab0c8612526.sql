
-- Add clinical_evaluation to module_key enum
ALTER TYPE public.module_key ADD VALUE IF NOT EXISTS 'clinical_evaluation';

-- Clinical Evaluation documents table (versioned documents with review periodicity)
CREATE TABLE public.clinical_evaluation_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'clinical_evaluation_report', -- clinical_evaluation_report | systematic_literature_review | other
  title text NOT NULL,
  code text,
  version text NOT NULL DEFAULT '1.0',
  status text NOT NULL DEFAULT 'draft', -- draft | under_review | approved | superseded | archived
  author text,
  approver text,
  issue_date date,
  approval_date date,
  review_periodicity_months integer NOT NULL DEFAULT 12,
  last_review_date date,
  next_review_date date,
  link text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clinical_eval_docs_project ON public.clinical_evaluation_documents(project_id);
CREATE INDEX idx_clinical_eval_docs_next_review ON public.clinical_evaluation_documents(next_review_date);

ALTER TABLE public.clinical_evaluation_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_all_clinical_evaluation_documents ON public.clinical_evaluation_documents
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE TRIGGER set_updated_at_clinical_eval_docs
  BEFORE UPDATE ON public.clinical_evaluation_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Version history for each document
CREATE TABLE public.clinical_evaluation_document_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.clinical_evaluation_documents(id) ON DELETE CASCADE,
  version text NOT NULL,
  change_summary text,
  link text,
  author text,
  issued_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clinical_eval_doc_versions_doc ON public.clinical_evaluation_document_versions(document_id);

ALTER TABLE public.clinical_evaluation_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_all_clinical_evaluation_document_versions ON public.clinical_evaluation_document_versions
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
