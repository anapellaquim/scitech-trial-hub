-- Create payment_history table to track all payment transactions
CREATE TABLE public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view payment_history"
ON public.payment_history
FOR SELECT
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can manage payment_history"
ON public.payment_history
FOR ALL
USING (auth.role() = 'authenticated'::text);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payment_history_updated_at
BEFORE UPDATE ON public.payment_history
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for better performance
CREATE INDEX idx_payment_history_project ON public.payment_history(project_id);
CREATE INDEX idx_payment_history_participant ON public.payment_history(participant_id);
CREATE INDEX idx_payment_history_date ON public.payment_history(payment_date DESC);