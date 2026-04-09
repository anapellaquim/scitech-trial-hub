import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, FileSpreadsheet, File } from "lucide-react";
import { useCRFExport } from "@/hooks/useCRFExport";

interface CRFExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  status?: string;
}

const CRFExportDialog = ({
  open,
  onOpenChange,
  projectId,
  status,
}: CRFExportDialogProps) => {
  const { t } = useTranslation("edc");
  const { exportData, exporting } = useCRFExport();
  const [format, setFormat] = useState<"csv" | "xlsx" | "pdf">("xlsx");
  const [includeAuditTrail, setIncludeAuditTrail] = useState(false);
  const [includeQueries, setIncludeQueries] = useState(false);

  const handleExport = async () => {
    await exportData({
      format,
      includeAuditTrail,
      includeQueries,
      projectId,
      status,
    });
    onOpenChange(false);
  };

  const formatOptions = [
    {
      value: "xlsx" as const,
      label: "Excel (.xlsx)",
      description: t("export.xlsxDescription", "Best for data analysis and editing"),
      icon: FileSpreadsheet,
    },
    {
      value: "csv" as const,
      label: "CSV (.csv)",
      description: t("export.csvDescription", "Universal format for data import"),
      icon: FileText,
    },
    {
      value: "pdf" as const,
      label: "PDF (.pdf)",
      description: t("export.pdfDescription", "Best for printing and sharing"),
      icon: File,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t("export.title", "Export CRF Data")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>{t("export.format", "Export Format")}</Label>
            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as "csv" | "xlsx" | "pdf")}
              className="space-y-2"
            >
              {formatOptions.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    format === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setFormat(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={option.value} className="cursor-pointer font-medium">
                        {option.label}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>{t("export.options", "Additional Options")}</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auditTrail"
                  checked={includeAuditTrail}
                  onCheckedChange={(checked) => setIncludeAuditTrail(checked as boolean)}
                />
                <Label htmlFor="auditTrail" className="text-sm font-normal cursor-pointer">
                  {t("export.includeAuditTrail", "Include audit trail")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="queries"
                  checked={includeQueries}
                  onCheckedChange={(checked) => setIncludeQueries(checked as boolean)}
                />
                <Label htmlFor="queries" className="text-sm font-normal cursor-pointer">
                  {t("export.includeQueries", "Include queries/discrepancies")}
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common:cancel", "Cancel")}
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {t("export.exporting", "Exporting...")}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t("export.export", "Export")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CRFExportDialog;
