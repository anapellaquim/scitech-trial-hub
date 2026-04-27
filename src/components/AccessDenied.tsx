import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { AppRole, ModuleKey, ModuleAction, MODULE_LABELS, roleLabels } from "@/hooks/usePermission";
import CTMSNav from "@/components/CTMSNav";

interface AccessDeniedProps {
  requiredRoles?: AppRole[];
  module?: ModuleKey;
  action?: ModuleAction;
  title?: string;
  description?: string;
}

const actionLabels: Record<ModuleAction, string> = {
  view: "view",
  create: "create in",
};

const AccessDenied = ({
  requiredRoles,
  module,
  action,
  title = "Access Denied",
  description,
}: AccessDeniedProps) => {
  const getDescription = () => {
    if (description) return description;
    if (requiredRoles && requiredRoles.length > 0) {
      const roles = requiredRoles.map((r) => roleLabels[r]).join(", ");
      return `You need one of the following roles to access this page: ${roles}`;
    }
    if (module && action) {
      return `You don't have permission to ${actionLabels[action]} the ${MODULE_LABELS[module]} module.`;
    }
    return "You don't have permission to access this page.";
  };

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="text-base">{getDescription()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you believe you should have access to this page, contact a system administrator.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button variant="outline" asChild>
                <Link to="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="ghost" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccessDenied;
