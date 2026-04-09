import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "viewer";

export type Module = 
  | "dashboard" | "studies" | "visits" | "regulatory" 
  | "payments" | "users" | "audit";

export type Permission = "read" | "write" | "delete" | "approve" | "full";

interface UserRole {
  role: AppRole;
  project_id: string | null;
  study_id: string | null;
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
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const fetchUserRoles = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsAuthenticated(false); setRoles([]); setLoading(false); return;
      }
      setUserId(session.user.id);
      setIsAuthenticated(true);
      const { data: rolesData, error } = await supabase.rpc('get_user_roles', { _user_id: session.user.id });
      if (!error && rolesData) setRoles(rolesData as UserRole[]);
      setLoading(false);
    };

    fetchUserRoles();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { fetchUserRoles(); });
    return () => subscription.unsubscribe();
  }, []);

  const hasRole = useCallback((role: AppRole, projectId?: string, studyId?: string): boolean => {
    return roles.some(r => {
      if (r.role !== role) return false;
      if (!r.project_id && !r.study_id) return true;
      if (projectId && r.project_id === projectId) return true;
      if (studyId && r.study_id === studyId) return true;
      return false;
    });
  }, [roles]);

  const hasAnyRole = useCallback((checkRoles: AppRole[], projectId?: string, studyId?: string): boolean => {
    return checkRoles.some(role => hasRole(role, projectId, studyId));
  }, [hasRole]);

  const can = useCallback((permission: Permission, module: Module, projectId?: string, studyId?: string): boolean => {
    if (roles.length === 0) return false;
    for (const userRole of roles) {
      const roleApplies = (!userRole.project_id && !userRole.study_id) || (projectId && userRole.project_id === projectId) || (studyId && userRole.study_id === studyId);
      if (!roleApplies) continue;
      const permissions = permissionMatrix[userRole.role]?.[module] || [];
      if (permissions.includes("full")) return true;
      if (permissions.includes(permission)) return true;
    }
    return false;
  }, [roles]);

  const isAdmin = useCallback((): boolean => hasRole("admin"), [hasRole]);

  const getUserRoles = useCallback((): AppRole[] => [...new Set(roles.map(r => r.role))], [roles]);

  const getPrimaryRole = useCallback((): AppRole | null => {
    if (hasRole("admin")) return "admin";
    if (hasRole("viewer")) return "viewer";
    return null;
  }, [hasRole]);

  return { userId, roles, loading, isAuthenticated, hasRole, hasAnyRole, can, isAdmin, getUserRoles, getPrimaryRole };
};

export const roleLabels: Record<AppRole, string> = {
  admin: "Administrator",
  viewer: "Collaborator",
};

export const roleColors: Record<AppRole, string> = {
  admin: "bg-red-500",
  viewer: "bg-gray-500",
};
