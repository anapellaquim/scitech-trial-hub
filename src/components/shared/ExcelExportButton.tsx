import * as XLSX from "xlsx";
import { todayDateOnly } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ExcelExportButtonProps {
  data: Record<string, any>[];
  fileName: string;
  /** Optional sheet label; defaults to a sanitized version of fileName. */
  sheetName?: string;
  /** Optional explicit column order. Defaults to keys of first row. */
  columns?: string[];
}

export default function ExcelExportButton({ data, fileName, sheetName, columns }: ExcelExportButtonProps) {
  const handleExport = () => {
    if (data.length === 0) return;
    const headers = columns ?? Object.keys(data[0] ?? {});
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    const safeSheet = (sheetName ?? fileName).slice(0, 31).replace(/[\\/*?:[\]]/g, " ");
    XLSX.utils.book_append_sheet(wb, ws, safeSheet);
    XLSX.writeFile(wb, `${fileName}_${todayDateOnly()}.xlsx`);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0}>
      <Download className="h-4 w-4 mr-1" />
      Export Excel
    </Button>
  );
}
