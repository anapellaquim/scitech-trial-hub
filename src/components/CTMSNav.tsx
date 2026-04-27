import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePermission, type ModuleKey } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  ListTodo,
  Briefcase,
  FileText,
  DollarSign,
  Library,
  Settings,
  LogOut,
  MessageSquare,
  Activity,
  CalendarCheck,
  ShieldCheck,
  GraduationCap,
  GitBranch,
  AlertTriangle,
  Users2,
  Gavel,
  Eye,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Menu,
  Lock,
  type LucideIcon,
} from "lucide-react";

interface CTMSNavProps {
  className?: string;
}

type RestrictMode = "hide" | "disable";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  module?: ModuleKey; // gated by canModule('view') when set
  adminOnly?: boolean;
  restrictMode?: RestrictMode; // overrides group/default behavior
  restrictedTooltip?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
  restrictMode?: RestrictMode;
  restrictedTooltip?: string;
}

const DEFAULT_RESTRICTED_TOOLTIP = "Requires administrator access";
const DEFAULT_MODULE_RESTRICTED_TOOLTIP = "You don't have access to this module";
const DEFAULT_RESTRICT_MODE: RestrictMode = "hide";

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard", module: "dashboard" },
      { to: "/communications", icon: MessageSquare, label: "Communications", module: "communications" },
    ],
  },
  {
    label: "Planning",
    items: [
      { to: "/projects", icon: Briefcase, label: "Studies", module: "projects" },
      { to: "/agenda", icon: Calendar, label: "Agenda", module: "agenda" },
      { to: "/tasks", icon: ListTodo, label: "Tasks", module: "tasks" },
    ],
  },
  {
    label: "Execution",
    items: [
      { to: "/visits", icon: CalendarCheck, label: "Visits", module: "visits" },
      { to: "/site-monitoring", icon: Eye, label: "Site Monitoring", module: "site_monitoring" },
      { to: "/pmcf-survey", icon: ClipboardList, label: "PMCF Survey", module: "pmcf_survey" },
    ],
  },
  {
    label: "Quality & Compliance",
    items: [
      { to: "/qualifications", icon: ShieldCheck, label: "Qualifications", module: "qualifications" },
      { to: "/trainings", icon: GraduationCap, label: "Trainings", module: "trainings" },
      { to: "/change-control", icon: GitBranch, label: "Change Control", module: "change_control" },
      { to: "/risks", icon: AlertTriangle, label: "Risks", module: "risks" },
    ],
  },
  {
    label: "Governance",
    items: [
      { to: "/committees", icon: Users2, label: "Committees", module: "committees" },
      { to: "/steering", icon: Gavel, label: "Steering", module: "steering" },
      { to: "/regulatory", icon: FileText, label: "Regulatory", module: "regulatory" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/payments", icon: DollarSign, label: "Payments", module: "payments" },
      { to: "/library", icon: Library, label: "Library", module: "library" },
    ],
  },
  {
    label: "Administration",
    adminOnly: true,
    restrictMode: "hide",
    items: [
      { to: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const COLLAPSE_KEY = "ctms.sidebar.collapsed";

function isActivePath(currentPath: string, to: string): boolean {
  if (to === "/") return currentPath === "/";

  return currentPath === to || currentPath.startsWith(to + "/");
}

interface ResolvedItem extends NavItem {
  restricted: boolean;
  effectiveMode: RestrictMode;
  effectiveTooltip: string;
}

interface ResolvedGroup {
  label: string;
  items: ResolvedItem[];
}

function resolveGroups(
  groups: NavGroup[],
  userIsAdmin: boolean,
  canViewModule: (m: ModuleKey) => boolean
): ResolvedGroup[] {
  const resolved: ResolvedGroup[] = [];
  for (const group of groups) {
    const groupRestricted = !!group.adminOnly && !userIsAdmin;
    const groupMode: RestrictMode = group.restrictMode ?? DEFAULT_RESTRICT_MODE;
    const groupTooltip = group.restrictedTooltip ?? DEFAULT_RESTRICTED_TOOLTIP;

    // If the whole group is admin-only and user can't access it, hide or keep disabled per group mode
    if (groupRestricted && groupMode === "hide") continue;

    const items: ResolvedItem[] = [];
    for (const item of group.items) {
      const adminRestricted = groupRestricted || (!!item.adminOnly && !userIsAdmin);
      const moduleRestricted =
        !userIsAdmin && !!item.module && !canViewModule(item.module);
      const itemRestricted = adminRestricted || moduleRestricted;

      const effectiveMode: RestrictMode =
        item.restrictMode ?? (groupRestricted ? groupMode : DEFAULT_RESTRICT_MODE);
      const effectiveTooltip =
        item.restrictedTooltip ??
        (adminRestricted
          ? groupRestricted
            ? groupTooltip
            : DEFAULT_RESTRICTED_TOOLTIP
          : DEFAULT_MODULE_RESTRICTED_TOOLTIP);

      if (itemRestricted && effectiveMode === "hide") continue;

      items.push({
        ...item,
        restricted: itemRestricted,
        effectiveMode,
        effectiveTooltip,
      });
    }

    if (items.length === 0) continue;
    resolved.push({ label: group.label, items });
  }
  return resolved;
}

interface SidebarBodyProps {
  collapsed: boolean;
  groups: ResolvedGroup[];
  currentPath: string;
  onItemClick?: () => void;
}

function SidebarBody({ collapsed, groups, currentPath, onItemClick }: SidebarBodyProps) {
  return (
    <div className="flex-1 overflow-y-auto py-3">
      {groups.map((group) => (
        <div key={group.label} className="mb-4">
          {!collapsed && (
            <div className="px-4 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </span>
            </div>
          )}
          {collapsed && <div className="mx-3 my-2 border-t border-border/60" />}
          <nav className="flex flex-col gap-0.5 px-2">
            {group.items.map((item) => {
              const { to, icon: Icon, label, restricted, effectiveTooltip } = item;
              const active = !restricted && isActivePath(currentPath, to);
              const baseClass = cn(
                "flex items-center gap-3 rounded-md text-sm transition-colors",
                collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
              );
              const stateClass = restricted
                ? "text-muted-foreground/50 cursor-not-allowed select-none"
                : active
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground/80 hover:bg-muted hover:text-foreground";

              const content = (
                <>
                  <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                  {!collapsed && (
                    <span className="truncate flex-1">{label}</span>
                  )}
                  {!collapsed && restricted && (
                    <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
                  )}
                </>
              );

              const node = restricted ? (
                <div
                  className={cn(baseClass, stateClass)}
                  aria-disabled="true"
                  role="link"
                  tabIndex={-1}
                >
                  {content}
                </div>
              ) : (
                <Link to={to} onClick={onItemClick} className={cn(baseClass, stateClass)}>
                  {content}
                </Link>
              );

              const tooltipText = restricted
                ? effectiveTooltip
                : collapsed
                ? label
                : null;

              if (tooltipText) {
                return (
                  <Tooltip key={to} delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div>{node}</div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {tooltipText}
                    </TooltipContent>
                  </Tooltip>
                );
              }
              return <div key={to}>{node}</div>;
            })}
          </nav>
        </div>
      ))}
    </div>
  );
}

export default function CTMSNav({ className }: CTMSNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, canModule, loading: permLoading } = usePermission();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const userIsAdmin = !permLoading && isAdmin();
  const groups = resolveGroups(NAV_GROUPS, userIsAdmin, (m) => canModule(m, "view"));


  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--ctms-sidebar-w", `${width}px`);
    return () => {
      root.style.removeProperty("--ctms-sidebar-w");
    };
  }, [width]);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  return (
    <TooltipProvider>
      {/* Desktop fixed sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r bg-card/95 backdrop-blur-sm hidden md:flex flex-col transition-[width] duration-200",
          className
        )}
        style={{ width }}
      >
        <div
          className={cn(
            "flex items-center h-14 border-b px-3 gap-2",
            collapsed && "justify-center px-2"
          )}
        >
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            {!collapsed && <span className="font-bold text-base text-foreground">CTMS</span>}
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        <SidebarBody collapsed={collapsed} groups={groups} currentPath={location.pathname} />

        <div className={cn("border-t p-2 flex items-center gap-2", collapsed && "flex-col")}>
          {collapsed && (
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCollapsed(false)}
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand</TooltipContent>
            </Tooltip>
          )}
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? "icon" : "sm"}
                onClick={handleLogout}
                className={cn(collapsed ? "h-8 w-8" : "w-full justify-start")}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span className="ml-2">Sign out</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Sign out</TooltipContent>}
          </Tooltip>
        </div>
      </aside>

      {/* Mobile top bar with hamburger */}
      <div className="md:hidden sticky top-0 z-40 flex items-center h-14 border-b bg-card/95 backdrop-blur-sm px-3 gap-2">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 flex flex-col">
            <div className="flex items-center h-14 border-b px-3 gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Activity className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-base">CTMS</span>
            </div>
            <SidebarBody
              collapsed={false}
              groups={groups}
              currentPath={location.pathname}
              onItemClick={() => setMobileOpen(false)}
            />
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base">CTMS</span>
        </Link>
      </div>
    </TooltipProvider>
  );
}
