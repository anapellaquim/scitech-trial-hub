CREATE TABLE public.ip_supply (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation TEXT NOT NULL CHECK (operation IN ('Acquisition','Shipping')),
  date DATE,
  invoice TEXT,
  description TEXT,
  lot_number TEXT,
  expiration_date DATE,
  quantity NUMERIC,
  site TEXT,
  value NUMERIC,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ip_supply ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view ip_supply" ON public.ip_supply FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert ip_supply" ON public.ip_supply FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update ip_supply" ON public.ip_supply FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete ip_supply" ON public.ip_supply FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_ip_supply_updated_at BEFORE UPDATE ON public.ip_supply FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER audit_ip_supply AFTER INSERT OR UPDATE OR DELETE ON public.ip_supply FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();