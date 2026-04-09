

## Plan: Remove EDC and eTMF Modules — CTMS-Only Platform

### Summary
Remove all EDC and eTMF code, routes, components, pages, hooks, i18n files, and navigation. The Home page module selector will be replaced — the root `/` route will go directly to the CTMS Dashboard. All `/ctms/*` routes will be moved to the root level (e.g., `/projects`, `/tasks`).

### Changes

#### 1. Update `src/App.tsx`
- Remove all EDC and eTMF imports and routes
- Change `/` to render `Dashboard` directly (remove Home page)
- Move CTMS routes from `/ctms/*` to root level (`/`, `/projects`, `/tasks`, `/centers`, etc.)
- Keep legacy route redirects working

#### 2. Delete Files (pages, components, hooks, i18n)

**Pages to delete:**
- `src/pages/Home.tsx`
- `src/pages/EDC.tsx`, `src/pages/EDCDesigner.tsx`, `src/pages/CRFDataEntry.tsx`, `src/pages/CRFEntryList.tsx`
- `src/pages/edc/` (entire directory — 7 files)
- `src/pages/ETMF.tsx`, `src/pages/ETMFDocument.tsx`

**Components to delete:**
- `src/components/edc/` (entire directory — 21 files)
- `src/components/etmf/` (entire directory — 2 files)
- `src/components/EDCNav.tsx`
- `src/components/ETMFNav.tsx`
- `src/components/visits/` (if only used by EDC visits)

**Hooks to delete:**
- `src/hooks/useEDCPermission.ts`
- `src/hooks/useCRFExport.ts`

**i18n files to delete (en + pt-BR):**
- `edc.json`, `etmf.json`, `home.json`

#### 3. Update `src/i18n/index.ts`
- Remove `edc`, `etmf`, `home` namespace imports

#### 4. Update `src/components/CTMSNav.tsx`
- Update all nav links from `/ctms/*` to root-level paths (`/`, `/projects`, etc.)
- Remove any references to EDC/eTMF

#### 5. Update navigation i18n
- Remove `edc` and `etmf` keys from `navigation.json` (en + pt-BR)

#### 6. Update pages that reference `/ctms/*` paths
- All CTMS pages using CTMSNav and linking to `/ctms/*` paths will be updated to use root-level paths

#### 7. Update `src/pages/Visits.tsx` and `src/pages/VisitReport.tsx`
- These pages import `EDCNav` — will be updated to use `CTMSNav` instead, as visits are part of CTMS

### Technical Details
- ~40 files deleted, ~10 files modified
- No database changes needed (tables remain, just UI removed)
- Edge function `generate-alerts` is unrelated and stays

