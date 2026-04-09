-- Add receipts folder link to payment_configs table
ALTER TABLE public.payment_configs 
ADD COLUMN receipts_folder_link text;