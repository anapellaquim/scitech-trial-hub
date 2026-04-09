-- Create a table for vendor/general payments (not linked to participants/centers)
CREATE TABLE public.vendor_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view vendor_payments" 
ON public.vendor_payments 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage vendor_payments" 
ON public.vendor_payments 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_vendor_payments_updated_at
BEFORE UPDATE ON public.vendor_payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();