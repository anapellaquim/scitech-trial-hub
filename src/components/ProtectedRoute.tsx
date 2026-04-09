import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermission, AppRole, Module, Permission } from "@/hooks/usePermission";
import { Skeleton } from "@/components/ui/skeleton";
import AccessDenied from "@/components/AccessDenied";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: AppRole[];
  requiredPermission?: {
    permission: Permission;
    module: Module;
  };
  projectId?: string;
  studyId?: string;
  fallback?: ReactNode;
}

/**
 * ProtectedRoute component that checks user permissions before rendering children.
 * 
 * Usage:
 * - With required roles: <ProtectedRoute requiredRoles={["admin", "project_manager"]}>
 * - With required permission: <ProtectedRoute requiredPermission={{ permission: "write", module: "studies" }}>
 * - With project context: <ProtectedRoute requiredRoles={["monitor"]} projectId={projectId}>
 */
const ProtectedRoute = ({
  children,
  requiredRoles,
  requiredPermission,
  projectId,
  studyId,
  fallback,
}: ProtectedRouteProps) => {
  const { loading, isAuthenticated, hasAnyRole, can } = usePermission();

  // Show loading state while checking permissions
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Check role-based access
  if (requiredRoles && requiredRoles.length > 0) {
    const hasAccess = hasAnyRole(requiredRoles, projectId, studyId);
    if (!hasAccess) {
      return fallback || <AccessDenied requiredRoles={requiredRoles} />;
    }
  }

  // Check permission-based access
  if (requiredPermission) {
    const { permission, module } = requiredPermission;
    const hasAccess = can(permission, module, projectId, studyId);
    if (!hasAccess) {
      return fallback || <AccessDenied module={module} permission={permission} />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
