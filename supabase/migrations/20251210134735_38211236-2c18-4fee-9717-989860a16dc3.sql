-- Create document_templates table
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  current_version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_versions table for version history
CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  changes_description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, version_number)
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_templates
CREATE POLICY "Authenticated users can view document_templates"
ON public.document_templates
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert document_templates"
ON public.document_templates
FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

CREATE POLICY "Authenticated users can update document_templates"
ON public.document_templates
FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete document_templates"
ON public.document_templates
FOR DELETE
USING (auth.role() = 'authenticated');

-- RLS policies for document_versions
CREATE POLICY "Authenticated users can view document_versions"
ON public.document_versions
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert document_versions"
ON public.document_versions
FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_document_templates_updated_at
BEFORE UPDATE ON public.document_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();