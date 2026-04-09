-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM (
  'task_overdue',
  'task_due_today',
  'task_due_soon',
  'visit_overdue',
  'visit_today',
  'visit_upcoming',
  'visit_no_report',
  'finding_critical',
  'finding_overdue',
  'finding_aging',
  'regulatory_pending',
  'regulatory_due_soon',
  'payment_overdue',
  'payment_due_soon',
  'document_pending',
  'document_missing',
  'participant_status',
  'general'
);

-- Create severity enum
CREATE TYPE public.notification_severity AS ENUM ('info', 'warning', 'critical');

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'general',
  severity notification_severity NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications or global ones (user_id is null)
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own notifications (mark as read, dismiss)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

-- System can insert notifications (via service role)
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_project_id ON public.notifications(project_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_severity ON public.notifications(severity);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;