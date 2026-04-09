-- Create visit_types table for configurable visit names per project
CREATE TABLE public.visit_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  visit_number integer NOT NULL,
  name text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, visit_number)
);

-- Enable RLS
ALTER TABLE public.visit_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can manage visit types"
  ON public.visit_types
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view visit types"
  ON public.visit_types
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_visit_types_updated_at
  BEFORE UPDATE ON public.visit_types
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.visit_types;