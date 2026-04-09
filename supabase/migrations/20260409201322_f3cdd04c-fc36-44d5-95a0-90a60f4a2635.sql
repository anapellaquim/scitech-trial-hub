DROP FUNCTION IF EXISTS public.get_user_roles(uuid);

CREATE FUNCTION public.get_user_roles(_user_id uuid)
  RETURNS TABLE(role app_role, project_id uuid)
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT role, project_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND (expires_at IS NULL OR expires_at > now())
$$;