-- Create a table for vendors (suppliers)
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view vendors" 
ON public.vendors 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage vendors" 
ON public.vendors 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_vendors_updated_at
BEFORE UPDATE ON public.vendors
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add vendor_id and recurrence fields to vendor_payments
ALTER TABLE public.vendor_payments 
ADD COLUMN vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
ADD COLUMN recurrence_type TEXT DEFAULT 'none',
ADD COLUMN recurrence_end_date DATE,
ADD COLUMN parent_payment_id UUID REFERENCES public.vendor_payments(id) ON DELETE SET NULL;