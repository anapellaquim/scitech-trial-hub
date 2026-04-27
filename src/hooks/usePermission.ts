import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "viewer";

export type Module = 
  | "dashboard" | "studies" | "visits" | "regulatory" 
  | "payments" | "users" | "audit";

export type Permission = "read" | "write" | "delete" | "approve" | "full";

// Module-level permission system (matches DB enum module_key)
export type ModuleKey =
  | "dashboard" | "communications" | "projects" | "agenda" | "tasks"
  | "visits" | "site_monitoring" | "pmcf_survey"
  | "qualifications" | "trainings" | "change_control" | "risks"
  | "committees" | "steering" | "regulatory" | "payments" | "library";

export type ModuleAction = "view" | "create";

export const MODULE_KEYS: ModuleKey[] = [
  "dashboard", "communications", "projects", "agenda", "tasks",
  "visits", "site_monitoring", "pmcf_survey",
  "qualifications", "trainings", "change_control", "risks",
  "committees", "steering", "regulatory", "payments", "library",
];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  communications: "Communications",
  projects: "Studies",
  agenda: "Agenda",
  tasks: "Tasks",
  visits: "Visits",
  site_monitoring: "Site Monitoring",
  pmcf_survey: "PMCF Survey",
  qualifications: "Qualifications",
  trainings: "Trainings",
  change_control: "Change Control",
  risks: "Risks",
  committees: "Committees",
  steering: "Steering",
  regulatory: "Regulatory",
  payments: "Payments",
  library: "Library",
};

interface UserRole {
  role: AppRole;
  project_id: string | null;
}

interface ModulePermissionRow {
  module: ModuleKey;
  action: ModuleAction;
  project_id: string | null;
}

const permissionMatrix: Record<AppRole, Record<Module, Permission[]>> = {
  admin: {
    dashboard: ["full"], studies: ["full"], visits: ["full"],
    regulatory: ["full"], payments: ["full"], users: ["full"], audit: ["full"],
  },
  viewer: {
    dashboard: ["read"], studies: ["read"], visits: ["read"],
    regulatory: ["read"], payments: ["read"], users: [], audit: [],
  },
};

export const usePermission = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [modulePerms, setModulePerms] = useState<ModulePermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const fetchUserRoles = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsAuthenticated(false); setRoles([]); setModulePerms([]); setLoading(false); return;
      }
      setUserId(session.user.id);
      setIsAuthenticated(true);
      const [{ data: rolesData, error: rolesErr }, { data: permsData, error: permsErr }] = await Promise.all([
        supabase.rpc('get_user_roles', { _user_id: session.user.id }),
        supabase.rpc('get_user_module_permissions', { _user_id: session.user.id }),
      ]);
      if (!rolesErr && rolesData) setRoles(rolesData as UserRole[]);
      if (!permsErr && permsData) setModulePerms(permsData as ModulePermissionRow[]);
      setLoading(false);
    };

    fetchUserRoles();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { fetchUserRoles(); });
    return () => subscription.unsubscribe();
  }, []);

  const hasRole = useCallback((role: AppRole, projectId?: string): boolean => {
    return roles.some(r => {
      if (r.role !== role) return false;
      if (!r.project_id) return true;
      if (projectId && r.project_id === projectId) return true;
      return false;
    });
  }, [roles]);

  const hasAnyRole = useCallback((checkRoles: AppRole[], projectId?: string): boolean => {
    return checkRoles.some(role => hasRole(role, projectId));
  }, [hasRole]);

  const can = useCallback((permission: Permission, module: Module, projectId?: string): boolean => {
    if (roles.length === 0) return false;
    for (const userRole of roles) {
      const roleApplies = !userRole.project_id || (projectId && userRole.project_id === projectId);
      if (!roleApplies) continue;
      const permissions = permissionMatrix[userRole.role]?.[module] || [];
      if (permissions.includes("full")) return true;
      if (permissions.includes(permission)) return true;
    }
    return false;
  }, [roles]);

  const isAdmin = useCallback((): boolean => hasRole("admin"), [hasRole]);

  // Module-level permission check (view / create)
  const canModule = useCallback(
    (module: ModuleKey, action: ModuleAction, projectId?: string): boolean => {
      if (isAdmin()) return true;
      const matches = (row: ModulePermissionRow) =>
        row.module === module &&
        (row.project_id === null || (projectId && row.project_id === projectId));
      // Direct grant
      if (modulePerms.some((r) => matches(r) && r.action === action)) return true;
      // create implies view
      if (action === "view" && modulePerms.some((r) => matches(r) && r.action === "create")) return true;
      return false;
    },
    [isAdmin, modulePerms]
  );

  const getUserRoles = useCallback((): AppRole[] => [...new Set(roles.map(r => r.role))], [roles]);

  const getPrimaryRole = useCallback((): AppRole | null => {
    if (hasRole("admin")) return "admin";
    if (hasRole("viewer")) return "viewer";
    return null;
  }, [hasRole]);

  return { userId, roles, modulePerms, loading, isAuthenticated, hasRole, hasAnyRole, can, canModule, isAdmin, getUserRoles, getPrimaryRole };
};

export const roleLabels: Record<AppRole, string> = {
  admin: "Administrator",
  viewer: "Collaborator",
};

export const roleColors: Record<AppRole, string> = {
  admin: "bg-red-500",
  viewer: "bg-gray-500",
};
