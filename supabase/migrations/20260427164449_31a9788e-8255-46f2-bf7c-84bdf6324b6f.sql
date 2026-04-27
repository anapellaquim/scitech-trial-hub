-- Enums
CREATE TYPE public.stakeholder_type AS ENUM (
  'sponsor', 'ethics_committee', 'regulatory_authority', 'research_center',
  'vendor', 'dsmb', 'steering_committee', 'investigator', 'internal_team', 'other'
);

CREATE TYPE public.communication_frequency AS ENUM (
  'once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'on_event'
);

CREATE TYPE public.communication_channel AS ENUM (
  'email', 'etmf', 'portal', 'meeting', 'letter', 'phone', 'system', 'other'
);

CREATE TYPE public.communication_recipient_role AS ENUM ('to', 'cc', 'bcc', 'informed');

CREATE TYPE public.communication_occurrence_status AS ENUM (
  'scheduled', 'sent', 'overdue', 'acknowledged', 'skipped'
);

-- Add new notification types to existing enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'communication_due_soon';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'communication_today';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'communication_overdue';

-- Stakeholders catalog
CREATE TABLE public.communication_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  stakeholder_type public.stakeholder_type NOT NULL DEFAULT 'other',
  name text NOT NULL,
  organization text,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_comm_stakeholders_project ON public.communication_stakeholders(project_id);

ALTER TABLE public.communication_stakeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_all_communication_stakeholders
  ON public.communication_stakeholders FOR ALL
  USING (auth.role() = 'authenticated');

CREATE TRIGGER trg_comm_stakeholders_updated
  BEFORE UPDATE ON public.communication_stakeholders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Communication plans
CREATE TABLE public.communication_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  purpose text,
  channel public.communication_channel NOT NULL DEFAULT 'email',
  frequency public.communication_frequency NOT NULL DEFAULT 'monthly',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  due_day_offset integer NOT NULL DEFAULT 1,
  lead_time_days integer NOT NULL DEFAULT 3,
  sender_stakeholder_id uuid,
  responsible_user_id uuid,
  is_mandatory boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_comm_plans_project ON public.communication_plans(project_id);
CREATE INDEX idx_comm_plans_active ON public.communication_plans(is_active);

ALTER TABLE public.communication_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_all_communication_plans
  ON public.communication_plans FOR ALL
  USING (auth.role() = 'authenticated');

CREATE TRIGGER trg_comm_plans_updated
  BEFORE UPDATE ON public.communication_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recipients (N:N)
CREATE TABLE public.communication_plan_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  stakeholder_id uuid NOT NULL,
  role public.communication_recipient_role NOT NULL DEFAULT 'to',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comm_recipients_plan ON public.communication_plan_recipients(plan_id);
CREATE INDEX idx_comm_recipients_stakeholder ON public.communication_plan_recipients(stakeholder_id);
CREATE UNIQUE INDEX uq_comm_recipients ON public.communication_plan_recipients(plan_id, stakeholder_id, role);

ALTER TABLE public.communication_plan_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_all_communication_plan_recipients
  ON public.communication_plan_recipients FOR ALL
  USING (auth.role() = 'authenticated');

-- Occurrences
CREATE TABLE public.communication_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  project_id uuid NOT NULL,
  due_date date NOT NULL,
  sent_date date,
  status public.communication_occurrence_status NOT NULL DEFAULT 'scheduled',
  evidence_url text,
  notes text,
  completed_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comm_occurrences_plan ON public.communication_occurrences(plan_id);
CREATE INDEX idx_comm_occurrences_project ON public.communication_occurrences(project_id);
CREATE INDEX idx_comm_occurrences_due ON public.communication_occurrences(due_date);
CREATE INDEX idx_comm_occurrences_status ON public.communication_occurrences(status);
CREATE UNIQUE INDEX uq_comm_occurrences_plan_due ON public.communication_occurrences(plan_id, due_date);

ALTER TABLE public.communication_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_all_communication_occurrences
  ON public.communication_occurrences FOR ALL
  USING (auth.role() = 'authenticated');

CREATE TRIGGER trg_comm_occurrences_updated
  BEFORE UPDATE ON public.communication_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function: generate occurrences for a plan (rolling 12 months)
CREATE OR REPLACE FUNCTION public.generate_communication_occurrences(_plan_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan public.communication_plans%ROWTYPE;
  _cursor date;
  _horizon date;
  _step interval;
  _count integer := 0;
BEGIN
  SELECT * INTO _plan FROM public.communication_plans WHERE id = _plan_id;
  IF NOT FOUND OR NOT _plan.is_active THEN
    RETURN 0;
  END IF;

  _horizon := LEAST(COALESCE(_plan.end_date, CURRENT_DATE + INTERVAL '12 months')::date,
                    (CURRENT_DATE + INTERVAL '12 months')::date);
  _cursor := GREATEST(_plan.start_date, CURRENT_DATE - INTERVAL '1 month');

  -- 'once' and 'on_event' produce only one occurrence at start_date
  IF _plan.frequency IN ('once', 'on_event') THEN
    INSERT INTO public.communication_occurrences (plan_id, project_id, due_date)
    VALUES (_plan.id, _plan.project_id, _plan.start_date)
    ON CONFLICT (plan_id, due_date) DO NOTHING;
    GET DIAGNOSTICS _count = ROW_COUNT;
    RETURN _count;
  END IF;

  _step := CASE _plan.frequency
    WHEN 'weekly' THEN INTERVAL '1 week'
    WHEN 'biweekly' THEN INTERVAL '2 weeks'
    WHEN 'monthly' THEN INTERVAL '1 month'
    WHEN 'quarterly' THEN INTERVAL '3 months'
    WHEN 'semiannual' THEN INTERVAL '6 months'
    WHEN 'annual' THEN INTERVAL '1 year'
  END;

  WHILE _cursor <= _horizon LOOP
    INSERT INTO public.communication_occurrences (plan_id, project_id, due_date)
    VALUES (_plan.id, _plan.project_id, _cursor)
    ON CONFLICT (plan_id, due_date) DO NOTHING;
    _count := _count + 1;
    _cursor := (_cursor + _step)::date;
  END LOOP;

  RETURN _count;
END;
$$;

-- Trigger: mark overdue automatically
CREATE OR REPLACE FUNCTION public.communication_occurrence_overdue_check()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'scheduled' AND NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'overdue';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_comm_occurrence_overdue
  BEFORE INSERT OR UPDATE ON public.communication_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.communication_occurrence_overdue_check();