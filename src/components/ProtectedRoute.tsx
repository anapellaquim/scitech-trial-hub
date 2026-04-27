import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermission, AppRole, ModuleKey, ModuleAction } from "@/hooks/usePermission";
import { Skeleton } from "@/components/ui/skeleton";
import AccessDenied from "@/components/AccessDenied";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: AppRole[];
  requiredPermission?: {
    action: ModuleAction;
    module: ModuleKey;
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
  const { loading, isAuthenticated, hasRole, canModule } = usePermission();

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
    const hasAccess = requiredRoles.some((r) => hasRole(r, projectId));
    if (!hasAccess) {
      return fallback || <AccessDenied requiredRoles={requiredRoles} />;
    }
  }

  if (requiredPermission) {
    const { action, module } = requiredPermission;
    if (!canModule(module, action, projectId)) {
      return fallback || <AccessDenied module={module} action={action} />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
