-- Phase 1: Add missing fields from studies to projects
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS protocol_number TEXT,
ADD COLUMN IF NOT EXISTS therapeutic_area TEXT,
ADD COLUMN IF NOT EXISTS phase TEXT;

-- Phase 2: Update tables to remove study_id references

-- 2.1 checklist_templates - remove study_id
ALTER TABLE public.checklist_templates DROP CONSTRAINT IF EXISTS checklist_templates_study_id_fkey;
ALTER TABLE public.checklist_templates DROP COLUMN IF EXISTS study_id;

-- 2.2 crf_templates - remove study_id (keep project_id)
ALTER TABLE public.crf_templates DROP CONSTRAINT IF EXISTS crf_templates_study_id_fkey;
ALTER TABLE public.crf_templates DROP COLUMN IF EXISTS study_id;

-- 2.3 regulatory_flow_steps - remove study_id
ALTER TABLE public.regulatory_flow_steps DROP CONSTRAINT IF EXISTS regulatory_flow_steps_study_id_fkey;
ALTER TABLE public.regulatory_flow_steps DROP COLUMN IF EXISTS study_id;

-- 2.4 regulatory_reports - remove study_id
ALTER TABLE public.regulatory_reports DROP CONSTRAINT IF EXISTS regulatory_reports_study_id_fkey;
ALTER TABLE public.regulatory_reports DROP COLUMN IF EXISTS study_id;

-- 2.5 regulatory_submissions - remove study_id
ALTER TABLE public.regulatory_submissions DROP CONSTRAINT IF EXISTS regulatory_submissions_study_id_fkey;
ALTER TABLE public.regulatory_submissions DROP COLUMN IF EXISTS study_id;

-- 2.6 study_forms - remove study_id, ensure project_id exists
ALTER TABLE public.study_forms DROP CONSTRAINT IF EXISTS study_forms_study_id_fkey;
ALTER TABLE public.study_forms DROP COLUMN IF EXISTS study_id;

-- 2.7 task_templates - remove study_id
ALTER TABLE public.task_templates DROP CONSTRAINT IF EXISTS task_templates_study_id_fkey;
ALTER TABLE public.task_templates DROP COLUMN IF EXISTS study_id;

-- 2.8 tasks - remove study_id
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_study_id_fkey;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS study_id;

-- Phase 3: Update study_* tables to use project_id instead of study_id

-- 3.1 study_sites - add project_id, remove study_id
ALTER TABLE public.study_sites ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.study_sites DROP CONSTRAINT IF EXISTS study_sites_study_id_fkey;
ALTER TABLE public.study_sites DROP COLUMN IF EXISTS study_id;

-- 3.2 study_tasks - add project_id, remove study_id
ALTER TABLE public.study_tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.study_tasks DROP CONSTRAINT IF EXISTS study_tasks_study_id_fkey;
ALTER TABLE public.study_tasks DROP COLUMN IF EXISTS study_id;

-- 3.3 study_visits - already has project_id, remove study_id
ALTER TABLE public.study_visits DROP CONSTRAINT IF EXISTS study_visits_study_id_fkey;
ALTER TABLE public.study_visits DROP COLUMN IF EXISTS study_id;

-- Phase 4: Update user_roles if it has study_id
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_study_id_fkey;
ALTER TABLE public.user_roles DROP COLUMN IF EXISTS study_id;

-- Phase 5: Drop the studies table
DROP TABLE IF EXISTS public.studies CASCADE;