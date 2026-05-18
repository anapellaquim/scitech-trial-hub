## Problem
The `site_monitoring_visits` table is missing the `checklist` column that the New Monitoring Visit form tries to save, causing the schema cache error.

## Fix
Add a `checklist` JSONB column to `site_monitoring_visits` via migration.

```sql
ALTER TABLE public.site_monitoring_visits
ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '{}'::jsonb;
```

No code changes needed — `SiteMonitoring.tsx` already reads/writes `checklist` correctly. After the migration runs, Supabase types regenerate and the insert succeeds.