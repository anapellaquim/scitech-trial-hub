ALTER TABLE public.clinical_evaluation_documents
  ADD COLUMN IF NOT EXISTS training_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS training_trainees text,
  ADD COLUMN IF NOT EXISTS training_date date,
  ADD COLUMN IF NOT EXISTS training_trainer text,
  ADD COLUMN IF NOT EXISTS training_evidence_link text;