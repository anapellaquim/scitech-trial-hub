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
  fallback?: ReactNode;
}

const ProtectedRoute = ({
  children,
  requiredRoles,
  requiredPermission,
  projectId,
  fallback,
}: ProtectedRouteProps) => {
  const { loading, isAuthenticated, hasAnyRole, can } = usePermission();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const hasAccess = hasAnyRole(requiredRoles, projectId);
    if (!hasAccess) {
      return fallback || <AccessDenied requiredRoles={requiredRoles} />;
    }
  }

  if (requiredPermission) {
    const { permission, module } = requiredPermission;
    const hasAccess = can(permission, module, projectId);
    if (!hasAccess) {
      return fallback || <AccessDenied module={module} permission={permission} />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
