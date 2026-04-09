-- Enum for visit types
CREATE TYPE public.visit_type AS ENUM ('SQV', 'SIV', 'IMV', 'COV');

-- Enum for task status (Kanban)
CREATE TYPE public.task_status AS ENUM ('backlog', 'in_progress', 'waiting', 'completed');

-- Enum for priority
CREATE TYPE public.priority_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Studies table
CREATE TABLE public.studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  sponsor TEXT,
  therapeutic_area TEXT,
  phase TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sites table (linked to studies)
CREATE TABLE public.study_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  site_code TEXT NOT NULL,
  name TEXT NOT NULL,
  pi_name TEXT,
  pi_email TEXT,
  pi_phone TEXT,
  coordinator_name TEXT,
  coordinator_email TEXT,
  coordinator_phone TEXT,
  status TEXT NOT NULL DEFAULT 'screening',
  address TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(study_id, site_code)
);

-- Task templates table
CREATE TABLE public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  default_tasks JSONB NOT NULL DEFAULT '[]',
  is_global BOOLEAN DEFAULT true,
  study_id UUID REFERENCES public.studies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Study tasks table
CREATE TABLE public.study_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.study_sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'backlog',
  priority priority_level NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  template_id UUID REFERENCES public.task_templates(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for studies
CREATE POLICY "Authenticated users can view studies"
ON public.studies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert studies"
ON public.studies FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update studies"
ON public.studies FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete studies"
ON public.studies FOR DELETE
TO authenticated
USING (true);

-- RLS Policies for study_sites
CREATE POLICY "Authenticated users can view study_sites"
ON public.study_sites FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage study_sites"
ON public.study_sites FOR ALL
TO authenticated
USING (true);

-- RLS Policies for task_templates
CREATE POLICY "Authenticated users can view task_templates"
ON public.task_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage task_templates"
ON public.task_templates FOR ALL
TO authenticated
USING (true);

-- RLS Policies for study_tasks
CREATE POLICY "Authenticated users can view study_tasks"
ON public.study_tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage study_tasks"
ON public.study_tasks FOR ALL
TO authenticated
USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_studies_updated_at
BEFORE UPDATE ON public.studies
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_study_sites_updated_at
BEFORE UPDATE ON public.study_sites
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_task_templates_updated_at
BEFORE UPDATE ON public.task_templates
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_study_tasks_updated_at
BEFORE UPDATE ON public.study_tasks
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert default task templates
INSERT INTO public.task_templates (name, description, category, default_tasks, is_global) VALUES
('SQV - Site Qualification Visit', 'Template padrão para visita de qualificação', 'visit', 
 '[{"title": "Avaliar infraestrutura do site", "priority": "high"}, {"title": "Verificar equipe disponível", "priority": "high"}, {"title": "Revisar experiência prévia", "priority": "medium"}, {"title": "Avaliar população de pacientes", "priority": "high"}, {"title": "Documentar conclusões", "priority": "medium"}]', 
 true),
('SIV - Site Initiation Visit', 'Template padrão para visita de iniciação', 'visit',
 '[{"title": "Treinar equipe no protocolo", "priority": "critical"}, {"title": "Revisar procedimentos de coleta", "priority": "high"}, {"title": "Configurar acesso aos sistemas", "priority": "high"}, {"title": "Entregar materiais do estudo", "priority": "medium"}, {"title": "Revisar processo de consentimento", "priority": "critical"}]',
 true),
('IMV - Interim Monitoring Visit', 'Template padrão para visita de monitoria', 'visit',
 '[{"title": "Verificar documentos fonte", "priority": "critical"}, {"title": "Revisar CRFs pendentes", "priority": "high"}, {"title": "Verificar conformidade do protocolo", "priority": "critical"}, {"title": "Revisar eventos adversos", "priority": "critical"}, {"title": "Verificar estoque de medicação", "priority": "high"}, {"title": "Atualizar log de monitoria", "priority": "medium"}]',
 true),
('COV - Close-Out Visit', 'Template padrão para visita de encerramento', 'visit',
 '[{"title": "Reconciliar medicação", "priority": "critical"}, {"title": "Coletar documentos essenciais", "priority": "critical"}, {"title": "Verificar queries pendentes", "priority": "high"}, {"title": "Destruir/devolver materiais", "priority": "high"}, {"title": "Arquivar documentação do site", "priority": "medium"}, {"title": "Obter carta de encerramento", "priority": "high"}]',
 true),
('Setup de Site', 'Tarefas padrão para configuração de novo site', 'setup',
 '[{"title": "Obter aprovação ética", "priority": "critical"}, {"title": "Coletar documentos regulatórios", "priority": "critical"}, {"title": "Configurar contrato", "priority": "high"}, {"title": "Cadastrar equipe no sistema", "priority": "medium"}, {"title": "Enviar materiais iniciais", "priority": "medium"}]',
 true);