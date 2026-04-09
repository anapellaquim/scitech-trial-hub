-- Create table for finding change history
CREATE TABLE public.finding_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  finding_id UUID NOT NULL REFERENCES public.visit_findings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'created', 'updated', 'status_changed', 'assigned'
  field_changed TEXT, -- which field was changed
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.finding_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view finding_history"
ON public.finding_history
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert finding_history"
ON public.finding_history
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX idx_finding_history_finding_id ON public.finding_history(finding_id);
CREATE INDEX idx_finding_history_created_at ON public.finding_history(created_at DESC);