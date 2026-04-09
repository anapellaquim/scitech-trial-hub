-- Add Asana project URL field to projects table
ALTER TABLE public.projects 
ADD COLUMN asana_project_url text;