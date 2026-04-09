-- Study visits table
CREATE TABLE public.study_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.study_sites(id) ON DELETE CASCADE,
  visit_type visit_type NOT NULL,
  visit_number INTEGER,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  status TEXT NOT NULL DEFAULT 'scheduled',
  responsible_id UUID REFERENCES auth.users(id),
  notes TEXT,
  report_notes TEXT,
  signature_data TEXT,
  signed_by UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checklist templates for visits
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  visit_type visit_type NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  is_global BOOLEAN DEFAULT true,
  study_id UUID REFERENCES public.studies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Visit checklist items (instances)
CREATE TABLE public.visit_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.study_visits(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  item_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Visit findings
CREATE TABLE public.visit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.study_visits(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'minor',
  status TEXT NOT NULL DEFAULT 'open',
  due_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_findings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view study_visits"
ON public.study_visits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage study_visits"
ON public.study_visits FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view checklist_templates"
ON public.checklist_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage checklist_templates"
ON public.checklist_templates FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view visit_checklist_items"
ON public.visit_checklist_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage visit_checklist_items"
ON public.visit_checklist_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view visit_findings"
ON public.visit_findings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage visit_findings"
ON public.visit_findings FOR ALL TO authenticated USING (true);

-- Triggers
CREATE TRIGGER update_study_visits_updated_at
BEFORE UPDATE ON public.study_visits
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_checklist_templates_updated_at
BEFORE UPDATE ON public.checklist_templates
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_visit_checklist_items_updated_at
BEFORE UPDATE ON public.visit_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_visit_findings_updated_at
BEFORE UPDATE ON public.visit_findings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert default checklist templates
INSERT INTO public.checklist_templates (name, visit_type, items, is_global) VALUES
('Checklist SQV', 'SQV', '[
  {"text": "Verificar infraestrutura do site", "required": true},
  {"text": "Avaliar capacidade de recrutamento", "required": true},
  {"text": "Revisar experiência prévia em estudos", "required": false},
  {"text": "Verificar disponibilidade da equipe", "required": true},
  {"text": "Avaliar equipamentos necessários", "required": false},
  {"text": "Documentar conclusões e recomendações", "required": true}
]', true),
('Checklist SIV', 'SIV', '[
  {"text": "Treinar equipe no protocolo", "required": true},
  {"text": "Revisar critérios de inclusão/exclusão", "required": true},
  {"text": "Configurar acesso aos sistemas eCRF", "required": true},
  {"text": "Entregar medicação investigacional", "required": true},
  {"text": "Revisar processo de consentimento informado", "required": true},
  {"text": "Verificar procedimentos de randomização", "required": false},
  {"text": "Confirmar contatos de emergência", "required": true}
]', true),
('Checklist IMV', 'IMV', '[
  {"text": "Verificar documentos fonte vs CRF", "required": true},
  {"text": "Revisar consentimentos informados", "required": true},
  {"text": "Verificar conformidade do protocolo", "required": true},
  {"text": "Revisar eventos adversos reportados", "required": true},
  {"text": "Conferir estoque de medicação", "required": true},
  {"text": "Verificar condições de armazenamento", "required": true},
  {"text": "Revisar queries pendentes", "required": false},
  {"text": "Atualizar log de monitoria", "required": true}
]', true),
('Checklist COV', 'COV', '[
  {"text": "Reconciliar toda medicação", "required": true},
  {"text": "Coletar documentos essenciais pendentes", "required": true},
  {"text": "Verificar resolução de todas queries", "required": true},
  {"text": "Confirmar fechamento de todos SAEs", "required": true},
  {"text": "Destruir/devolver materiais do estudo", "required": true},
  {"text": "Arquivar documentação do site", "required": true},
  {"text": "Obter carta de encerramento assinada", "required": true}
]', true);