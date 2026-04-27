CREATE TABLE public.steering_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  meeting_code text NOT NULL,
  meeting_date date NOT NULL,
  location text,
  attendees text,
  agenda text,
  minutes text,
  next_meeting_date date,
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.steering_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_steering_meetings" ON public.steering_meetings
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TRIGGER update_steering_meetings_updated_at
  BEFORE UPDATE ON public.steering_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();