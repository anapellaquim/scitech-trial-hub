-- Create safety_events table for adverse events management
CREATE TABLE public.safety_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL,
    research_center text,
    event_type text NOT NULL, -- 'AE', 'SAE', 'SUSAR', 'pregnancy', 'death'
    description text NOT NULL,
    onset_date date,
    resolution_date date,
    severity text, -- 'mild', 'moderate', 'severe', 'life_threatening', 'death'
    causality text, -- 'not_related', 'unlikely', 'possible', 'probable', 'definite'
    outcome text, -- 'recovered', 'recovering', 'not_recovered', 'fatal', 'unknown'
    status text NOT NULL DEFAULT 'open', -- 'open', 'under_review', 'reported', 'closed'
    reported_to_irb boolean DEFAULT false,
    reported_to_sponsor boolean DEFAULT false,
    reported_at timestamp with time zone,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create protocol_deviations table
CREATE TABLE public.protocol_deviations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL,
    research_center text,
    deviation_type text NOT NULL, -- 'inclusion_criteria', 'exclusion_criteria', 'procedure', 'timing', 'dosing', 'other'
    category text, -- 'major', 'minor'
    description text NOT NULL,
    deviation_date date NOT NULL,
    discovered_date date,
    impact_assessment text,
    corrective_action text,
    preventive_action text,
    status text NOT NULL DEFAULT 'open', -- 'open', 'under_review', 'closed'
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.safety_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_deviations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for safety_events
CREATE POLICY "Authenticated users can view safety_events"
ON public.safety_events FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert safety_events"
ON public.safety_events FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update safety_events"
ON public.safety_events FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete safety_events"
ON public.safety_events FOR DELETE TO authenticated
USING (true);

-- Create RLS policies for protocol_deviations
CREATE POLICY "Authenticated users can view protocol_deviations"
ON public.protocol_deviations FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert protocol_deviations"
ON public.protocol_deviations FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update protocol_deviations"
ON public.protocol_deviations FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete protocol_deviations"
ON public.protocol_deviations FOR DELETE TO authenticated
USING (true);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_safety_events_updated_at
    BEFORE UPDATE ON public.safety_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_protocol_deviations_updated_at
    BEFORE UPDATE ON public.protocol_deviations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_safety_events_project_id ON public.safety_events(project_id);
CREATE INDEX idx_safety_events_participant_id ON public.safety_events(participant_id);
CREATE INDEX idx_safety_events_status ON public.safety_events(status);
CREATE INDEX idx_protocol_deviations_project_id ON public.protocol_deviations(project_id);
CREATE INDEX idx_protocol_deviations_participant_id ON public.protocol_deviations(participant_id);
CREATE INDEX idx_protocol_deviations_status ON public.protocol_deviations(status);