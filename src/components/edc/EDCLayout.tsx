import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { EDCSidebar } from "./EDCSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const routeTitles: Record<string, string> = {
  "/edc": "Dashboard",
  "/edc/participants": "Participantes",
  "/edc/queries": "Queries",
  "/edc/safety": "Eventos de Segurança",
  "/edc/deviations": "Desvios de Protocolo",
  "/edc/templates": "Templates CRF",
  "/edc/entries": "Formulários",
};

export function EDCLayout() {
  const { t } = useTranslation(["edc"]);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const currentTitle = routeTitles[location.pathname] || "EDC";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <EDCSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/edc">EDC</BreadcrumbLink>
                </BreadcrumbItem>
                {location.pathname !== "/edc" && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{currentTitle}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                {t("sidebar.logout", "Sair")}
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
