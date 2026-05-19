import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export type ColumnType = "text" | "number" | "integer" | "date" | "boolean" | "enum";

export interface ColumnMapping {
  excelHeader: string;
  dbColumn: string;
  required?: boolean;
  /** Logical type used for parsing & validation. Defaults to "text". */
  type?: ColumnType;
  /** Accepted values when type === "enum". */
  enumValues?: string[];
  /** Example cell value rendered in the template's second row. */
  example?: string | number | boolean;
  /** Custom transform — runs AFTER built-in type parsing. */
  transform?: (value: any) => any;
}

interface TemplateSheet {
  name: string;
  data: Record<string, string>[];
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  projectId?: string;
  columns: ColumnMapping[];
  onSuccess: () => void;
  templateData?: Record<string, string>[];
  templateSheets?: TemplateSheet[];
  /** Sheet name to read from imported file. Defaults to first sheet. */
  sheetName?: string;
  /** Friendly label used in the dialog title and template sheet name. */
  entityLabel?: string;
}

// ---------- helpers ----------

function toBool(v: any): boolean | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["true", "yes", "sim", "y", "s", "1"].includes(s)) return true;
  if (["false", "no", "não", "nao", "n", "0"].includes(s)) return false;
  return null;
}

function toNumber(v: any, integer = false): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return integer ? Math.trunc(v) : v;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = integer ? parseInt(s, 10) : parseFloat(s);
  return isNaN(n) ? null : n;
}

/** Accepts dd/MM/yyyy, dd-MM-yyyy or yyyy-MM-dd. Returns yyyy-MM-dd (Postgres date) or null. */
function toIsoDate(v: any): string | null | "INVALID" {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // XLSX may give numeric date serials
  if (typeof v === "number") {
    const dateObj = XLSX.SSF?.parse_date_code?.(v);
    if (dateObj) {
      const y = dateObj.y;
      const m = String(dateObj.m).padStart(2, "0");
      const d = String(dateObj.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return "INVALID";
  }
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (br) {
    const d = br[1].padStart(2, "0");
    const m = br[2].padStart(2, "0");
    return `${br[3]}-${m}-${d}`;
  }
  return "INVALID";
}

// ---------- component ----------

export default function BulkImportDialog({
  open, onOpenChange, tableName, projectId, columns, onSuccess,
  templateData, templateSheets, sheetName, entityLabel,
}: BulkImportDialogProps) {
  const [preview, setPreview] = useState<Record<string, any>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const label = entityLabel || tableName;
  const exportSheetName = useMemo(
    () => (label || "Data").slice(0, 31).replace(/[\\/*?:[\]]/g, " "),
    [label],
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary", cellDates: true });
        const targetSheet = sheetName && wb.Sheets[sheetName] ? sheetName : wb.SheetNames[0];
        const ws = wb.Sheets[targetSheet];
        if (!ws) { toast.error(`Sheet "${targetSheet}" not found`); return; }
        const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
        if (raw.length === 0) { toast.error("Empty file"); return; }

        const errs: string[] = [];
        const mapped = raw.map((row, idx) => {
          const lineNo = idx + 2; // header is line 1
          const record: Record<string, any> = {};
          if (projectId) record.project_id = projectId;

          columns.forEach((col) => {
            let raw = row[col.excelHeader];
            if (typeof raw === "string") raw = raw.trim();

            const isEmpty = raw === undefined || raw === null || raw === "";
            if (col.required && isEmpty) {
              errs.push(`Row ${lineNo}: "${col.excelHeader}" is required`);
            }

            let val: any = raw;

            if (!isEmpty) {
              switch (col.type) {
                case "integer": {
                  const n = toNumber(raw, true);
                  if (n === null) errs.push(`Row ${lineNo}: "${col.excelHeader}" must be an integer (got "${raw}")`);
                  val = n;
                  break;
                }
                case "number": {
                  const n = toNumber(raw, false);
                  if (n === null) errs.push(`Row ${lineNo}: "${col.excelHeader}" must be a number (got "${raw}")`);
                  val = n;
                  break;
                }
                case "boolean": {
                  const b = toBool(raw);
                  if (b === null) errs.push(`Row ${lineNo}: "${col.excelHeader}" must be Yes/No (got "${raw}")`);
                  val = b;
                  break;
                }
                case "date": {
                  const iso = toIsoDate(raw);
                  if (iso === "INVALID") {
                    errs.push(`Row ${lineNo}: "${col.excelHeader}" must be dd/MM/yyyy (got "${raw}")`);
                    val = null;
                  } else {
                    val = iso;
                  }
                  break;
                }
                case "enum": {
                  const s = String(raw);
                  if (col.enumValues && !col.enumValues.includes(s)) {
                    errs.push(`Row ${lineNo}: "${col.excelHeader}" must be one of [${col.enumValues.join(", ")}] (got "${raw}")`);
                  }
                  val = s;
                  break;
                }
                default:
                  val = raw;
              }
            } else {
              val = null;
            }

            if (col.transform) val = col.transform(val);
            record[col.dbColumn] = val === "" ? null : val;
          });
          return record;
        });

        setErrors(errs.slice(0, 30));
        setPreview(mapped);
      } catch {
        toast.error("Failed to parse file");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (errors.length > 0) { toast.error("Fix errors before importing"); return; }
    setImporting(true);
    const { error } = await supabase.from(tableName as any).insert(preview as any);
    setImporting(false);
    if (error) { toast.error("Import failed: " + error.message); return; }
    toast.success(`${preview.length} records imported`);
    setPreview([]); setErrors([]);
    if (fileRef.current) fileRef.current.value = "";
    onOpenChange(false);
    onSuccess();
  };

  const downloadTemplate = () => {
    // Backwards-compat: explicit overrides win.
    if (templateSheets && templateSheets.length > 0) {
      const wb = XLSX.utils.book_new();
      templateSheets.forEach((sheet) => {
        const ws = XLSX.utils.json_to_sheet(sheet.data);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      });
      XLSX.writeFile(wb, `${label}_template.xlsx`);
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: headers + example row(s)
    if (templateData && templateData.length > 0) {
      const ws = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(wb, ws, exportSheetName);
    } else {
      const headers = columns.map((c) => c.excelHeader);
      const exampleRow: Record<string, any> = {};
      columns.forEach((c) => {
        if (c.example !== undefined) exampleRow[c.excelHeader] = c.example;
        else if (c.type === "date") exampleRow[c.excelHeader] = "31/12/2025";
        else if (c.type === "boolean") exampleRow[c.excelHeader] = "Yes";
        else if (c.type === "integer" || c.type === "number") exampleRow[c.excelHeader] = 0;
        else if (c.type === "enum" && c.enumValues?.length) exampleRow[c.excelHeader] = c.enumValues[0];
        else exampleRow[c.excelHeader] = "";
      });
      const ws = XLSX.utils.json_to_sheet([exampleRow], { header: headers });
      XLSX.utils.book_append_sheet(wb, ws, exportSheetName);
    }

    // Sheet 2: Instructions
    const instructions = columns.map((c) => ({
      Field: c.excelHeader,
      Required: c.required ? "Yes" : "No",
      Type: c.type ?? "text",
      "Allowed values": c.enumValues?.join(", ") ?? (c.type === "boolean" ? "Yes, No" : c.type === "date" ? "dd/MM/yyyy" : ""),
      Example:
        c.example !== undefined ? String(c.example) :
        c.type === "date" ? "31/12/2025" :
        c.type === "boolean" ? "Yes" :
        c.type === "enum" && c.enumValues?.length ? c.enumValues[0] : "",
    }));
    const wsInfo = XLSX.utils.json_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInfo, "Instructions");

    XLSX.writeFile(wb, `${label}_template.xlsx`);
  };

  const reset = () => { setPreview([]); setErrors([]); if (fileRef.current) fileRef.current.value = ""; };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Import {label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Download Template
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile}
              className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:cursor-pointer" />
          </div>

          <p className="text-xs text-muted-foreground">
            Dates must be in <strong>dd/MM/yyyy</strong> format. Open the <em>Instructions</em> sheet in the template for the full field reference.
          </p>

          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded p-3 space-y-1">
              <p className="text-sm font-medium text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {errors.length} validation error(s)
              </p>
              {errors.map((e, i) => <p key={i} className="text-xs text-destructive">{e}</p>)}
            </div>
          )}

          {preview.length > 0 && errors.length === 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> {preview.length} records ready to import
              </p>
            </div>
          )}

          {preview.length > 0 && (
            <div className="max-h-[300px] overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => <TableHead key={c.dbColumn}>{c.excelHeader}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      {columns.map((c) => (
                        <TableCell key={c.dbColumn} className="text-xs">
                          {row[c.dbColumn] === null || row[c.dbColumn] === undefined ? "" : String(row[c.dbColumn])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {preview.length > 10 && (
                <p className="text-xs text-muted-foreground p-2">Showing 10 of {preview.length} rows</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={preview.length === 0 || errors.length > 0 || importing}>
            {importing ? "Importing..." : `Import ${preview.length} Records`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
