import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  MessageCircleQuestion,
  ShieldAlert,
  AlertTriangle,
  FileText,
  ClipboardList,
  ChevronLeft,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface Project {
  id: string;
  title: string;
}

interface PendingCounts {
  openQueries: number;
  pendingSafetyEvents: number;
  openDeviations: number;
}

export function EDCSidebar() {
  const { t } = useTranslation(["edc", "common"]);
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({
    openQueries: 0,
    pendingSafetyEvents: 0,
    openDeviations: 0,
  });

  const navItems = [
    { 
      title: t("sidebar.dashboard", "Dashboard"), 
      url: "/edc", 
      icon: LayoutDashboard,
      end: true 
    },
    { 
      title: t("sidebar.participants", "Participantes"), 
      url: "/edc/participants", 
      icon: Users 
    },
    { 
      title: t("sidebar.queries", "Queries"), 
      url: "/edc/queries", 
      icon: MessageCircleQuestion,
      badge: pendingCounts.openQueries 
    },
    { 
      title: t("sidebar.safety", "Eventos de Segurança"), 
      url: "/edc/safety", 
      icon: ShieldAlert,
      badge: pendingCounts.pendingSafetyEvents 
    },
    { 
      title: t("sidebar.deviations", "Desvios de Protocolo"), 
      url: "/edc/deviations", 
      icon: AlertTriangle,
      badge: pendingCounts.openDeviations 
    },
    { 
      title: t("sidebar.templates", "Templates CRF"), 
      url: "/edc/templates", 
      icon: FileText 
    },
    { 
      title: t("sidebar.entries", "Formulários"), 
      url: "/edc/entries", 
      icon: ClipboardList 
    },
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchPendingCounts();
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, title")
      .order("title");
    
    if (data) {
      setProjects(data);
    }
  };

  const fetchPendingCounts = async () => {
    // Fetch open queries count
    let queriesQuery = supabase
      .from("data_queries")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");

    // Fetch pending safety events count
    let safetyQuery = supabase
      .from("safety_events")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "under_review"]);

    // Fetch open deviations count
    let deviationsQuery = supabase
      .from("protocol_deviations")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "under_review"]);

    if (selectedProjectId !== "all") {
      safetyQuery = safetyQuery.eq("project_id", selectedProjectId);
      deviationsQuery = deviationsQuery.eq("project_id", selectedProjectId);
    }

    const [queriesResult, safetyResult, deviationsResult] = await Promise.all([
      queriesQuery,
      safetyQuery,
      deviationsQuery,
    ]);

    setPendingCounts({
      openQueries: queriesResult.count || 0,
      pendingSafetyEvents: safetyResult.count || 0,
      openDeviations: deviationsResult.count || 0,
    });
  };

  const isActive = (path: string, end?: boolean) => {
    if (end) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <ClipboardList className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">EDC</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </Button>
        </div>
        
        {!collapsed && (
          <div className="mt-3">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("sidebar.allProjects", "Todos os projetos")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("sidebar.allProjects", "Todos os projetos")}</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.navigation", "Navegação")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url, item.end)}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className="flex items-center gap-3"
                      activeClassName="bg-accent text-accent-foreground"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {item.badge && item.badge > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {!collapsed && (
          <NavLink to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← {t("sidebar.backToHome", "Voltar ao início")}
          </NavLink>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
