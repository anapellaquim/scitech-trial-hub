import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, FileInput, FolderArchive, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  colorClass: string;
}

const ModuleCard = ({ title, description, icon, href, colorClass }: ModuleCardProps) => {
  const navigate = useNavigate();

  return (
    <Card
      className={cn(
        "group relative cursor-pointer overflow-hidden transition-all duration-300",
        "hover:shadow-elevated hover:-translate-y-1",
        "border-2 hover:border-primary/30"
      )}
      onClick={() => navigate(href)}
    >
      <div className={cn(
        "absolute inset-0 opacity-5 transition-opacity duration-300 group-hover:opacity-10",
        colorClass
      )} />
      <CardHeader className="pb-4">
        <div className={cn(
          "w-16 h-16 rounded-xl flex items-center justify-center mb-4",
          "bg-primary/10 text-primary transition-colors duration-300",
          "group-hover:bg-primary group-hover:text-primary-foreground"
        )}>
          {icon}
        </div>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          {title}
          <ArrowRight className="h-5 w-5 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
        </CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          {title === "CTMS" && "Dashboard • Tasks • Studies • Centers • Payments"}
          {title === "EDC" && "CRF Templates • Data Collection • Visits"}
          {title === "eTMF" && "Zones • Sections • Artifacts • Documents"}
        </div>
      </CardContent>
    </Card>
  );
};

export default function Home() {
  const { t } = useTranslation("home");

  const modules: Omit<ModuleCardProps, "colorClass">[] = [
    {
      title: "CTMS",
      description: t("ctms.description"),
      icon: <Activity className="h-8 w-8" />,
      href: "/ctms",
    },
    {
      title: "EDC",
      description: t("edc.description"),
      icon: <FileInput className="h-8 w-8" />,
      href: "/edc",
    },
    {
      title: "eTMF",
      description: t("etmf.description"),
      icon: <FolderArchive className="h-8 w-8" />,
      href: "/etmf",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">CTMS</h1>
              <p className="text-xs text-muted-foreground">Clinical Trial Management System</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {modules.map((module, index) => (
              <ModuleCard
                key={module.title}
                {...module}
                colorClass={index === 0 ? "bg-primary" : index === 1 ? "bg-info" : "bg-success"}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          {t("footer")}
        </div>
      </footer>
    </div>
  );
}
