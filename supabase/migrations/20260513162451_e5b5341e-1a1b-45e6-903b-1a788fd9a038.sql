-- Enum for Patient Status
DO $$ BEGIN
    CREATE TYPE public.patient_status AS ENUM (
        'Screening', 
        'Screen Failure', 
        'Randomized', 
        'Completed', 
        'Lost to Follow-up', 
        'Early Exit', 
        'Withdrawn'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table for Patients (Participants)
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    site_id UUID REFERENCES public.research_centers(id) ON DELETE CASCADE NOT NULL,
    patient_code TEXT NOT NULL,
    status public.patient_status DEFAULT 'Screening' NOT NULL,
    enrollment_date DATE,
    randomization_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(project_id, patient_code)
);

-- Table for Protocol Visit Schedules (Configurations per study/site)
CREATE TABLE IF NOT EXISTS public.protocol_visit_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    site_id UUID REFERENCES public.research_centers(id) ON DELETE CASCADE, -- If null, applies to all sites unless overridden
    visit_name TEXT NOT NULL,
    target_day INTEGER NOT NULL, -- Days from baseline (e.g., Day 0, Day 14)
    window_minus INTEGER DEFAULT 0,
    window_plus INTEGER DEFAULT 0,
    payment_amount DECIMAL(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table for Patient Visits (Actual Occurrences)
CREATE TABLE IF NOT EXISTS public.patient_visits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    protocol_visit_id UUID REFERENCES public.protocol_visit_schedules(id) ON DELETE CASCADE NOT NULL,
    actual_date DATE,
    status TEXT DEFAULT 'Scheduled' NOT NULL, -- Scheduled, Completed, Missed, Out of Window
    payment_status TEXT DEFAULT 'Pending' NOT NULL, -- Pending, Approved, Paid
    payment_id UUID, -- Link to payment module records if applicable
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_visit_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_visits ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for demo, usually based on project access)
CREATE POLICY "Users can view patients for their projects" ON public.patients FOR SELECT USING (true);
CREATE POLICY "Users can insert patients for their projects" ON public.patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update patients for their projects" ON public.patients FOR UPDATE USING (true);

CREATE POLICY "Users can view protocol schedules" ON public.protocol_visit_schedules FOR SELECT USING (true);
CREATE POLICY "Users can manage protocol schedules" ON public.protocol_visit_schedules FOR ALL USING (true);

CREATE POLICY "Users can view patient visits" ON public.patient_visits FOR SELECT USING (true);
CREATE POLICY "Users can manage patient visits" ON public.patient_visits FOR ALL USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_protocol_visit_schedules_updated_at BEFORE UPDATE ON public.protocol_visit_schedules FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_patient_visits_updated_at BEFORE UPDATE ON public.patient_visits FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
