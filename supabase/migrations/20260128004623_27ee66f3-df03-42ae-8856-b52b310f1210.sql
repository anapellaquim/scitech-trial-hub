-- =====================================================
-- EDC Role-Based Access Control System Migration - Part 1
-- Add new enum values (must be committed before use)
-- =====================================================

-- 1. Add new app_role enum values for EDC-specific roles
DO $$
BEGIN
  -- S1 - Site Coordinator
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'app_role'::regtype AND enumlabel = 'site_coordinator') THEN
    ALTER TYPE app_role ADD VALUE 'site_coordinator';
  END IF;
  -- S2 - Investigator (PI/Sub-I)
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'app_role'::regtype AND enumlabel = 'investigator') THEN
    ALTER TYPE app_role ADD VALUE 'investigator';
  END IF;
  -- M1 - CRA/Monitor
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'app_role'::regtype AND enumlabel = 'cra_monitor') THEN
    ALTER TYPE app_role ADD VALUE 'cra_monitor';
  END IF;
  -- D2 - Data Lead
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'app_role'::regtype AND enumlabel = 'data_lead') THEN
    ALTER TYPE app_role ADD VALUE 'data_lead';
  END IF;
  -- A1 - Study Builder
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'app_role'::regtype AND enumlabel = 'study_builder') THEN
    ALTER TYPE app_role ADD VALUE 'study_builder';
  END IF;
  -- O1 - Medical Monitor
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'app_role'::regtype AND enumlabel = 'medical_monitor') THEN
    ALTER TYPE app_role ADD VALUE 'medical_monitor';
  END IF;
  -- O2 - Statistician
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'app_role'::regtype AND enumlabel = 'statistician') THEN
    ALTER TYPE app_role ADD VALUE 'statistician';
  END IF;
  -- O3 - Auditor
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'app_role'::regtype AND enumlabel = 'auditor') THEN
    ALTER TYPE app_role ADD VALUE 'auditor';
  END IF;
END $$;

-- 2. Create user_site_access table for site-level permissions
CREATE TABLE IF NOT EXISTS public.user_site_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.research_centers(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, site_id)
);

-- 3. Create database_locks table for data freeze/lock operations
CREATE TABLE IF NOT EXISTS public.database_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  lock_type text NOT NULL CHECK (lock_type IN ('soft_lock', 'hard_lock', 'freeze')),
  lock_scope text NOT NULL CHECK (lock_scope IN ('full', 'site', 'participant', 'form')),
  scope_id uuid,
  locked_by uuid NOT NULL REFERENCES auth.users(id),
  locked_at timestamptz NOT NULL DEFAULT now(),
  unlocked_by uuid REFERENCES auth.users(id),
  unlocked_at timestamptz,
  reason text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Add access_type to user_roles for temporary access (auditors)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'access_type'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN access_type text NOT NULL DEFAULT 'permanent' 
      CHECK (access_type IN ('permanent', 'temporary'));
  END IF;
END $$;

-- 5. Enable RLS on new tables
ALTER TABLE public.user_site_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_locks ENABLE ROW LEVEL SECURITY;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_site_access_user_id ON public.user_site_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_site_access_site_id ON public.user_site_access(site_id);
CREATE INDEX IF NOT EXISTS idx_database_locks_project_id ON public.database_locks(project_id);
CREATE INDEX IF NOT EXISTS idx_database_locks_active ON public.database_locks(is_active) WHERE is_active = true;

-- 7. Grant permissions
GRANT ALL ON public.user_site_access TO authenticated;
GRANT ALL ON public.database_locks TO authenticated;