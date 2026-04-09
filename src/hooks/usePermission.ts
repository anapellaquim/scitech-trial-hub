import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Application roles - includes both legacy and new EDC-specific roles
 */
export type AppRole = 
  // Legacy roles (kept for backward compatibility)
  | "admin" 
  | "project_manager" 
  | "monitor"  // Legacy - maps to cra_monitor
  | "data_manager" 
  | "regulatory" 
  | "quality" 
  | "finance" 
  | "viewer"
  // New EDC-specific roles
  | "site_coordinator"    // S1 - Site data entry
  | "investigator"        // S2 - PI/Sub-I with signing authority
  | "cra_monitor"         // M1 - CRA/Monitor for SDV and queries
  | "data_lead"           // D2 - Data lead with lock authority
  | "study_builder"       // A1 - CRF designer and study admin
  | "medical_monitor"     // O1 - Medical safety oversight
  | "statistician"        // O2 - Statistical analysis
  | "auditor";            // O3 - Audit/inspection access

export type Module = 
  | "dashboard" 
  | "studies" 
  | "visits" 
  | "edc" 
  | "etmf" 
  | "regulatory" 
  | "payments" 
  | "users"
  | "audit";

export type Permission = "read" | "write" | "delete" | "approve" | "full";

interface UserRole {
  role: AppRole;
  project_id: string | null;
  study_id: string | null;
}

// Permission matrix: what each role can do in each module
const permissionMatrix: Record<AppRole, Record<Module, Permission[]>> = {
  admin: {
    dashboard: ["full"],
    studies: ["full"],
    visits: ["full"],
    edc: ["full"],
    etmf: ["full"],
    regulatory: ["full"],
    payments: ["full"],
    users: ["full"],
    audit: ["full"],
  },
  project_manager: {
    dashboard: ["full"],
    studies: ["full"],
    visits: ["full"],
    edc: ["read"],
    etmf: ["full"],
    regulatory: ["read"],
    payments: ["read"],
    users: ["read"],
    audit: ["read"],
  },
  monitor: {
    dashboard: ["read"],
    studies: ["read"],
    visits: ["full"],
    edc: ["read"],
    etmf: ["read", "write"],
    regulatory: ["read"],
    payments: ["read"],
    users: [],
    audit: [],
  },
  data_manager: {
    dashboard: ["read"],
    studies: ["read"],
    visits: ["read"],
    edc: ["full"],
    etmf: ["read"],
    regulatory: ["read"],
    payments: ["read"],
    users: [],
    audit: [],
  },
  regulatory: {
    dashboard: ["read"],
    studies: ["read"],
    visits: ["read"],
    edc: ["read"],
    etmf: ["full"],
    regulatory: ["full"],
    payments: ["read"],
    users: [],
    audit: [],
  },
  quality: {
    dashboard: ["read"],
    studies: ["read"],
    visits: ["read", "approve"],
    edc: ["read", "approve"],
    etmf: ["full"],
    regulatory: ["read"],
    payments: ["read"],
    users: [],
    audit: ["read"],
  },
  finance: {
    dashboard: ["read"],
    studies: ["read"],
    visits: ["read"],
    edc: ["read"],
    etmf: ["read"],
    regulatory: ["read"],
    payments: ["full"],
    users: [],
    audit: [],
  },
  viewer: {
    dashboard: ["read"],
    studies: ["read"],
    visits: ["read"],
    edc: ["read"],
    etmf: ["read"],
    regulatory: ["read"],
    payments: ["read"],
    users: [],
    audit: [],
  },
  // New EDC-specific roles
  site_coordinator: {
    dashboard: ["read"],
    studies: ["read"],
    visits: ["read"],
    edc: ["read", "write"],
    etmf: ["read"],
    regulatory: [],
    payments: [],
    users: [],
    audit: [],
  },
  investigator: {
    dashboard: ["read"],
    studies: ["read"],
    visits: ["read"],
    edc: ["read", "write", "approve"],
    etmf: ["read"],
    regulatory: [],
    payments: [],
    users: [],
    audit: [],
  },
  cra_monitor: {
    dashboard: ["read"],
    studies: ["read"],
    visits: ["full"],
    edc: ["read"],
    etmf: ["read", "write"],
    regulatory: ["read"],
    payments: ["read"],
    users: [],
    audit: [],
  },
  data_lead: {
    dashboard: ["read"],
    studies: ["read"],
    visits: ["read"],
    edc: ["full"],
    etmf: ["read"],
    regulatory: ["read"],
    payments: ["read"],
    users: [],
    audit: ["read"],
  },
  study_builder: {
    dashboard: ["read"],
    studies: ["read"],
    visits: ["read"],
    edc: ["full"],
    etmf: ["read"],
    regulatory: ["read"],
    payments: [],
    users: ["read", "write"],
    audit: ["read"],
  },
  medical_monitor: {
    dashboard: ["read"],
    studies: ["read"],
    visits: ["read"],
    edc: ["read"],
    etmf: ["read"],
    regulatory: ["read"],
    payments: [],
    users: [],
    audit: [],
  },
  statistician: {
    dashboard: ["read"],
    studies: ["read"],
    visits: ["read"],
    edc: ["read"],
    etmf: ["read"],
    regulatory: ["read"],
    payments: [],
    users: [],
    audit: [],
  },
  auditor: {
    dashboard: ["read"],
    studies: ["read"],
    visits: ["read"],
    edc: ["read"],
    etmf: ["read"],
    regulatory: ["read"],
    payments: [],
    users: [],
    audit: ["read"],
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
        setIsAuthenticated(false);
        setRoles([]);
        setLoading(false);
        return;
      }

      setUserId(session.user.id);
      setIsAuthenticated(true);

      // Get user roles using the RPC function
      const { data: rolesData, error } = await supabase
        .rpc('get_user_roles', { _user_id: session.user.id });

      if (!error && rolesData) {
        setRoles(rolesData as UserRole[]);
      }

      setLoading(false);
    };

    fetchUserRoles();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRoles();
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback((role: AppRole, projectId?: string, studyId?: string): boolean => {
    return roles.some(r => {
      if (r.role !== role) return false;
      
      // Global role (no project/study restriction)
      if (!r.project_id && !r.study_id) return true;
      
      // Project-specific role
      if (projectId && r.project_id === projectId) return true;
      
      // Study-specific role
      if (studyId && r.study_id === studyId) return true;
      
      return false;
    });
  }, [roles]);

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback((checkRoles: AppRole[], projectId?: string, studyId?: string): boolean => {
    return checkRoles.some(role => hasRole(role, projectId, studyId));
  }, [hasRole]);

  /**
   * Check if user can perform an action on a module
   */
  const can = useCallback((permission: Permission, module: Module, projectId?: string, studyId?: string): boolean => {
    // If no roles, user has no permissions
    if (roles.length === 0) return false;

    // Check each role the user has
    for (const userRole of roles) {
      // Check if role applies to this context
      const roleApplies = 
        (!userRole.project_id && !userRole.study_id) || // Global role
        (projectId && userRole.project_id === projectId) || // Project-specific
        (studyId && userRole.study_id === studyId); // Study-specific

      if (!roleApplies) continue;

      const permissions = permissionMatrix[userRole.role]?.[module] || [];
      
      // "full" includes all permissions
      if (permissions.includes("full")) return true;
      
      // Check specific permission
      if (permissions.includes(permission)) return true;
    }

    return false;
  }, [roles]);

  /**
   * Check if user is an admin
   */
  const isAdmin = useCallback((): boolean => {
    return hasRole("admin");
  }, [hasRole]);

  /**
   * Get all roles for current user
   */
  const getUserRoles = useCallback((): AppRole[] => {
    return [...new Set(roles.map(r => r.role))];
  }, [roles]);

  /**
   * Get the highest role for display purposes
   */
  const getPrimaryRole = useCallback((): AppRole | null => {
    const roleHierarchy: AppRole[] = [
      "admin",
      "project_manager",
      "quality",
      "regulatory",
      "data_manager",
      "monitor",
      "finance",
      "viewer",
    ];

    for (const role of roleHierarchy) {
      if (hasRole(role)) return role;
    }

    return null;
  }, [hasRole]);

  return {
    userId,
    roles,
    loading,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    can,
    isAdmin,
    getUserRoles,
    getPrimaryRole,
  };
};

// Role display configuration
export const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  project_manager: "Gerente de Projeto",
  monitor: "Monitor",
  data_manager: "Gerente de Dados",
  regulatory: "Regulatório",
  quality: "Qualidade",
  finance: "Financeiro",
  viewer: "Visualizador",
  // New EDC roles
  site_coordinator: "Coordenador de Site (S1)",
  investigator: "Investigador (S2)",
  cra_monitor: "CRA/Monitor (M1)",
  data_lead: "Líder de Dados (D2)",
  study_builder: "Study Builder (A1)",
  medical_monitor: "Monitor Médico (O1)",
  statistician: "Estatístico (O2)",
  auditor: "Auditor (O3)",
};

export const roleColors: Record<AppRole, string> = {
  admin: "bg-red-500",
  project_manager: "bg-blue-500",
  monitor: "bg-green-500",
  data_manager: "bg-purple-500",
  regulatory: "bg-orange-500",
  quality: "bg-teal-500",
  finance: "bg-yellow-500",
  viewer: "bg-gray-500",
  // New EDC roles
  site_coordinator: "bg-green-600",
  investigator: "bg-blue-600",
  cra_monitor: "bg-orange-600",
  data_lead: "bg-purple-700",
  study_builder: "bg-slate-600",
  medical_monitor: "bg-red-600",
  statistician: "bg-indigo-500",
  auditor: "bg-amber-500",
};
