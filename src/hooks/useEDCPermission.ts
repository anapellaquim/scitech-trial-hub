import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * EDC-specific permission types
 * Based on the hierarchical role system for clinical trial EDC
 */
export type EDCPermission =
  | "enter_data"           // S1, S2 - Insert/modify participant data
  | "modify_data"          // S1, S2 - Modify existing data
  | "view_data"            // All roles (with restrictions for site roles)
  | "respond_query"        // S1, S2 - Respond to queries
  | "open_query"           // M1, D1, D2, O1 - Open queries
  | "close_query"          // M1, D1, D2 - Close queries
  | "force_close_query"    // D1, D2 - Force close queries with justification
  | "perform_sdv"          // M1 - Source Data Verification
  | "sign_form"            // S2 - Electronic signatures
  | "finalize_form"        // S2 - Mark forms as complete
  | "lock_data"            // D2 - Database freeze/lock
  | "design_crf"           // A1 - CRF template design
  | "manage_edit_checks"   // D2, A1 - Edit checks management
  | "export_data"          // D1, D2, O2 - Data export
  | "view_metrics"         // S2, M1, D1, D2, A1 - View metrics
  | "view_audit_trail"     // D2, A1, O3 - View audit trail
  | "manage_users";        // A1 - User provisioning

/**
 * EDC role levels
 */
export type EDCRole =
  | "site_coordinator"    // S1 - Site data entry
  | "investigator"        // S2 - PI/Sub-I with signing authority
  | "cra_monitor"         // M1 - CRA/Monitor for SDV and queries
  | "data_manager"        // D1 - Query and data management
  | "data_lead"           // D2 - Data lead with lock authority
  | "study_builder"       // A1 - CRF designer and study admin
  | "medical_monitor"     // O1 - Medical safety oversight
  | "statistician"        // O2 - Statistical analysis
  | "auditor"             // O3 - Audit/inspection access
  | "admin";              // Full access

interface SiteAccess {
  site_id: string;
  project_id: string | null;
  expires_at: string | null;
}

/**
 * Permission matrix mapping roles to EDC permissions
 */
const edcPermissionMatrix: Record<EDCRole, EDCPermission[]> = {
  site_coordinator: [
    "enter_data", "modify_data", "view_data", "respond_query"
  ],
  investigator: [
    "enter_data", "modify_data", "view_data", "respond_query", 
    "sign_form", "finalize_form", "view_metrics"
  ],
  cra_monitor: [
    "view_data", "open_query", "close_query", "perform_sdv", "view_metrics"
  ],
  data_manager: [
    "view_data", "open_query", "close_query", "force_close_query", 
    "export_data", "view_metrics"
  ],
  data_lead: [
    "view_data", "open_query", "close_query", "force_close_query",
    "lock_data", "manage_edit_checks", "export_data", 
    "view_metrics", "view_audit_trail"
  ],
  study_builder: [
    "view_data", "design_crf", "manage_edit_checks", 
    "view_metrics", "view_audit_trail", "manage_users"
  ],
  medical_monitor: [
    "view_data", "open_query"
  ],
  statistician: [
    "view_data", "export_data"
  ],
  auditor: [
    "view_data", "view_audit_trail"
  ],
  admin: [
    "enter_data", "modify_data", "view_data", "respond_query",
    "open_query", "close_query", "force_close_query", "perform_sdv",
    "sign_form", "finalize_form", "lock_data", "design_crf",
    "manage_edit_checks", "export_data", "view_metrics",
    "view_audit_trail", "manage_users"
  ]
};

/**
 * Hook for EDC-specific permissions
 */
export const useEDCPermission = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [edcRoles, setEdcRoles] = useState<EDCRole[]>([]);
  const [siteAccess, setSiteAccess] = useState<SiteAccess[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setEdcRoles([]);
        setSiteAccess([]);
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      // Fetch user roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .or("expires_at.is.null,expires_at.gt.now()");

      if (rolesData) {
        const roles = rolesData.map(r => r.role as EDCRole);
        setEdcRoles([...new Set(roles)]);
      }

      // Fetch site access for site roles
      const { data: siteData } = await supabase
        .from("user_site_access")
        .select("site_id, project_id, expires_at")
        .eq("user_id", session.user.id)
        .or("expires_at.is.null,expires_at.gt.now()");

      if (siteData) {
        setSiteAccess(siteData);
      }

      setLoading(false);
    };

    fetchPermissions();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchPermissions();
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Check if user has a specific EDC permission
   */
  const canEDC = useCallback((permission: EDCPermission, siteId?: string): boolean => {
    if (edcRoles.length === 0) return false;

    // Site roles need site access check
    const siteRoles: EDCRole[] = ["site_coordinator", "investigator"];
    const hasSiteRole = edcRoles.some(r => siteRoles.includes(r));
    
    if (hasSiteRole && siteId) {
      const hasSiteAccess = siteAccess.some(s => s.site_id === siteId);
      if (!hasSiteAccess && !edcRoles.includes("admin")) {
        return false;
      }
    }

    // Check if any of user's roles have the permission
    for (const role of edcRoles) {
      const permissions = edcPermissionMatrix[role] || [];
      if (permissions.includes(permission)) {
        return true;
      }
    }

    return false;
  }, [edcRoles, siteAccess]);

  /**
   * Check if user has site access
   */
  const hasSiteAccess = useCallback((siteId: string): boolean => {
    if (edcRoles.includes("admin")) return true;
    return siteAccess.some(s => s.site_id === siteId);
  }, [edcRoles, siteAccess]);

  /**
   * Check if user is a site-based role (S1/S2)
   */
  const isSiteRole = useCallback((): boolean => {
    const siteRoles: EDCRole[] = ["site_coordinator", "investigator"];
    return edcRoles.some(r => siteRoles.includes(r));
  }, [edcRoles]);

  /**
   * Check if user is an oversight role (O1/O2/O3)
   */
  const isOversightRole = useCallback((): boolean => {
    const oversightRoles: EDCRole[] = ["medical_monitor", "statistician", "auditor"];
    return edcRoles.some(r => oversightRoles.includes(r));
  }, [edcRoles]);

  /**
   * Check if user can enter/modify data
   */
  const canEnterData = useCallback((siteId?: string): boolean => {
    return canEDC("enter_data", siteId);
  }, [canEDC]);

  /**
   * Check if user can sign forms
   */
  const canSignForms = useCallback((): boolean => {
    return canEDC("sign_form");
  }, [canEDC]);

  /**
   * Check if user can perform SDV
   */
  const canPerformSDV = useCallback((): boolean => {
    return canEDC("perform_sdv");
  }, [canEDC]);

  /**
   * Check if user can manage queries
   */
  const canManageQueries = useCallback((): boolean => {
    return canEDC("open_query") || canEDC("close_query");
  }, [canEDC]);

  /**
   * Check if user can respond to queries
   */
  const canRespondQueries = useCallback((siteId?: string): boolean => {
    return canEDC("respond_query", siteId);
  }, [canEDC]);

  /**
   * Check if user can design CRF templates
   */
  const canDesignCRF = useCallback((): boolean => {
    return canEDC("design_crf");
  }, [canEDC]);

  /**
   * Check if user can export data
   */
  const canExportData = useCallback((): boolean => {
    return canEDC("export_data");
  }, [canEDC]);

  /**
   * Check if user can lock/freeze data
   */
  const canLockData = useCallback((): boolean => {
    return canEDC("lock_data");
  }, [canEDC]);

  /**
   * Check if user can view audit trail
   */
  const canViewAuditTrail = useCallback((): boolean => {
    return canEDC("view_audit_trail");
  }, [canEDC]);

  /**
   * Get all EDC permissions for current user
   */
  const getPermissions = useCallback((): EDCPermission[] => {
    const permissions = new Set<EDCPermission>();
    for (const role of edcRoles) {
      const rolePerms = edcPermissionMatrix[role] || [];
      rolePerms.forEach(p => permissions.add(p));
    }
    return [...permissions];
  }, [edcRoles]);

  /**
   * Get user's accessible sites
   */
  const getAccessibleSites = useCallback((): string[] => {
    if (edcRoles.includes("admin")) return []; // Admin has global access
    return siteAccess.map(s => s.site_id);
  }, [edcRoles, siteAccess]);

  return {
    userId,
    edcRoles,
    siteAccess,
    loading,
    canEDC,
    hasSiteAccess,
    isSiteRole,
    isOversightRole,
    canEnterData,
    canSignForms,
    canPerformSDV,
    canManageQueries,
    canRespondQueries,
    canDesignCRF,
    canExportData,
    canLockData,
    canViewAuditTrail,
    getPermissions,
    getAccessibleSites,
  };
};

/**
 * Role labels for display
 */
export const edcRoleLabels: Record<EDCRole, string> = {
  site_coordinator: "Coordenador de Site (S1)",
  investigator: "Investigador (S2)",
  cra_monitor: "CRA/Monitor (M1)",
  data_manager: "Gerente de Dados (D1)",
  data_lead: "Líder de Dados (D2)",
  study_builder: "Study Builder (A1)",
  medical_monitor: "Monitor Médico (O1)",
  statistician: "Estatístico (O2)",
  auditor: "Auditor (O3)",
  admin: "Administrador",
};

/**
 * Role descriptions for display
 */
export const edcRoleDescriptions: Record<EDCRole, string> = {
  site_coordinator: "Entrada de dados de pacientes, responde queries",
  investigator: "S1 + assinaturas eletrônicas, finalizar formulários",
  cra_monitor: "Leitura, SDV, abrir/fechar queries",
  data_manager: "Gestão de queries, exportar datasets",
  data_lead: "D1 + congelar dados, edit checks, audit trail",
  study_builder: "Configurar CRFs, provisionar usuários",
  medical_monitor: "Leitura com cegamento, queries médicas",
  statistician: "Leitura, exportação validada",
  auditor: "Leitura temporária, audit trail",
  admin: "Acesso total ao sistema",
};

/**
 * Role colors for badges
 */
export const edcRoleColors: Record<EDCRole, string> = {
  site_coordinator: "bg-green-500",
  investigator: "bg-blue-500",
  cra_monitor: "bg-orange-500",
  data_manager: "bg-purple-500",
  data_lead: "bg-purple-700",
  study_builder: "bg-gray-600",
  medical_monitor: "bg-red-500",
  statistician: "bg-indigo-500",
  auditor: "bg-yellow-500",
  admin: "bg-red-600",
};

/**
 * Role icons (lucide icon names)
 */
export const edcRoleIcons: Record<EDCRole, string> = {
  site_coordinator: "ClipboardEdit",
  investigator: "Stethoscope",
  cra_monitor: "Search",
  data_manager: "Database",
  data_lead: "Crown",
  study_builder: "Settings",
  medical_monitor: "Heart",
  statistician: "BarChart3",
  auditor: "Shield",
  admin: "ShieldCheck",
};
