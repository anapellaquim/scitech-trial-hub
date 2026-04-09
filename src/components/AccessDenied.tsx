import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { AppRole, Module, Permission, roleLabels } from "@/hooks/usePermission";
import CTMSNav from "@/components/CTMSNav";

interface AccessDeniedProps {
  requiredRoles?: AppRole[];
  module?: Module;
  permission?: Permission;
  title?: string;
  description?: string;
}

const moduleLabels: Record<Module, string> = {
  dashboard: "Dashboard",
  studies: "Estudos",
  visits: "Visitas",
  edc: "EDC",
  etmf: "eTMF",
  regulatory: "Regulatório",
  payments: "Pagamentos",
  users: "Usuários",
  audit: "Audit Trail",
};

const permissionLabels: Record<Permission, string> = {
  read: "visualizar",
  write: "editar",
  delete: "excluir",
  approve: "aprovar",
  full: "gerenciar",
};

const AccessDenied = ({
  requiredRoles,
  module,
  permission,
  title = "Acesso Negado",
  description,
}: AccessDeniedProps) => {
  const getDescription = () => {
    if (description) return description;

    if (requiredRoles && requiredRoles.length > 0) {
      const roles = requiredRoles.map(r => roleLabels[r]).join(", ");
      return `Você precisa ter um dos seguintes papéis para acessar esta página: ${roles}`;
    }

    if (module && permission) {
      return `Você não tem permissão para ${permissionLabels[permission]} no módulo ${moduleLabels[module]}.`;
    }

    return "Você não tem permissão para acessar esta página.";
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
            <CardDescription className="text-base">
              {getDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se você acredita que deveria ter acesso a esta página, entre em contato com um administrador do sistema.
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
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccessDenied;
