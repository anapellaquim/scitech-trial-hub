import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";

interface ExcelExportButtonProps {
  data: Record<string, any>[];
  fileName: string;
  sheetName?: string;
}

export default function ExcelExportButton({ data, fileName, sheetName = "Data" }: ExcelExportButtonProps) {
  const handleExport = () => {
    if (data.length === 0) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0}>
      <Download className="h-4 w-4 mr-1" />
      Export Excel
    </Button>
  );
}
