-- Add project_id column to study_visits
ALTER TABLE public.study_visits 
ADD COLUMN project_id uuid REFERENCES public.projects(id);

-- Create index for performance
CREATE INDEX idx_study_visits_project_id ON public.study_visits(project_id);