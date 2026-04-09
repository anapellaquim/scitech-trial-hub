-- Add paid_at and drive_folder_link columns to vendor_payments
ALTER TABLE public.vendor_payments 
ADD COLUMN paid_at date,
ADD COLUMN drive_folder_link text;