
ALTER TYPE public.module_key ADD VALUE IF NOT EXISTS 'ip';

CREATE TABLE public.investigational_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  lot_number text,
  expiration_date date,
  quantity numeric,
  site text,
  invoice text,
  correction_invoice text,
  delivery_date date,
  usage text,
  usage_date date,
  return_info text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ip_project ON public.investigational_products(project_id);
CREATE INDEX idx_ip_code ON public.investigational_products(code);

ALTER TABLE public.investigational_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_all_investigational_products ON public.investigational_products
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE TRIGGER set_updated_at_investigational_products
  BEFORE UPDATE ON public.investigational_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
