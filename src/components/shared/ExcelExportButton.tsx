import * as XLSX from "xlsx";
import { todayDateOnly } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type SingleSheetData = Record<string, any>[];
type MultiSheetData = Record<string, Record<string, any>[]>;

interface ExcelExportButtonProps {
  /** Either an array of rows (single sheet) or an object mapping sheet name → rows (multi-sheet). */
  data: SingleSheetData | MultiSheetData;
  fileName: string;
  /** Optional sheet label (single-sheet mode only); defaults to a sanitized version of fileName. */
  sheetName?: string;
  /** Optional explicit column order (single-sheet mode only). Defaults to keys of first row. */
  columns?: string[];
}

const sanitize = (n: string) => n.slice(0, 31).replace(/[\\/*?:[\]]/g, " ");

export default function ExcelExportButton({ data, fileName, sheetName, columns }: ExcelExportButtonProps) {
  const isMulti = !Array.isArray(data);

  const isEmpty = isMulti
    ? Object.values(data).every(rows => !rows || rows.length === 0)
    : data.length === 0;

  const handleExport = () => {
    if (isEmpty) return;
    const wb = XLSX.utils.book_new();

    if (isMulti) {
      Object.entries(data).forEach(([name, rows]) => {
        if (!rows || rows.length === 0) return;
        const headers = Object.keys(rows[0]);
        const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
        XLSX.utils.book_append_sheet(wb, ws, sanitize(name));
      });
    } else {
      const headers = columns ?? Object.keys(data[0] ?? {});
      const ws = XLSX.utils.json_to_sheet(data, { header: headers });
      XLSX.utils.book_append_sheet(wb, ws, sanitize(sheetName ?? fileName));
    }

    XLSX.writeFile(wb, `${fileName}_${todayDateOnly()}.xlsx`);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isEmpty}>
      <Download className="h-4 w-4 mr-1" />
      Export Excel
    </Button>
  );
}
