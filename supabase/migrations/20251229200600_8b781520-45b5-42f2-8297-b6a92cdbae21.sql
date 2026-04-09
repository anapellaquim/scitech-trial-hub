-- Create CRF Templates table
CREATE TABLE public.crf_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid REFERENCES public.studies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create CRF Sections table
CREATE TABLE public.crf_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.crf_templates(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create CRF Fields table
CREATE TABLE public.crf_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES public.crf_sections(id) ON DELETE CASCADE NOT NULL,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  options jsonb DEFAULT '[]'::jsonb,
  validation_rules jsonb DEFAULT '{}'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  help_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create CRF Entries table (data per participant)
CREATE TABLE public.crf_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES public.crf_templates(id) ON DELETE CASCADE NOT NULL,
  visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'in_progress',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create CRF Field Values table
CREATE TABLE public.crf_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES public.crf_entries(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES public.crf_fields(id) ON DELETE CASCADE NOT NULL,
  value text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(entry_id, field_id)
);

-- Create CRF Audit Log table (append-only)
CREATE TABLE public.crf_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES public.crf_entries(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES public.crf_fields(id) ON DELETE CASCADE,
  action text NOT NULL,
  old_value text,
  new_value text,
  reason text,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.crf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crf_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crf_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crf_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crf_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crf_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crf_templates
CREATE POLICY "Authenticated users can view crf_templates"
ON public.crf_templates FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert crf_templates"
ON public.crf_templates FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

CREATE POLICY "Authenticated users can update crf_templates"
ON public.crf_templates FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete crf_templates"
ON public.crf_templates FOR DELETE
USING (auth.role() = 'authenticated');

-- RLS Policies for crf_sections
CREATE POLICY "Authenticated users can manage crf_sections"
ON public.crf_sections FOR ALL
USING (auth.role() = 'authenticated');

-- RLS Policies for crf_fields
CREATE POLICY "Authenticated users can manage crf_fields"
ON public.crf_fields FOR ALL
USING (auth.role() = 'authenticated');

-- RLS Policies for crf_entries
CREATE POLICY "Authenticated users can view crf_entries"
ON public.crf_entries FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert crf_entries"
ON public.crf_entries FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

CREATE POLICY "Authenticated users can update crf_entries"
ON public.crf_entries FOR UPDATE
USING (auth.role() = 'authenticated' AND status != 'locked');

CREATE POLICY "Authenticated users can delete crf_entries"
ON public.crf_entries FOR DELETE
USING (auth.role() = 'authenticated' AND status != 'locked');

-- RLS Policies for crf_field_values
CREATE POLICY "Authenticated users can view crf_field_values"
ON public.crf_field_values FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert crf_field_values"
ON public.crf_field_values FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update crf_field_values"
ON public.crf_field_values FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete crf_field_values"
ON public.crf_field_values FOR DELETE
USING (auth.role() = 'authenticated');

-- RLS Policies for crf_audit_log (append-only)
CREATE POLICY "Authenticated users can view crf_audit_log"
ON public.crf_audit_log FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert crf_audit_log"
ON public.crf_audit_log FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create updated_at triggers
CREATE TRIGGER update_crf_templates_updated_at
BEFORE UPDATE ON public.crf_templates
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_crf_sections_updated_at
BEFORE UPDATE ON public.crf_sections
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_crf_fields_updated_at
BEFORE UPDATE ON public.crf_fields
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_crf_entries_updated_at
BEFORE UPDATE ON public.crf_entries
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_crf_field_values_updated_at
BEFORE UPDATE ON public.crf_field_values
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_crf_templates_study_id ON public.crf_templates(study_id);
CREATE INDEX idx_crf_templates_project_id ON public.crf_templates(project_id);
CREATE INDEX idx_crf_sections_template_id ON public.crf_sections(template_id);
CREATE INDEX idx_crf_fields_section_id ON public.crf_fields(section_id);
CREATE INDEX idx_crf_entries_participant_id ON public.crf_entries(participant_id);
CREATE INDEX idx_crf_entries_template_id ON public.crf_entries(template_id);
CREATE INDEX idx_crf_field_values_entry_id ON public.crf_field_values(entry_id);
CREATE INDEX idx_crf_audit_log_entry_id ON public.crf_audit_log(entry_id);