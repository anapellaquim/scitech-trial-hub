-- Add target_enrollment to research_centers for recruitment status tracking
ALTER TABLE public.research_centers 
ADD COLUMN IF NOT EXISTS target_enrollment integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS recruitment_status text DEFAULT 'recruiting';

-- Add days_from_enrollment to visit_types for protocol calendar scheduling
ALTER TABLE public.visit_types
ADD COLUMN IF NOT EXISTS days_from_enrollment integer DEFAULT 0;

-- Add enrolled_at column if it doesn't exist (it already exists but making sure)
-- participants.enrolled_at already exists

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_participants_research_center ON public.participants(research_center);
CREATE INDEX IF NOT EXISTS idx_research_centers_project_id ON public.research_centers(project_id);