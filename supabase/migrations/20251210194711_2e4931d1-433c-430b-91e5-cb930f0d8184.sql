-- Add study_id column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN study_id uuid REFERENCES public.studies(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_tasks_study_id ON public.tasks(study_id);