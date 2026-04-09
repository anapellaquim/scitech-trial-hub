-- Create enum for regulatory status
CREATE TYPE public.regulatory_status AS ENUM ('pending', 'submitted', 'under_review', 'approved', 'rejected', 'revision_required');

-- Create table for regulatory flow templates (configurable steps)
CREATE TABLE public.regulatory_flow_steps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    study_id UUID REFERENCES public.studies(id) ON DELETE CASCADE NOT NULL,
    step_name TEXT NOT NULL,
    step_order INTEGER NOT NULL DEFAULT 1,
    deadline_days INTEGER, -- days from previous step or study start
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for regulatory submissions
CREATE TABLE public.regulatory_submissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    study_id UUID REFERENCES public.studies(id) ON DELETE CASCADE NOT NULL,
    flow_step_id UUID REFERENCES public.regulatory_flow_steps(id) ON DELETE SET NULL,
    submission_type TEXT NOT NULL,
    planned_date DATE,
    submission_date DATE,
    status regulatory_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for regulatory reports
CREATE TABLE public.regulatory_reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    study_id UUID REFERENCES public.studies(id) ON DELETE CASCADE NOT NULL,
    submission_id UUID REFERENCES public.regulatory_submissions(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    due_date DATE NOT NULL,
    submitted_date DATE,
    status regulatory_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.regulatory_flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for regulatory_flow_steps
CREATE POLICY "Users can view regulatory flow steps" ON public.regulatory_flow_steps
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create regulatory flow steps" ON public.regulatory_flow_steps
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update regulatory flow steps" ON public.regulatory_flow_steps
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete regulatory flow steps" ON public.regulatory_flow_steps
FOR DELETE TO authenticated USING (true);

-- RLS Policies for regulatory_submissions
CREATE POLICY "Users can view regulatory submissions" ON public.regulatory_submissions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create regulatory submissions" ON public.regulatory_submissions
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update regulatory submissions" ON public.regulatory_submissions
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete regulatory submissions" ON public.regulatory_submissions
FOR DELETE TO authenticated USING (true);

-- RLS Policies for regulatory_reports
CREATE POLICY "Users can view regulatory reports" ON public.regulatory_reports
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create regulatory reports" ON public.regulatory_reports
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update regulatory reports" ON public.regulatory_reports
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete regulatory reports" ON public.regulatory_reports
FOR DELETE TO authenticated USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_regulatory_flow_steps_updated_at
BEFORE UPDATE ON public.regulatory_flow_steps
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_regulatory_submissions_updated_at
BEFORE UPDATE ON public.regulatory_submissions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_regulatory_reports_updated_at
BEFORE UPDATE ON public.regulatory_reports
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();