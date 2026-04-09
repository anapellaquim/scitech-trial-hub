-- Make visit_id optional
ALTER TABLE public.visit_findings 
ALTER COLUMN visit_id DROP NOT NULL;

-- Add is_remote boolean field
ALTER TABLE public.visit_findings 
ADD COLUMN is_remote boolean NOT NULL DEFAULT false;

-- Add check constraint: either visit_id is set OR is_remote is true
ALTER TABLE public.visit_findings 
ADD CONSTRAINT check_visit_or_remote 
CHECK (visit_id IS NOT NULL OR is_remote = true);