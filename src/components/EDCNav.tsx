import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileInput, LogOut, Activity } from "lucide-react";

interface EDCNavProps {
  className?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function EDCNav({ className, activeTab = "templates", onTabChange }: EDCNavProps) {
  const { t } = useTranslation("navigation");
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(t("logoutError", { ns: "common", defaultValue: "Error signing out" }));
    } else {
      toast.success(t("logoutSuccess", { ns: "common", defaultValue: "Signed out successfully" }));
      navigate("/auth");
    }
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
            <div className="w-9 h-9 rounded-lg bg-info flex items-center justify-center">
              <FileInput className="h-5 w-5 text-info-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground hidden sm:inline">EDC</span>
          </Link>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 mx-8">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="templates">CRF Templates</TabsTrigger>
              <TabsTrigger value="visits">Visits</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
