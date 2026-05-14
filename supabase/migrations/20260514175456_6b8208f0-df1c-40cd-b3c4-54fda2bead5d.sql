ALTER TABLE public.change_controls
ADD COLUMN IF NOT EXISTS training_trainees text,
ADD COLUMN IF NOT EXISTS training_date date,
ADD COLUMN IF NOT EXISTS training_trainer text,
ADD COLUMN IF NOT EXISTS training_evidence_link text;

ALTER TABLE public.clinical_evaluation_documents
DROP COLUMN IF EXISTS training_required,
DROP COLUMN IF EXISTS training_trainees,
DROP COLUMN IF EXISTS training_date,
DROP COLUMN IF EXISTS training_trainer,
DROP COLUMN IF EXISTS training_evidence_link;