ALTER TABLE public.vendor_payments
  ADD COLUMN IF NOT EXISTS cost_center text,
  ADD COLUMN IF NOT EXISTS value_class text;

ALTER TABLE public.vendor_payments
  ALTER COLUMN project_id DROP NOT NULL;