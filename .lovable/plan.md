# Manage Module Permissions per User

Allow admins to grant **view** and **create** access on each CTMS module to individual users from Settings → "Manage Users & Permissions". Also fixes the **infinite-recursion RLS error** on `user_roles` that currently breaks the page.

## What the user will see

Inside **Settings → Manage Users & Permissions**, each user row gains a new **"Permissions"** action button that opens a **Module Permissions** dialog:

- A grid of all CTMS modules (Dashboard, Communications, Studies, Agenda, Tasks, Visits, Site Monitoring, PMCF Survey, Qualifications, Trainings, Change Control, Risks, Committees, Steering, Regulatory, Payments, Library).
- Each module row has two checkboxes: **View** and **Create**.
  - Checking **Create** auto-checks **View** (you can't create without seeing).
- Optional **scope** selector at the top: *Global* or *Specific project*.
- "Save" persists changes; the dialog shows the current state.
- An **Administrator** badge at the top of the dialog: if the user already has the global `admin` role, all modules are shown as fully granted (read-only) with a note that admins always have full access.

The existing **Assign Role** dialog still works for granting `admin` / `viewer`. The new dialog manages **fine-grained module permissions** independently.

The sidebar (`CTMSNav`) gains per-module hiding: a non-admin user only sees module groups for which they have at least **view** permission. Admins continue to see everything.

## Technical plan

### 1. Fix RLS recursion on `user_roles` (migration)

The current `Project managers can view roles in their projects` policy self-queries `user_roles`, causing recursion. Replace with a security-definer helper.

```sql
-- New helper (no recursion: SECURITY DEFINER bypasses RLS)
create or replace function public.user_has_role_in_project(_user_id uuid, _project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and project_id = _project_id
      and (expires_at is null or expires_at > now())
  )
$$;

drop policy "Project managers can view roles in their projects" on public.user_roles;
create policy "Project managers can view roles in their projects"
  on public.user_roles for select using (
    public.has_role(auth.uid(), 'project_manager')
    and (project_id is null or public.user_has_role_in_project(auth.uid(), project_id))
  );
```

### 2. New table `user_module_permissions` (migration)

```sql
create type public.module_key as enum (
  'dashboard','communications','projects','agenda','tasks',
  'visits','site_monitoring','pmcf_survey',
  'qualifications','trainings','change_control','risks',
  'committees','steering','regulatory','payments','library'
);

create type public.module_action as enum ('view','create');

create table public.user_module_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module module_key not null,
  action module_action not null,
  project_id uuid references public.projects(id) on delete cascade,
  granted_by uuid,
  granted_at timestamptz not null default now(),
  unique (user_id, module, action, project_id)
);

alter table public.user_module_permissions enable row level security;

-- Admins manage everything; users can read their own permissions
create policy "Admins manage all module permissions" on public.user_module_permissions
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Users view their own module permissions" on public.user_module_permissions
  for select using (user_id = auth.uid());
```

Plus a security-definer helper for the client/UI to check:

```sql
create or replace function public.has_module_permission(_user_id uuid, _module module_key, _action module_action, _project_id uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'admin')
      or exists (
        select 1 from public.user_module_permissions
        where user_id = _user_id and module = _module and action = _action
          and (project_id is null or project_id = _project_id)
      )
      -- create implies view
      or (_action = 'view' and exists (
        select 1 from public.user_module_permissions
        where user_id = _user_id and module = _module and action = 'create'
          and (project_id is null or project_id = _project_id)
      ))
$$;

create or replace function public.get_user_module_permissions(_user_id uuid)
returns table(module module_key, action module_action, project_id uuid)
language sql stable security definer set search_path = public as $$
  select module, action, project_id from public.user_module_permissions where user_id = _user_id
$$;
```

### 3. Frontend changes

- **New dialog** `src/components/admin/ModulePermissionsDialog.tsx`
  - Loads existing permissions for the selected user (`get_user_module_permissions` RPC).
  - Renders a table: rows = modules, columns = `View` | `Create` checkboxes, plus a global scope selector.
  - "Save" diffs against the loaded state and performs `insert` / `delete` on `user_module_permissions`.
  - If the user is an admin, render a banner "This user is an administrator and has full access" and disable checkboxes.

- **`AdminUsers.tsx`**: add a `ShieldCheck`-icon button per row labelled "Permissions" that opens the new dialog. Keeps the existing "Role" button for granting admin/viewer.

- **`usePermission.ts`**: extend with `canModule(module, action, projectId?)` that consults a cached map fetched once via `get_user_module_permissions`. Admins always return `true`.

- **`CTMSNav.tsx`**: replace the static `adminOnly` gating with a check via `canModule(item.module, 'view')`. Each `NavItem` gets a `module` field. Items the user can't view are hidden (default), or disabled with tooltip if `restrictMode='disable'`.

- **Module pages** (e.g., create buttons in Tasks, Visits, etc.): wrap the "New …" buttons with a `canModule(module, 'create')` check that hides or disables them. (Initial pass: hide for clarity.)

### 4. Out of scope (this iteration)

- Editing/deleting permissions per record (only "view" and "create" — no separate "edit"/"delete" actions yet).
- Bulk-edit across multiple users.
- Server-side enforcement on each module's data tables — that requires per-table RLS policy changes and is a larger effort. This iteration enforces in the **UI + a single helper RPC**, which is the visible scope of "manage access to modules and actions".

A follow-up plan can wire `has_module_permission` into per-table RLS for true server-side enforcement.
