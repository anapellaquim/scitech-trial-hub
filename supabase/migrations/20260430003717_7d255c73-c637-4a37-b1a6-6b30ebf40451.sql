CREATE TABLE public.monitor_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monitoring_visit_id UUID NOT NULL REFERENCES public.site_monitoring_visits(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  author_id UUID,
  author_name TEXT,
  category TEXT,
  importance TEXT NOT NULL DEFAULT 'medium',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_monitor_notes_visit ON public.monitor_notes(monitoring_visit_id);
CREATE INDEX idx_monitor_notes_project ON public.monitor_notes(project_id);
CREATE INDEX idx_monitor_notes_created ON public.monitor_notes(created_at DESC);

ALTER TABLE public.monitor_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view monitor_notes"
  ON public.monitor_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert monitor_notes"
  ON public.monitor_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id OR author_id IS NULL);

CREATE POLICY "Authors can update their monitor_notes"
  ON public.monitor_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authors can delete their monitor_notes"
  ON public.monitor_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_monitor_notes_updated_at
  BEFORE UPDATE ON public.monitor_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();