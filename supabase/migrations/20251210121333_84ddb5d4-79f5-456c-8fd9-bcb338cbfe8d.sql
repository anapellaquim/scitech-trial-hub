
-- Create research_centers table
CREATE TABLE public.research_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT,
  pi_name TEXT,
  pi_email TEXT,
  pi_phone TEXT,
  coordinator_name TEXT,
  coordinator_email TEXT,
  coordinator_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint for center code within a project
ALTER TABLE public.research_centers ADD CONSTRAINT unique_center_code_per_project UNIQUE (project_id, code);

-- Enable RLS
ALTER TABLE public.research_centers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view research centers"
ON public.research_centers
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage research centers"
ON public.research_centers
FOR ALL
USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_research_centers_updated_at
BEFORE UPDATE ON public.research_centers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
