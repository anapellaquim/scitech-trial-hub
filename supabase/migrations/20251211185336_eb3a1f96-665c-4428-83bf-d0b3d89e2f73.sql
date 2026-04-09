-- Create study_forms table for configurable forms per study
CREATE TABLE public.study_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  study_id UUID REFERENCES public.studies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT study_forms_study_or_project CHECK (study_id IS NOT NULL OR project_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.study_forms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view study_forms"
ON public.study_forms
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage study_forms"
ON public.study_forms
FOR ALL
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_study_forms_study_id ON public.study_forms(study_id);
CREATE INDEX idx_study_forms_project_id ON public.study_forms(project_id);