-- Make study_id nullable in study_visits to allow using project_id instead
ALTER TABLE public.study_visits 
ALTER COLUMN study_id DROP NOT NULL;

-- Make site_id nullable as well since we'll use research centers for projects
ALTER TABLE public.study_visits 
ALTER COLUMN site_id DROP NOT NULL;

-- Add research_center_id column for project-based visits
ALTER TABLE public.study_visits 
ADD COLUMN research_center_id uuid REFERENCES public.research_centers(id);

CREATE INDEX idx_study_visits_research_center_id ON public.study_visits(research_center_id);