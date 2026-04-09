
-- Create participants table for patient tracking
CREATE TABLE public.participants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    participant_code TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(project_id, participant_code)
);

-- Create payment_config table for project payment settings
CREATE TABLE public.payment_configs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    total_visits INTEGER NOT NULL DEFAULT 1,
    value_per_visit NUMERIC(10,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'BRL',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create visits table for tracking participant visits
CREATE TABLE public.visits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    visit_number INTEGER NOT NULL,
    scheduled_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payment_amount NUMERIC(10,2),
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(participant_id, visit_number)
);

-- Enable RLS
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for participants
CREATE POLICY "Authenticated users can view participants"
ON public.participants FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage participants"
ON public.participants FOR ALL
USING (auth.role() = 'authenticated');

-- RLS Policies for payment_configs
CREATE POLICY "Authenticated users can view payment configs"
ON public.payment_configs FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage payment configs"
ON public.payment_configs FOR ALL
USING (auth.role() = 'authenticated');

-- RLS Policies for visits
CREATE POLICY "Authenticated users can view visits"
ON public.visits FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage visits"
ON public.visits FOR ALL
USING (auth.role() = 'authenticated');

-- Triggers for updated_at
CREATE TRIGGER update_participants_updated_at
BEFORE UPDATE ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_payment_configs_updated_at
BEFORE UPDATE ON public.payment_configs
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_visits_updated_at
BEFORE UPDATE ON public.visits
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for visits table (for sync between modules)
ALTER PUBLICATION supabase_realtime ADD TABLE public.visits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
