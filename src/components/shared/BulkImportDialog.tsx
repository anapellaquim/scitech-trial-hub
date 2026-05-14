import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export interface ColumnMapping {
  excelHeader: string;
  dbColumn: string;
  required?: boolean;
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
  sheetName?: string;
}

export default function BulkImportDialog({
  open, onOpenChange, tableName, projectId, columns, onSuccess, templateData,
}: BulkImportDialogProps) {
  const [preview, setPreview] = useState<Record<string, any>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (raw.length === 0) { toast.error("Empty file"); return; }

        const errs: string[] = [];
        const mapped = raw.map((row, idx) => {
          const record: Record<string, any> = {};
          if (projectId) record.project_id = projectId;
          columns.forEach(col => {
            let val = row[col.excelHeader];
            if (col.required && (val === undefined || val === null || val === "")) {
              errs.push(`Row ${idx + 2}: "${col.excelHeader}" is required`);
            }
            if (col.transform) val = col.transform(val);
            record[col.dbColumn] = val === "" ? null : val;
          });
          return record;
        });

        setErrors(errs.slice(0, 20));
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
    const data = templateData || [
      columns.reduce((acc, col) => ({ ...acc, [col.excelHeader]: "" }), {} as Record<string, string>),
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${tableName}_template.xlsx`);
  };

  const reset = () => { setPreview([]); setErrors([]); if (fileRef.current) fileRef.current.value = ""; };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Bulk Import
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Download Template
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile}
              className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:cursor-pointer" />
          </div>

          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded p-3 space-y-1">
              <p className="text-sm font-medium text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {errors.length} validation error(s)
              </p>
              {errors.map((e, i) => <p key={i} className="text-xs text-destructive">{e}</p>)}
            </div>
          )}

          {preview.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">{preview.length} records ready to import</p>
              <div className="max-h-[300px] overflow-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map(c => <TableHead key={c.dbColumn}>{c.excelHeader}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        {columns.map(c => (
                          <TableCell key={c.dbColumn} className="text-xs">
                            {String(row[c.dbColumn] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {preview.length > 10 && (
                <p className="text-xs text-muted-foreground">Showing 10 of {preview.length} rows</p>
              )}
            </>
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
