import { ReactNode } from "react";
import CTMSNav from "@/components/CTMSNav";
import GlobalStudySelector from "./GlobalStudySelector";
import ExcelExportButton from "./ExcelExportButton";

interface ModulePageLayoutProps {
  title: string;
  subtitle?: string;
  selectedProject: string;
  onProjectChange: (value: string) => void;
  exportData?: Record<string, any>[];
  exportFileName?: string;
  children: ReactNode;
  actions?: ReactNode;
  showAllOption?: boolean;
  showGeneralOption?: boolean;
  generalValue?: string;
  generalLabel?: string;
  hideProjectSelector?: boolean;
}

export default function ModulePageLayout({
  title,
  subtitle,
  selectedProject,
  onProjectChange,
  exportData,
  exportFileName,
  children,
  actions,
  showAllOption = false,
  showGeneralOption = false,
  generalValue,
  generalLabel,
  hideProjectSelector = false,
}: ModulePageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <GlobalStudySelector value={selectedProject} onChange={onProjectChange} showAllOption={showAllOption} showGeneralOption={showGeneralOption} generalValue={generalValue} generalLabel={generalLabel} />
            {exportData && exportFileName && (
              <ExcelExportButton data={exportData} fileName={exportFileName} />
            )}
            {actions}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
