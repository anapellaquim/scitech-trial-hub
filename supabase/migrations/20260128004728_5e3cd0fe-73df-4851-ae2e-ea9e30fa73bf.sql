-- =====================================================
-- EDC Role-Based Access Control System Migration - Part 2
-- RLS Policies and Helper Functions
-- =====================================================

-- 1. Create helper functions using TEXT comparison for new enum values

-- Check if user has site access
CREATE OR REPLACE FUNCTION public.has_site_access(_user_id uuid, _site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_site_access
    WHERE user_id = _user_id
      AND site_id = _site_id
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Check if user can sign forms (S2 - Investigator only)
CREATE OR REPLACE FUNCTION public.can_sign_forms(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('investigator', 'admin')
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Check if user can lock data (D2 - Data Lead only)
CREATE OR REPLACE FUNCTION public.can_lock_data(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('data_lead', 'admin')
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Check if user can export data (D1, D2, O2)
CREATE OR REPLACE FUNCTION public.can_export_data(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('data_manager', 'data_lead', 'statistician', 'admin')
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Check if user can enter/modify data (S1, S2 only)
CREATE OR REPLACE FUNCTION public.can_enter_data(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('site_coordinator', 'investigator', 'admin')
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Check if user can perform SDV (M1 only)
CREATE OR REPLACE FUNCTION public.can_perform_sdv(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('cra_monitor', 'admin')
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Check if user can manage queries (D1, D2, M1, O1)
CREATE OR REPLACE FUNCTION public.can_manage_queries(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('cra_monitor', 'data_manager', 'data_lead', 'medical_monitor', 'admin')
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Check if user can respond to queries (S1, S2 only)
CREATE OR REPLACE FUNCTION public.can_respond_queries(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('site_coordinator', 'investigator', 'admin')
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Check if user can design CRF (A1 only)
CREATE OR REPLACE FUNCTION public.can_design_crf(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('study_builder', 'admin')
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Check if user can view audit trail (D2, A1, O3)
CREATE OR REPLACE FUNCTION public.can_view_audit(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('data_lead', 'study_builder', 'auditor', 'admin')
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Check if user is a site role (S1, S2)
CREATE OR REPLACE FUNCTION public.is_site_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('site_coordinator', 'investigator')
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Check if user is oversight role (O1, O2, O3)
CREATE OR REPLACE FUNCTION public.is_oversight_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('medical_monitor', 'statistician', 'auditor')
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- 2. RLS Policies for user_site_access table

-- Policy: Users can view their own site access
CREATE POLICY "Users can view their own site access"
ON public.user_site_access FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.can_design_crf(auth.uid())
);

-- Policy: Admins and study builders can insert site access
CREATE POLICY "Admins and study builders can insert site access"
ON public.user_site_access FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.can_design_crf(auth.uid())
);

-- Policy: Admins and study builders can update site access
CREATE POLICY "Admins and study builders can update site access"
ON public.user_site_access FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.can_design_crf(auth.uid())
);

-- Policy: Admins and study builders can delete site access
CREATE POLICY "Admins and study builders can delete site access"
ON public.user_site_access FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.can_design_crf(auth.uid())
);

-- 3. RLS Policies for database_locks table

-- Policy: Authorized users can view locks
CREATE POLICY "Authorized users can view locks"
ON public.database_locks FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.can_lock_data(auth.uid())
  OR public.can_design_crf(auth.uid())
);

-- Policy: Data leads and admins can insert locks
CREATE POLICY "Data leads and admins can insert locks"
ON public.database_locks FOR INSERT
WITH CHECK (
  public.can_lock_data(auth.uid())
);

-- Policy: Data leads and admins can update locks
CREATE POLICY "Data leads and admins can update locks"
ON public.database_locks FOR UPDATE
USING (
  public.can_lock_data(auth.uid())
);

-- Policy: Only admins can delete locks
CREATE POLICY "Only admins can delete locks"
ON public.database_locks FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
);