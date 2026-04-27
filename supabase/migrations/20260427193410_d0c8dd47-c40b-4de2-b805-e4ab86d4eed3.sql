-- Add new fields to change_controls
ALTER TABLE public.change_controls
  ADD COLUMN IF NOT EXISTS requester text,
  ADD COLUMN IF NOT EXISTS change_reason text,
  ADD COLUMN IF NOT EXISTS affected_documents text,
  ADD COLUMN IF NOT EXISTS impact_areas text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS requires_training boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_communication boolean NOT NULL DEFAULT false;

-- Action plan items
CREATE TABLE IF NOT EXISTS public.change_control_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_control_id uuid NOT NULL REFERENCES public.change_controls(id) ON DELETE CASCADE,
  action_description text NOT NULL,
  responsible text,
  due_date date,
  status text NOT NULL DEFAULT 'pending',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.change_control_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_change_control_actions"
  ON public.change_control_actions FOR ALL
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_cc_actions_cc_id ON public.change_control_actions(change_control_id);