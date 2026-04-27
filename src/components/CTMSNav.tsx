import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
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
} from "lucide-react";

interface CTMSNavProps {
  className?: string;
}

export default function CTMSNav({ className }: CTMSNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, loading: permLoading } = usePermission();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  const baseNavItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/communications", icon: MessageSquare, label: "Communications" },
    { to: "/agenda", icon: Calendar, label: "Agenda" },
    { to: "/tasks", icon: ListTodo, label: "Tasks" },
    { to: "/projects", icon: Briefcase, label: "Studies" },
    { to: "/visits", icon: CalendarCheck, label: "Visits" },
    
    { to: "/qualifications", icon: ShieldCheck, label: "Qualifications" },
    { to: "/trainings", icon: GraduationCap, label: "Trainings" },
    { to: "/change-control", icon: GitBranch, label: "Change Control" },
    { to: "/risks", icon: AlertTriangle, label: "Risks" },
    { to: "/committees", icon: Users2, label: "Committees" },
    { to: "/steering", icon: Gavel, label: "Steering" },
    { to: "/regulatory", icon: FileText, label: "Regulatory" },
    { to: "/payments", icon: DollarSign, label: "Payments" },
    { to: "/library", icon: Library, label: "Library" },
  ];

  // Only show Settings for admins
  const navItems = !permLoading && isAdmin()
    ? [...baseNavItems, { to: "/settings", icon: Settings, label: "Settings" }]
    : baseNavItems;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={`border-b bg-card/50 backdrop-blur-sm ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link 
            to="/" 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground hidden sm:inline">CTMS</span>
          </Link>

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

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex md:hidden overflow-x-auto pb-2 gap-1">
          {navItems.map(({ to, icon: Icon, label }) => (
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
