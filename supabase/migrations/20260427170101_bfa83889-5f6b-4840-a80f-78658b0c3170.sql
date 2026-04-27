CREATE TABLE public.project_budget_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  year INTEGER,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_value NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC GENERATED ALWAYS AS (quantity * unit_value) STORED,
  vendor TEXT,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_budget_items_project ON public.project_budget_items(project_id);
CREATE INDEX idx_project_budget_items_year ON public.project_budget_items(project_id, year);

ALTER TABLE public.project_budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view budget items"
ON public.project_budget_items FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage budget items"
ON public.project_budget_items FOR ALL
USING (auth.role() = 'authenticated');

CREATE TRIGGER update_project_budget_items_updated_at
BEFORE UPDATE ON public.project_budget_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();