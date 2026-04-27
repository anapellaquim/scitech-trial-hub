# Improve CTMS Module Visualization

Replace the cluttered horizontal top bar (18 items competing for space) with a **collapsible left sidebar** that groups modules by workflow phase. Modules become easier to find, the workspace gains horizontal real estate, and a mini icon-only mode keeps navigation always accessible.

## What the user will see

- **Left sidebar** with the CTMS logo at the top and a sign-out button at the bottom.
- Modules grouped into 6 collapsible sections (each with a label and an icon-led list):
  - **Overview** — Dashboard, Communications
  - **Planning** — Studies, Agenda, Tasks
  - **Execution** — Visits, Site Monitoring, PMCF Survey
  - **Quality & Compliance** — Qualifications, Trainings, Change Control, Risks
  - **Governance** — Committees, Steering, Regulatory
  - **Operations** — Payments, Library
  - **Settings** (admins only)
- Active route highlighted; the group containing the active route auto-expands.
- A **SidebarTrigger** in a slim top header lets the user collapse the sidebar to an icon-only rail (still clickable, with tooltips showing labels).
- Main content area gains full width when collapsed.

## Technical changes

1. **New `src/components/AppSidebar.tsx`**
   - Uses shadcn `Sidebar` with `collapsible="icon"`.
   - Defines grouped module config (label + icon + route + admin-only flag).
   - Uses `usePermission` to conditionally render Settings group.
   - Uses `NavLink` / `useLocation` for active highlighting; auto-expands the group containing the active route via `defaultOpen`.
   - Tooltips on items when collapsed.

2. **New `src/components/AppLayout.tsx`**
   - Wraps children with `SidebarProvider` + `AppSidebar` + a thin top header containing `SidebarTrigger` and the sign-out button.
   - Replaces the role currently played by `CTMSNav` inside each page.

3. **Refactor pages to use `AppLayout`**
   - `src/components/shared/ModulePageLayout.tsx`: swap `<CTMSNav />` for `<AppLayout>` wrapper (keeps the page title, GlobalStudySelector, export button, and actions row unchanged).
   - Pages that render `CTMSNav` directly (Dashboard, Auth-protected pages like Settings, AdminUsers, AdminAudit, Communications, Tasks, Projects, Visits, etc.): replace `<CTMSNav />` with `<AppLayout>` wrapping their `<main>` content. No business logic changes.
   - `CTMSNav.tsx` is kept temporarily as deprecated, then removed once all references are updated.

4. **No route changes** — all existing paths in `App.tsx` stay the same.

5. **Responsive behavior**
   - Desktop: sidebar expanded by default (256px), collapsible to ~56px icon rail.
   - Mobile: sidebar becomes an off-canvas sheet triggered by the header button.

## Out of scope

- No changes to module business logic, data, or routes.
- No new modules added or removed.
- Dashboard layout itself (cards/KPIs) is untouched — only the surrounding chrome changes.
