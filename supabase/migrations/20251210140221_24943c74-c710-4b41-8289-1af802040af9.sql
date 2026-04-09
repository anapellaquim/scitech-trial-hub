-- Add project_id column to regulatory tables
ALTER TABLE public.regulatory_flow_steps 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.regulatory_submissions 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.regulatory_reports 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Make study_id nullable since we're transitioning to project_id
ALTER TABLE public.regulatory_flow_steps ALTER COLUMN study_id DROP NOT NULL;
ALTER TABLE public.regulatory_submissions ALTER COLUMN study_id DROP NOT NULL;
ALTER TABLE public.regulatory_reports ALTER COLUMN study_id DROP NOT NULL;