import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Calendar,
  ListTodo,
  Briefcase,
  Building2,
  FileText,
  DollarSign,
  Library,
  Settings,
  LogOut,
  MessageSquare,
  Activity,
} from "lucide-react";

interface CTMSNavProps {
  className?: string;
}

export default function CTMSNav({ className }: CTMSNavProps) {
  const { t } = useTranslation("navigation");
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(t("logoutError", { ns: "common", defaultValue: "Error signing out" }));
    } else {
      toast.success(t("logoutSuccess", { ns: "common", defaultValue: "Signed out successfully" }));
      navigate("/auth");
    }
  };

  const navItems = [
    { to: "/ctms", icon: LayoutDashboard, label: t("dashboard") },
    { to: "/ctms/communications", icon: MessageSquare, label: t("communications") },
    { to: "/ctms/agenda", icon: Calendar, label: t("agenda") },
    { to: "/ctms/tasks", icon: ListTodo, label: t("tasks") },
    { to: "/ctms/projects", icon: Briefcase, label: t("studies") },
    { to: "/ctms/centers", icon: Building2, label: t("centers") },
    { to: "/ctms/regulatory", icon: FileText, label: t("regulatory") },
    { to: "/ctms/payments", icon: DollarSign, label: t("payments") },
    { to: "/ctms/library", icon: Library, label: t("library") },
    { to: "/ctms/settings", icon: Settings, label: t("settings") },
  ];

  const isActive = (path: string) => {
    if (path === "/ctms") return location.pathname === "/ctms";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={`border-b bg-card/50 backdrop-blur-sm ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Links to Home */}
          <Link 
            to="/" 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground hidden sm:inline">CTMS</span>
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {navItems.map(({ to, icon: Icon, label }) => (
              <Button
                key={to}
                variant={isActive(to) ? "secondary" : "ghost"}
                size="sm"
                asChild
                className="hidden md:flex"
              >
                <Link to={to}>
                  <Icon className="h-4 w-4 mr-1" />
                  <span className="text-sm">{label}</span>
                </Link>
              </Button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden overflow-x-auto pb-2 gap-1">
          {navItems.slice(0, 6).map(({ to, icon: Icon, label }) => (
            <Button
              key={to}
              variant={isActive(to) ? "secondary" : "ghost"}
              size="sm"
              asChild
              className="flex-shrink-0"
            >
              <Link to={to}>
                <Icon className="h-4 w-4 mr-1" />
                <span className="text-xs">{label}</span>
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
}
