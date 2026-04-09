

## Fix: Settings Tab Not Visible — Broken `get_user_roles` Function

### Problem
The `get_user_roles` database function references a `study_id` column that doesn't exist in the `user_roles` table. This causes the RPC call in `usePermission` to fail silently, so the user's roles never load, and the Settings tab never appears.

### Solution

**1. Fix the `get_user_roles` database function** (migration)

Update the function to only return columns that exist (`role`, `project_id`), removing the `study_id` reference:

```sql
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
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
```

**2. Update `src/hooks/usePermission.ts`**

Remove `study_id` from the `UserRole` interface and all references to `studyId` parameters, since the table doesn't have that column. Simplify `hasRole`, `hasAnyRole`, and `can` to only scope by `projectId`.

### Impact
- 1 database migration (fix function)
- 1 file edited (`usePermission.ts`)
- Settings tab will appear for aalmeida@scitechmed.com immediately after fix

