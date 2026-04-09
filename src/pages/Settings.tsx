import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useLanguage, languages } from "@/hooks/useLanguage";
import { usePermission } from "@/hooks/usePermission";
import CTMSNav from "@/components/CTMSNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Globe, Users, FileText, Shield } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { t } = useTranslation("settings");
  const { currentLanguage, changeLanguage } = useLanguage();
  const { isAdmin, loading: permissionLoading } = usePermission();

  const handleLanguageChange = (value: string) => {
    changeLanguage(value as 'en' | 'pt-BR');
    toast.success(t("messages.languageChanged"));
  };

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>

        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t("language.title")}
              </CardTitle>
              <CardDescription>{t("language.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={currentLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Admin Section - Only visible to admins */}
          {!permissionLoading && isAdmin() && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Administração
                </CardTitle>
                <CardDescription>
                  Gerenciamento de usuários e auditoria do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <Link to="/settings/users">
                    <Users className="h-4 w-4" />
                    Gerenciar Usuários
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <Link to="/settings/audit">
                    <FileText className="h-4 w-4" />
                    Log de Auditoria
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
