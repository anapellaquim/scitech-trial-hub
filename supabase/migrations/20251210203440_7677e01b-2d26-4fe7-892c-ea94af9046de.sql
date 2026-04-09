-- Create table for yearly budget planning
CREATE TABLE public.project_yearly_budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  year integer NOT NULL,
  planned_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, year)
);

-- Enable RLS
ALTER TABLE public.project_yearly_budgets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view project_yearly_budgets"
ON public.project_yearly_budgets
FOR SELECT
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can manage project_yearly_budgets"
ON public.project_yearly_budgets
FOR ALL
USING (auth.role() = 'authenticated'::text);

-- Create trigger for updated_at
CREATE TRIGGER update_project_yearly_budgets_updated_at
BEFORE UPDATE ON public.project_yearly_budgets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();