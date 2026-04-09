import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ExportOptions {
  format: "csv" | "xlsx" | "pdf";
  includeAuditTrail?: boolean;
  includeQueries?: boolean;
  projectId?: string;
  status?: string;
}

interface CRFExportData {
  entry_id: string;
  template_name: string;
  participant_code: string;
  project_title: string;
  status: string;
  created_at: string;
  updated_at: string;
  signed_at: string | null;
  signed_by: string | null;
  is_locked: boolean;
  is_verified: boolean;
  fields: Record<string, any>;
}

export const useCRFExport = () => {
  const [exporting, setExporting] = useState(false);

  const fetchExportData = async (options: ExportOptions): Promise<CRFExportData[]> => {
    let query = supabase
      .from("crf_entries")
      .select(`
        id,
        status,
        created_at,
        updated_at,
        signed_at,
        signed_by,
        is_locked,
        is_verified,
        crf_templates (
          name,
          project_id,
          projects (
            id,
            title
          )
        ),
        participants (
          participant_code
        ),
        crf_field_values (
          field_id,
          value,
          crf_fields (
            field_name,
            field_label
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (options.status && options.status !== "all") {
      query = query.eq("status", options.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    let entries = (data || []).map((entry: any) => {
      const fields: Record<string, any> = {};
      (entry.crf_field_values || []).forEach((fv: any) => {
        const fieldName = fv.crf_fields?.field_name || fv.field_id;
        fields[fieldName] = fv.value;
      });

      return {
        entry_id: entry.id,
        template_name: entry.crf_templates?.name || "N/A",
        participant_code: entry.participants?.participant_code || "N/A",
        project_title: entry.crf_templates?.projects?.title || "N/A",
        project_id: entry.crf_templates?.projects?.id || "",
        status: entry.status,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        signed_at: entry.signed_at,
        signed_by: entry.signed_by,
        is_locked: entry.is_locked || false,
        is_verified: entry.is_verified || false,
        fields,
      };
    });

    // Filter by project if specified
    if (options.projectId && options.projectId !== "all") {
      entries = entries.filter((e: any) => e.project_id === options.projectId);
    }

    return entries;
  };

  const exportToCSV = (data: CRFExportData[], filename: string) => {
    // Get all unique field names
    const allFieldNames = new Set<string>();
    data.forEach((entry) => {
      Object.keys(entry.fields).forEach((key) => allFieldNames.add(key));
    });

    const headers = [
      "Entry ID",
      "Template",
      "Participant",
      "Project",
      "Status",
      "Created At",
      "Updated At",
      "Signed At",
      "Locked",
      "Verified",
      ...Array.from(allFieldNames),
    ];

    const rows = data.map((entry) => [
      entry.entry_id,
      entry.template_name,
      entry.participant_code,
      entry.project_title,
      entry.status,
      format(new Date(entry.created_at), "yyyy-MM-dd HH:mm:ss"),
      format(new Date(entry.updated_at), "yyyy-MM-dd HH:mm:ss"),
      entry.signed_at ? format(new Date(entry.signed_at), "yyyy-MM-dd HH:mm:ss") : "",
      entry.is_locked ? "Yes" : "No",
      entry.is_verified ? "Yes" : "No",
      ...Array.from(allFieldNames).map((field) => entry.fields[field] || ""),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const exportToExcel = (data: CRFExportData[], filename: string) => {
    // Get all unique field names
    const allFieldNames = new Set<string>();
    data.forEach((entry) => {
      Object.keys(entry.fields).forEach((key) => allFieldNames.add(key));
    });

    const worksheetData = data.map((entry) => ({
      "Entry ID": entry.entry_id,
      Template: entry.template_name,
      Participant: entry.participant_code,
      Project: entry.project_title,
      Status: entry.status,
      "Created At": format(new Date(entry.created_at), "yyyy-MM-dd HH:mm:ss"),
      "Updated At": format(new Date(entry.updated_at), "yyyy-MM-dd HH:mm:ss"),
      "Signed At": entry.signed_at
        ? format(new Date(entry.signed_at), "yyyy-MM-dd HH:mm:ss")
        : "",
      Locked: entry.is_locked ? "Yes" : "No",
      Verified: entry.is_verified ? "Yes" : "No",
      ...Object.fromEntries(
        Array.from(allFieldNames).map((field) => [field, entry.fields[field] || ""])
      ),
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CRF Data");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const exportToPDF = (data: CRFExportData[], filename: string) => {
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.text("CRF Data Export", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`, 14, 22);
    doc.text(`Total Records: ${data.length}`, 14, 28);

    const tableData = data.map((entry) => [
      entry.entry_id.slice(0, 8) + "...",
      entry.template_name,
      entry.participant_code,
      entry.project_title,
      entry.status,
      format(new Date(entry.updated_at), "dd/MM/yyyy"),
      entry.is_locked ? "✓" : "",
      entry.is_verified ? "✓" : "",
      entry.signed_at ? "✓" : "",
    ]);

    autoTable(doc, {
      startY: 35,
      head: [
        [
          "ID",
          "Template",
          "Participant",
          "Project",
          "Status",
          "Updated",
          "Locked",
          "Verified",
          "Signed",
        ],
      ],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`${filename}.pdf`);
  };

  const exportData = async (options: ExportOptions) => {
    setExporting(true);
    try {
      const data = await fetchExportData(options);

      if (data.length === 0) {
        toast.warning("No data to export");
        return;
      }

      const filename = `crf_export_${format(new Date(), "yyyyMMdd_HHmmss")}`;

      switch (options.format) {
        case "csv":
          exportToCSV(data, filename);
          break;
        case "xlsx":
          exportToExcel(data, filename);
          break;
        case "pdf":
          exportToPDF(data, filename);
          break;
      }

      toast.success(`Data exported successfully (${data.length} records)`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  return {
    exportData,
    exporting,
  };
};
