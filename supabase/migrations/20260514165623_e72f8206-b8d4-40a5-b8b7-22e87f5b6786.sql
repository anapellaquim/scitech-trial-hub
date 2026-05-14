ALTER TABLE public.site_vendor_qualifications
  ADD COLUMN IF NOT EXISTS cv_status text NOT NULL DEFAULT 'pending';