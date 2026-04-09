-- =============================================
-- FASE 1: SISTEMA DE CONTROLE DE ACESSO (RBAC)
-- =============================================

-- 1.1 Criar enum de papéis
CREATE TYPE public.app_role AS ENUM (
  'admin',           -- Acesso total ao sistema
  'project_manager', -- Gerencia projetos/estudos
  'monitor',         -- Monitoria de centros e visitas
  'data_manager',    -- Gestão de dados EDC
  'regulatory',      -- Assuntos regulatórios
  'quality',         -- Garantia de qualidade
  'finance',         -- Pagamentos e orçamentos
  'viewer'           -- Apenas visualização
);

-- 1.2 Criar tabela de papéis do usuário (SEPARADA de profiles - segurança crítica)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE, -- NULL = acesso global
  study_id uuid REFERENCES public.studies(id) ON DELETE CASCADE, -- NULL = todos os estudos
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz, -- NULL = não expira
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, role, project_id, study_id)
);

-- 1.3 Habilitar RLS na tabela de papéis
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 1.4 Função de verificação de papel (SECURITY DEFINER - evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- 1.5 Função para verificar qualquer papel de uma lista
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- 1.6 Função para verificar papel em projeto específico
CREATE OR REPLACE FUNCTION public.has_role_in_project(_user_id uuid, _role public.app_role, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (project_id IS NULL OR project_id = _project_id)
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- 1.7 Função para obter todos os papéis de um usuário
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS TABLE(role public.app_role, project_id uuid, study_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role, project_id, study_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND (expires_at IS NULL OR expires_at > now())
$$;

-- 1.8 Políticas RLS para user_roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Project managers can view roles in their projects" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'project_manager')
    AND (project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.project_id = user_roles.project_id
    ))
  );

-- =============================================
-- FASE 2: AUDIT TRAIL UNIFICADO (21 CFR Part 11)
-- =============================================

-- 2.1 Criar tabela de audit trail centralizada
CREATE TABLE public.system_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação da entidade
  module text NOT NULL, -- 'study', 'visit', 'edc', 'etmf', 'regulatory', 'payment', 'user', 'project'
  entity_type text NOT NULL, -- Nome da tabela
  entity_id uuid NOT NULL,
  
  -- Ação realizada
  action text NOT NULL, -- 'create', 'read', 'update', 'delete', 'approve', 'reject', 'sign', 'export'
  
  -- Dados da alteração (JSONB para flexibilidade)
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  
  -- Contexto da alteração
  reason text, -- Motivo da alteração (obrigatório para edições críticas)
  
  -- Informações do usuário
  user_id uuid NOT NULL,
  user_email text,
  user_name text,
  user_role text,
  
  -- Metadados técnicos para rastreabilidade
  ip_address inet,
  user_agent text,
  session_id text,
  
  -- Timestamp imutável
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2.2 Índices para consultas frequentes
CREATE INDEX idx_audit_module_date ON public.system_audit_log(module, created_at DESC);
CREATE INDEX idx_audit_entity ON public.system_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON public.system_audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON public.system_audit_log(action, created_at DESC);
CREATE INDEX idx_audit_created_at ON public.system_audit_log(created_at DESC);

-- 2.3 Habilitar RLS no audit log
ALTER TABLE public.system_audit_log ENABLE ROW LEVEL SECURITY;

-- 2.4 Política APPEND-ONLY (compliance 21 CFR Part 11)
-- Ninguém pode deletar ou atualizar registros de audit
CREATE POLICY "Audit log is append-only" ON public.system_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins and quality can view all audit logs" ON public.system_audit_log
  FOR SELECT TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'quality']::public.app_role[])
  );

CREATE POLICY "Users can view their own audit logs" ON public.system_audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2.5 Função para determinar módulo baseado na tabela
CREATE OR REPLACE FUNCTION public.get_module_from_table(table_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE table_name
    WHEN 'studies' THEN 'study'
    WHEN 'study_sites' THEN 'study'
    WHEN 'study_visits' THEN 'visit'
    WHEN 'visit_findings' THEN 'visit'
    WHEN 'visit_checklist_items' THEN 'visit'
    WHEN 'crf_entries' THEN 'edc'
    WHEN 'crf_field_values' THEN 'edc'
    WHEN 'crf_templates' THEN 'edc'
    WHEN 'tmf_documents' THEN 'etmf'
    WHEN 'tmf_document_versions' THEN 'etmf'
    WHEN 'regulatory_submissions' THEN 'regulatory'
    WHEN 'regulatory_reports' THEN 'regulatory'
    WHEN 'vendor_payments' THEN 'payment'
    WHEN 'payment_history' THEN 'payment'
    WHEN 'user_roles' THEN 'user'
    WHEN 'profiles' THEN 'user'
    WHEN 'projects' THEN 'project'
    WHEN 'tasks' THEN 'project'
    WHEN 'participants' THEN 'participant'
    ELSE 'other'
  END
$$;

-- 2.6 Função para obter informações do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_info()
RETURNS TABLE(user_id uuid, user_email text, user_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    (SELECT full_name FROM public.profiles WHERE id = auth.uid())
$$;

-- 2.7 Trigger function para auditoria automática
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _module text;
  _changed_fields text[];
  _user_id uuid;
  _user_email text;
  _user_name text;
  _old_data jsonb;
  _new_data jsonb;
BEGIN
  -- Obter usuário atual
  _user_id := auth.uid();
  
  -- Se não houver usuário autenticado, usar um placeholder
  IF _user_id IS NULL THEN
    _user_id := '00000000-0000-0000-0000-000000000000'::uuid;
    _user_email := 'system';
    _user_name := 'System';
  ELSE
    SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
    SELECT full_name INTO _user_name FROM public.profiles WHERE id = _user_id;
  END IF;
  
  -- Determinar módulo baseado na tabela
  _module := public.get_module_from_table(TG_TABLE_NAME);

  IF TG_OP = 'INSERT' THEN
    _new_data := to_jsonb(NEW);
    
    INSERT INTO public.system_audit_log (
      module, entity_type, entity_id, action, new_data, 
      user_id, user_email, user_name
    )
    VALUES (
      _module, TG_TABLE_NAME, NEW.id, 'create', _new_data,
      _user_id, _user_email, _user_name
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    _old_data := to_jsonb(OLD);
    _new_data := to_jsonb(NEW);
    
    -- Calcular campos alterados
    SELECT array_agg(key) INTO _changed_fields
    FROM (
      SELECT key
      FROM jsonb_each(_new_data) n
      FULL OUTER JOIN jsonb_each(_old_data) o USING (key)
      WHERE n.value IS DISTINCT FROM o.value
    ) changes;
    
    -- Só registrar se houve alterações reais
    IF _changed_fields IS NOT NULL AND array_length(_changed_fields, 1) > 0 THEN
      INSERT INTO public.system_audit_log (
        module, entity_type, entity_id, action, old_data, new_data, changed_fields,
        user_id, user_email, user_name
      )
      VALUES (
        _module, TG_TABLE_NAME, NEW.id, 'update', _old_data, _new_data, _changed_fields,
        _user_id, _user_email, _user_name
      );
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    _old_data := to_jsonb(OLD);
    
    INSERT INTO public.system_audit_log (
      module, entity_type, entity_id, action, old_data,
      user_id, user_email, user_name
    )
    VALUES (
      _module, TG_TABLE_NAME, OLD.id, 'delete', _old_data,
      _user_id, _user_email, _user_name
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 2.8 Aplicar triggers nas tabelas críticas

-- Estudos
CREATE TRIGGER audit_studies
  AFTER INSERT OR UPDATE OR DELETE ON public.studies
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Visitas
CREATE TRIGGER audit_study_visits
  AFTER INSERT OR UPDATE OR DELETE ON public.study_visits
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_visit_findings
  AFTER INSERT OR UPDATE OR DELETE ON public.visit_findings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- EDC
CREATE TRIGGER audit_crf_field_values
  AFTER INSERT OR UPDATE OR DELETE ON public.crf_field_values
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- eTMF
CREATE TRIGGER audit_tmf_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.tmf_documents
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Regulatório
CREATE TRIGGER audit_regulatory_submissions
  AFTER INSERT OR UPDATE OR DELETE ON public.regulatory_submissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_regulatory_reports
  AFTER INSERT OR UPDATE OR DELETE ON public.regulatory_reports
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Pagamentos
CREATE TRIGGER audit_vendor_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.vendor_payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Projetos
CREATE TRIGGER audit_tasks
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Participantes
CREATE TRIGGER audit_participants
  AFTER INSERT OR UPDATE OR DELETE ON public.participants
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Papéis de usuário (crítico para segurança)
CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Profiles
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- =============================================
-- FASE 3: ASSINATURAS ELETRÔNICAS (21 CFR Part 11)
-- =============================================

-- 3.1 Criar tabela de assinaturas eletrônicas
CREATE TABLE public.electronic_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Documento assinado
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  signature_type text NOT NULL, -- 'approval', 'review', 'verification', 'authorization'
  
  -- Dados do signatário
  signer_id uuid REFERENCES auth.users(id) NOT NULL,
  signer_name text NOT NULL,
  signer_role text NOT NULL,
  
  -- Significado da assinatura (21 CFR Part 11 requirement)
  meaning text NOT NULL, -- Ex: 'Eu aprovo este documento', 'Eu verifiquei a precisão dos dados'
  
  -- Captura da assinatura (se aplicável)
  signature_image text, -- Base64 da assinatura manuscrita
  
  -- Autenticação
  authenticated_at timestamptz DEFAULT now() NOT NULL,
  authentication_method text DEFAULT 'password', -- 'password', 'otp', 'biometric'
  
  -- Hash do documento no momento da assinatura (integridade)
  document_hash text,
  
  -- Metadados
  ip_address inet,
  user_agent text,
  
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 3.2 Índices para assinaturas
CREATE INDEX idx_signatures_entity ON public.electronic_signatures(entity_type, entity_id);
CREATE INDEX idx_signatures_signer ON public.electronic_signatures(signer_id, created_at DESC);

-- 3.3 RLS para assinaturas
ALTER TABLE public.electronic_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create signatures" ON public.electronic_signatures
  FOR INSERT TO authenticated
  WITH CHECK (signer_id = auth.uid());

CREATE POLICY "Users can view signatures on accessible documents" ON public.electronic_signatures
  FOR SELECT TO authenticated
  USING (true);