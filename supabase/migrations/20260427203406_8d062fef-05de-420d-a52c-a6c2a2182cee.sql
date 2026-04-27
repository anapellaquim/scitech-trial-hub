-- =====================================================================
-- 1. Drop ALL policies that depend on has_role / legacy functions
-- =====================================================================
-- system_audit_log
DROP POLICY IF EXISTS "Admins and quality can view all audit logs" ON public.system_audit_log;
-- user_roles
DROP POLICY IF EXISTS "Project managers can view roles in their projects" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
-- user_module_permissions
DROP POLICY IF EXISTS "Admins manage all module permissions" ON public.user_module_permissions;
DROP POLICY IF EXISTS "Users can view their own module permissions" ON public.user_module_permissions;
-- user_site_access (legacy)
DROP POLICY IF EXISTS "Admins and study builders can delete site access" ON public.user_site_access;
DROP POLICY IF EXISTS "Admins and study builders can insert site access" ON public.user_site_access;
DROP POLICY IF EXISTS "Admins and study builders can update site access" ON public.user_site_access;
DROP POLICY IF EXISTS "Users can view their own site access" ON public.user_site_access;
-- database_locks (legacy)
DROP POLICY IF EXISTS "Authorized users can view locks" ON public.database_locks;
DROP POLICY IF EXISTS "Data leads and admins can insert locks" ON public.database_locks;
DROP POLICY IF EXISTS "Data leads and admins can update locks" ON public.database_locks;
DROP POLICY IF EXISTS "Only admins can delete locks" ON public.database_locks;

-- =====================================================================
-- 2. Drop legacy permission functions
-- =====================================================================
DROP FUNCTION IF EXISTS public.is_oversight_role(uuid);
DROP FUNCTION IF EXISTS public.can_view_audit(uuid);
DROP FUNCTION IF EXISTS public.can_sign_forms(uuid);
DROP FUNCTION IF EXISTS public.can_respond_queries(uuid);
DROP FUNCTION IF EXISTS public.can_perform_sdv(uuid);
DROP FUNCTION IF EXISTS public.is_site_role(uuid);
DROP FUNCTION IF EXISTS public.can_enter_data(uuid);
DROP FUNCTION IF EXISTS public.can_export_data(uuid);
DROP FUNCTION IF EXISTS public.can_lock_data(uuid);
DROP FUNCTION IF EXISTS public.can_manage_queries(uuid);
DROP FUNCTION IF EXISTS public.can_design_crf(uuid);
DROP FUNCTION IF EXISTS public.has_any_role(uuid, app_role[]);
DROP FUNCTION IF EXISTS public.has_role_in_project(uuid, app_role, uuid);
DROP FUNCTION IF EXISTS public.has_site_access(uuid, uuid);

-- =====================================================================
-- 3. Drop unused legacy tables
-- =====================================================================
DROP TABLE IF EXISTS public.user_site_access CASCADE;
DROP TABLE IF EXISTS public.database_locks CASCADE;

-- =====================================================================
-- 4. Drop core helpers so we can swap the enum
-- =====================================================================
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_roles(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_module_permission(uuid, module_key, module_action, uuid) CASCADE;

-- =====================================================================
-- 5. Replace app_role enum: keep only admin + collaborator
-- =====================================================================
CREATE TYPE public.app_role_new AS ENUM ('admin', 'collaborator');

ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role_new
  USING (
    CASE
      WHEN role::text = 'admin' THEN 'admin'::public.app_role_new
      ELSE 'collaborator'::public.app_role_new
    END
  );

DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- =====================================================================
-- 6. Recreate helper functions
-- =====================================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS TABLE(role public.app_role, project_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role, project_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND (expires_at IS NULL OR expires_at > now())
$$;

CREATE OR REPLACE FUNCTION public.has_module_permission(
  _user_id uuid, _module module_key, _action module_action, _project_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
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

-- =====================================================================
-- 7. Recreate the policies we dropped (admin-only management + self view)
-- =====================================================================
-- user_roles
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- user_module_permissions
CREATE POLICY "Admins manage all module permissions"
  ON public.user_module_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can view their own module permissions"
  ON public.user_module_permissions FOR SELECT
  USING (user_id = auth.uid());

-- system_audit_log
CREATE POLICY "Admins can view all audit logs"
  ON public.system_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));