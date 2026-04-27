-- 1. Fix infinite recursion on user_roles policy
CREATE OR REPLACE FUNCTION public.user_has_role_in_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND project_id = _project_id
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

DROP POLICY IF EXISTS "Project managers can view roles in their projects" ON public.user_roles;
CREATE POLICY "Project managers can view roles in their projects"
  ON public.user_roles
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'project_manager'::app_role)
    AND (project_id IS NULL OR public.user_has_role_in_project(auth.uid(), project_id))
  );

-- 2. Module permission enums
DO $$ BEGIN
  CREATE TYPE public.module_key AS ENUM (
    'dashboard','communications','projects','agenda','tasks',
    'visits','site_monitoring','pmcf_survey',
    'qualifications','trainings','change_control','risks',
    'committees','steering','regulatory','payments','library'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.module_action AS ENUM ('view','create');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Module permissions table
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module module_key NOT NULL,
  action module_action NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_module_permissions_unique UNIQUE (user_id, module, action, project_id)
);

CREATE INDEX IF NOT EXISTS idx_ump_user ON public.user_module_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_ump_module ON public.user_module_permissions(module);

ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage all module permissions" ON public.user_module_permissions;
CREATE POLICY "Admins manage all module permissions"
  ON public.user_module_permissions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users view their own module permissions" ON public.user_module_permissions;
CREATE POLICY "Users view their own module permissions"
  ON public.user_module_permissions
  FOR SELECT
  USING (user_id = auth.uid());

-- 4. Helper functions
CREATE OR REPLACE FUNCTION public.has_module_permission(
  _user_id uuid,
  _module module_key,
  _action module_action,
  _project_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.user_module_permissions
        WHERE user_id = _user_id
          AND module = _module
          AND action = _action
          AND (project_id IS NULL OR project_id = _project_id)
      )
      OR (
        _action = 'view'::module_action
        AND EXISTS (
          SELECT 1 FROM public.user_module_permissions
          WHERE user_id = _user_id
            AND module = _module
            AND action = 'create'::module_action
            AND (project_id IS NULL OR project_id = _project_id)
        )
      )
$$;

CREATE OR REPLACE FUNCTION public.get_user_module_permissions(_user_id uuid)
RETURNS TABLE(module module_key, action module_action, project_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT module, action, project_id
  FROM public.user_module_permissions
  WHERE user_id = _user_id
$$;