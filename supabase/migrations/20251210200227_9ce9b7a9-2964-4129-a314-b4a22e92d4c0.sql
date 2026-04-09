-- Add project_id column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);