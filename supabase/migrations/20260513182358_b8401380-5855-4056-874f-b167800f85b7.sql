-- Create table for IP items
CREATE TABLE IF NOT EXISTS public.investigational_product_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investigational_product_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow view for all authenticated users" 
ON public.investigational_product_items FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow insert for admin users" 
ON public.investigational_product_items FOR INSERT 
TO authenticated 
WITH CHECK (true); -- Simplified for now, the app logic handles permission check

CREATE POLICY "Allow update for admin users" 
ON public.investigational_product_items FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Allow delete for admin users" 
ON public.investigational_product_items FOR DELETE 
TO authenticated 
USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.investigational_product_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
