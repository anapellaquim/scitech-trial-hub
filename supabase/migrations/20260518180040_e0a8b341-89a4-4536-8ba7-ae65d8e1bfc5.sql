
CREATE TABLE public.protheus_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number TEXT NOT NULL,
  description TEXT,
  product TEXT,
  contract_date DATE,
  supplier TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_value NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  delivered_quantity NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.protheus_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view protheus_contracts"
ON public.protheus_contracts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert protheus_contracts"
ON public.protheus_contracts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update protheus_contracts"
ON public.protheus_contracts FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete protheus_contracts"
ON public.protheus_contracts FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.protheus_contracts_compute()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.total_value := COALESCE(NEW.quantity,0) * COALESCE(NEW.unit_value,0);
  IF COALESCE(NEW.delivered_quantity,0) >= COALESCE(NEW.quantity,0) AND COALESCE(NEW.quantity,0) > 0 THEN
    NEW.status := 'inactive';
  ELSE
    NEW.status := 'active';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER protheus_contracts_compute_trg
BEFORE INSERT OR UPDATE ON public.protheus_contracts
FOR EACH ROW EXECUTE FUNCTION public.protheus_contracts_compute();
