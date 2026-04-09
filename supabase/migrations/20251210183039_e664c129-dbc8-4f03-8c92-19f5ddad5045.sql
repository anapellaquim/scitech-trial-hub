-- Add status column to vendor_payments table
ALTER TABLE public.vendor_payments 
ADD COLUMN status text NOT NULL DEFAULT 'programado'::text;