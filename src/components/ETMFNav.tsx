import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FolderArchive, LogOut } from "lucide-react";

interface ETMFNavProps {
  className?: string;
}

export default function ETMFNav({ className }: ETMFNavProps) {
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
            <div className="w-9 h-9 rounded-lg bg-success flex items-center justify-center">
              <FolderArchive className="h-5 w-5 text-success-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground hidden sm:inline">eTMF</span>
          </Link>

          {/* Page Title */}
          <div className="flex-1 text-center">
            <span className="text-lg font-medium text-foreground">
              Electronic Trial Master File
            </span>
          </div>

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
