import { useState, useEffect, useCallback, useMemo } from "react";
import { formatInBrasilia, todayDateOnly } from "@/lib/dateUtils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import CTMSNav from "@/components/CTMSNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, UserCheck, Calendar, DollarSign, Settings2, Trash2, Pencil, Search, Filter, AlertTriangle, CheckCircle2, X, ClipboardCheck, History, Download, Upload, Clock, AlertCircle } from "lucide-react";
import { format, addDays, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";

// --- Types ---
type PatientStatus = 'Screening' | 'Screen failure' | 'Included' | 'Complete' | 'Lost to FUP' | 'Early exit' | 'Withdrawn';

type RandomizationGroup = 'AVF: PTA' | 'AVF: SOLARIS DE' | 'AVG: SOLARIS DE';
const RANDOMIZATION_GROUPS: RandomizationGroup[] = ['AVF: PTA', 'AVF: SOLARIS DE', 'AVG: SOLARIS DE'];

interface Patient {
  id: string;
  project_id: string;
  site_id: string;
  patient_code: string;
  status: PatientStatus;
  enrollment_date: string | null;
  randomization_date: string | null;
  randomization_group: RandomizationGroup | null;
  notes: string | null;
  site?: { code: string; name: string | null };
}

// Desired display order for the Participants List visit columns.
const VISIT_ORDER = ["procedure", "1 month", "3 month", "6 month", "12 month", "18 month", "24 month"];
const visitOrderIndex = (name: string): number => {
  const n = name.toLowerCase();
  const i = VISIT_ORDER.findIndex(k => n.includes(k));
  return i === -1 ? 999 : i;
};

interface ProtocolVisit {
  id: string;
  project_id: string;
  site_id: string | null;
  visit_name: string;
  target_day: number;
  window_minus: number;
  window_plus: number;
  payment_amount: number;
  currency: string;
  is_paid: boolean;
}

interface SiteOverrideForm {
  site_id: string;
  enabled: boolean;     // false = use default (no override row)
  is_paid: boolean;
  payment_amount: number;
}

interface PatientVisit {
  id: string;
  patient_id: string;
  protocol_visit_id: string;
  actual_date: string | null;
  status: string;
  payment_status: string;
  notes: string | null;
  protocol_visit?: ProtocolVisit;
}

export default function PatientManagement() {
  const { projectId: selectedProject, setProjectId: setSelectedProject } = usePersistedFilters();
  const [projects, setProjects] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [protocolVisits, setProtocolVisits] = useState<ProtocolVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearch] = useState("");
  const [filterSite, setFilterSite] = useState<string>("all");
  const [filterPatientStatus, setFilterPatientStatus] = useState<string>("all");
  const [filterVisitStatus, setFilterVisitStatus] = useState<string>("all");
  const [filterRandomGroup, setFilterRandomGroup] = useState<string>("all");

  // Dialog States
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientForm, setPatientForm] = useState({
    patient_code: "",
    site_id: "",
    status: "Screening" as PatientStatus,
    enrollment_date: "",
    randomization_group: "" as RandomizationGroup | "",
    notes: ""
  });

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ProtocolVisit | null>(null);
  const [scheduleForm, setScheduleForm] = useState<{
    visit_name: string;
    target_day: number;
    window_minus: number;
    window_plus: number;
    payment_amount: number;
    is_paid: boolean;
    site_overrides: SiteOverrideForm[];
  }>({
    visit_name: "",
    target_day: 0,
    window_minus: 0,
    window_plus: 0,
    payment_amount: 0,
    is_paid: true,
    site_overrides: [],
  });

  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [selectedPatientForVisits, setSelectedPatientForVisits] = useState<Patient | null>(null);
  const [patientVisits, setPatientVisits] = useState<PatientVisit[]>([]);
  const [visitForm, setVisitForm] = useState({
    protocol_visit_id: "",
    actual_date: "",
    status: "Completed", // Options: Completed, Lost Visit, Pending
    notes: ""
  });

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectData();
    }
  }, [selectedProject]);

  const loadBaseData = async () => {
    const { data } = await supabase.from("projects").select("id, title").order("title");
    setProjects(data || []);
  };

  const loadProjectData = async () => {
    setLoading(true);
    try {
      const [sitesRes, patientsRes, protocolRes, visitsRes] = await Promise.all([
        supabase.from("research_centers").select("id, code, name").eq("project_id", selectedProject),
        supabase.from("patients").select("*, site:research_centers(code, name)").eq("project_id", selectedProject),
        supabase.from("protocol_visit_schedules").select("*").eq("project_id", selectedProject).order("target_day"),
        supabase.from("patient_visits").select("*, protocol_visit:protocol_visit_schedules(*)").order("actual_date")
      ]);

      setSites(sitesRes.data || []);
      setPatients((patientsRes.data || []).map((p: any) => ({
        ...p,
        status: (p.status === 'Completed' ? 'Complete' : 
                 p.status === 'Randomized' ? 'Included' : 
                 p.status === 'Screen Failure' ? 'Screen failure' :
                 p.status === 'Lost to Follow-up' ? 'Lost to FUP' :
                 p.status === 'Early Exit' ? 'Early exit' : p.status) as PatientStatus
      })));
      setProtocolVisits(protocolRes.data || []);
      setPatientVisits(visitsRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Error loading patient data");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePatient = async () => {
    if (!patientForm.patient_code || !patientForm.site_id) {
      toast.error("Please fill in required fields");
      return;
    }

    const payload = {
      project_id: selectedProject,
      site_id: patientForm.site_id,
      patient_code: patientForm.patient_code,
      status: (patientForm.status === 'Complete' ? 'Completed' : 
               patientForm.status === 'Included' ? 'Randomized' : 
               patientForm.status === 'Screen failure' ? 'Screen Failure' :
               patientForm.status === 'Lost to FUP' ? 'Lost to Follow-up' :
               patientForm.status === 'Early exit' ? 'Early Exit' : patientForm.status) as any,
      enrollment_date: patientForm.enrollment_date || null,
      notes: patientForm.notes
    };

    let error;
    if (editingPatient) {
      const { error: err } = await supabase.from("patients").update(payload).eq("id", editingPatient.id);
      error = err;
    } else {
      const { error: err } = await supabase.from("patients").insert(payload);
      error = err;
    }

    if (error) {
      toast.error("Error saving patient: " + error.message);
    } else {
      toast.success("Patient saved successfully");
      setPatientDialogOpen(false);
      loadProjectData();
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.visit_name.trim()) {
      toast.error("Visit name is required");
      return;
    }

    // Save the GLOBAL definition row (site_id = null). This is what applies to ALL patients.
    let globalId: string | null = editingSchedule?.id ?? null;
    const globalPayload = {
      project_id: selectedProject,
      site_id: null as string | null,
      visit_name: scheduleForm.visit_name,
      target_day: scheduleForm.target_day,
      window_minus: scheduleForm.window_minus,
      window_plus: scheduleForm.window_plus,
      payment_amount: scheduleForm.payment_amount,
      is_paid: scheduleForm.is_paid,
    };

    if (globalId) {
      const { error } = await supabase.from("protocol_visit_schedules").update(globalPayload).eq("id", globalId);
      if (error) { toast.error("Error saving visit: " + error.message); return; }
    } else {
      const { data, error } = await supabase.from("protocol_visit_schedules").insert(globalPayload).select("id").single();
      if (error || !data) { toast.error("Error saving visit: " + (error?.message || "")); return; }
      globalId = data.id;
    }

    // Sync per-site overrides: delete all existing site-specific rows for this (project, visit_name) then re-insert enabled ones.
    await supabase
      .from("protocol_visit_schedules")
      .delete()
      .eq("project_id", selectedProject)
      .eq("visit_name", scheduleForm.visit_name)
      .not("site_id", "is", null);

    const overrideRows = scheduleForm.site_overrides
      .filter(o => o.enabled)
      .map(o => ({
        project_id: selectedProject,
        site_id: o.site_id,
        visit_name: scheduleForm.visit_name,
        target_day: scheduleForm.target_day,
        window_minus: scheduleForm.window_minus,
        window_plus: scheduleForm.window_plus,
        payment_amount: o.payment_amount,
        is_paid: o.is_paid,
      }));

    if (overrideRows.length > 0) {
      const { error } = await supabase.from("protocol_visit_schedules").insert(overrideRows);
      if (error) { toast.error("Error saving site overrides: " + error.message); return; }
    }

    toast.success("Visit configuration saved");
    setScheduleDialogOpen(false);
    loadProjectData();
  };

  const handleSaveVisit = async () => {
    handleSaveVisitExplicit(visitForm.status);
  };

  const handleSaveVisitExplicit = async (statusOverride: string) => {
    if (!selectedPatientForVisits || !visitForm.protocol_visit_id) return;

    const payload = {
      patient_id: selectedPatientForVisits.id,
      protocol_visit_id: visitForm.protocol_visit_id,
      actual_date: visitForm.actual_date || null,
      status: statusOverride,
      notes: visitForm.notes
    };

    const { error } = await supabase.from("patient_visits").insert(payload);

    if (error) {
      toast.error("Error recording visit");
    } else {
      toast.success("Visit recorded");
      setVisitDialogOpen(false);
      loadProjectData();
    }
  };

  const deletePatient = async (id: string) => {
    if (!confirm("Are you sure? All related visits will be deleted.")) return;
    const { error, count } = await supabase
      .from("patients")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) {
      toast.error("Error deleting participant: " + error.message);
    } else if (!count) {
      toast.error("Participant could not be deleted (no permission or not found)");
    } else {
      toast.success("Participant deleted");
      loadProjectData();
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm("Are you sure? This visit configuration (and all its per-site overrides) and all related patient visits will be deleted.")) return;
    const target = protocolVisits.find(v => v.id === id);
    // If deleting a global definition, also delete all site-specific overrides with the same visit_name.
    if (target && target.site_id === null) {
      await supabase.from("protocol_visit_schedules")
        .delete()
        .eq("project_id", selectedProject)
        .eq("visit_name", target.visit_name)
        .not("site_id", "is", null);
    }
    const { error } = await supabase.from("protocol_visit_schedules").delete().eq("id", id);
    if (error) toast.error("Error deleting visit configuration: " + error.message);
    else {
      toast.success("Visit configuration deleted");
      loadProjectData();
    }
  };

  // All patients receive ALL visit definitions (global rows, site_id = null).
  const visitDefinitions = (): ProtocolVisit[] =>
    protocolVisits.filter(pv => pv.site_id === null);

  const getVisitsForPatient = (_p: Patient): ProtocolVisit[] => visitDefinitions();

  const visitAppliesToPatient = (_p: Patient, pv: ProtocolVisit): boolean =>
    pv.site_id === null;

  // Returns the effective payment for a patient on a given visit definition,
  // applying any per-site override (matched by project + visit_name + patient site).
  const paymentForPatient = (p: Patient, pv: ProtocolVisit): { amount: number; is_paid: boolean } => {
    const override = protocolVisits.find(o =>
      o.site_id === p.site_id &&
      o.visit_name === pv.visit_name &&
      o.project_id === pv.project_id
    );
    const source = override ?? pv;
    return {
      amount: source.is_paid ? Number(source.payment_amount) || 0 : 0,
      is_paid: source.is_paid,
    };
  };

  // Sum of expected payment for all applicable visits of a patient (after overrides).
  const totalExpectedForPatient = (p: Patient): number =>
    getVisitsForPatient(p).reduce((sum, pv) => sum + paymentForPatient(p, pv).amount, 0);

  const computeVisitStatus = (p: Patient, pv: ProtocolVisit): string => {
    const visit = patientVisits.find(v => v.patient_id === p.id && v.protocol_visit_id === pv.id);
    if (visit?.status === 'Completed' || visit?.status === 'Complete') return 'Completed';
    if (visit?.status === 'Lost Visit') return 'Lost Visit';
    if (p.enrollment_date) {
      const targetDate = addDays(new Date(p.enrollment_date), pv.target_day);
      const windowStart = addDays(targetDate, -pv.window_minus);
      const windowEnd = addDays(targetDate, pv.window_plus);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (today > windowEnd) return 'Overdue';
      if (today >= windowStart && today <= windowEnd) return 'Window';
    }
    return 'Scheduled';
  };

  const filteredPatients = patients.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || p.patient_code.toLowerCase().includes(term) || p.site?.code.toLowerCase().includes(term);
    const matchesSite = filterSite === "all" || p.site_id === filterSite;
    const matchesStatus = filterPatientStatus === "all" || p.status === filterPatientStatus;
    const matchesVisitStatus = filterVisitStatus === "all" || getVisitsForPatient(p).some(pv => computeVisitStatus(p, pv) === filterVisitStatus);
    return matchesSearch && matchesSite && matchesStatus && matchesVisitStatus;
  });

  const getStatusBadge = (status: PatientStatus) => {
    const variants: Record<PatientStatus, string> = {
      'Screening': 'bg-blue-100 text-blue-800',
      'Screen failure': 'bg-red-100 text-red-800',
      'Included': 'bg-green-100 text-green-800',
      'Complete': 'bg-purple-100 text-purple-800',
      'Lost to FUP': 'bg-orange-100 text-orange-800',
      'Early exit': 'bg-gray-100 text-gray-800',
      'Withdrawn': 'bg-slate-100 text-slate-800'
    };
    return <Badge className={variants[status]}>{status}</Badge>;
  };

  const exportData = () => {
    const workbook = XLSX.utils.book_new();
    
    // Patients & Visits Sheet (Merged like the UI)
    const patientsData = patients.map(p => {
      const row: any = {
        'Código do Paciente': p.patient_code,
        'Centro (Código)': p.site?.code || '',
        'Status': p.status,
        'Notas': p.notes
      };

      // Add visit columns matching the UI
      protocolVisits.forEach(pv => {
        const visit = patientVisits.find(v => v.patient_id === p.id && v.protocol_visit_id === pv.id);
        row[`${pv.visit_name} (Status)`] = visit?.status || 'Scheduled';
        row[`${pv.visit_name} (Data)`] = visit?.actual_date || '';
      });

      return row;
    });

    const patientsSheet = XLSX.utils.json_to_sheet(patientsData);
    XLSX.utils.book_append_sheet(workbook, patientsSheet, "Pacientes e Visitas");

    // Protocol Visits Sheet (Configuration)
    const protocolData = protocolVisits.map(v => {
      const site = sites.find(s => s.id === v.site_id);
      return {
        'Nome da Visita': v.visit_name,
        'Dia Alvo': v.target_day,
        'Janela Negativa': v.window_minus,
        'Janela Positiva': v.window_plus,
        'Valor do Pagamento': v.payment_amount,
        'Centro (Código)': site?.code || 'Global'
      };
    });
    const protocolSheet = XLSX.utils.json_to_sheet(protocolData);
    XLSX.utils.book_append_sheet(workbook, protocolSheet, "Configuracao Protocolo");

    XLSX.writeFile(workbook, `patient-management-${todayDateOnly()}.xlsx`);
    toast.success("Dados exportados para Excel");
  };

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    
    // Create combined data for template
    const templateRow: any = {
      'Código do Paciente': 'PAC-001',
      'Centro (Código)': sites[0]?.code || 'CODIGO_DO_CENTRO',
      'Status': 'Screening',
      'Notas': 'Exemplo'
    };
    
    protocolVisits.forEach(v => {
      templateRow[`${v.visit_name} (Status)`] = 'Completed';
      templateRow[`${v.visit_name} (Data)`] = todayDateOnly();
    });
    
    if (protocolVisits.length === 0) {
      templateRow['Visita Exemplo (Status)'] = 'Completed';
      templateRow['Visita Exemplo (Data)'] = todayDateOnly();
    }

    const patientsSheet = XLSX.utils.json_to_sheet([templateRow]);
    XLSX.utils.book_append_sheet(workbook, patientsSheet, "Pacientes e Visitas");

    const protocolTemplate = [{
      'Nome da Visita': 'V1 - Screening',
      'Dia Alvo': 0,
      'Janela Negativa': 0,
      'Janela Positiva': 0,
      'Valor do Pagamento': 500.00,
      'Centro (ID)': 'Global'
    }];
    const protocolSheet = XLSX.utils.json_to_sheet(protocolTemplate);
    XLSX.utils.book_append_sheet(workbook, protocolSheet, "Configuracao Protocolo");

    XLSX.writeFile(workbook, "template-patient-management.xlsx");
    toast.success("Template baixado");
  };

  const importData = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        setLoading(true);

        // Import Protocol (Configuracao Protocolo)
        if (workbook.SheetNames.includes("Configuracao Protocolo")) {
          const protocolRows = XLSX.utils.sheet_to_json(workbook.Sheets["Configuracao Protocolo"]) as any[];
          for (const row of protocolRows) {
            const site = sites.find(s => s.code === row['Centro (Código)']);
            await supabase.from("protocol_visit_schedules").upsert({
              project_id: selectedProject,
              visit_name: row['Nome da Visita'],
              target_day: Number(row['Dia Alvo']),
              window_minus: Number(row['Janela Negativa']),
              window_plus: Number(row['Janela Positiva']),
              payment_amount: Number(row['Valor do Pagamento']),
              site_id: row['Centro (Código)'] === 'Global' ? null : (site?.id || row['Centro (ID)'])
            });
          }
        }

        // Reload protocol visits to ensure we have correct IDs for visit matching
        const { data: pvSchedules } = await supabase.from("protocol_visit_schedules")
          .select("*")
          .eq("project_id", selectedProject);

        // Import Patients & Visits (Aba Pacientes e Visitas)
        if (workbook.SheetNames.includes("Pacientes e Visitas")) {
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Pacientes e Visitas"]) as any[];
          for (const row of rows) {
            // Find site by code if ID is not present
            const site = sites.find(s => s.code === row['Centro (Código)']);
            const siteId = site?.id || row['Centro (ID)'];

            // 1. Upsert Patient
            const { data: pData } = await supabase.from("patients").upsert({
              project_id: selectedProject,
              patient_code: row['Código do Paciente'],
              site_id: siteId,
              status: (row['Status'] === 'Complete' ? 'Completed' : 
                       row['Status'] === 'Included' ? 'Randomized' : 
                       row['Status'] === 'Screen failure' ? 'Screen Failure' :
                       row['Status'] === 'Lost to FUP' ? 'Lost to Follow-up' :
                       row['Status'] === 'Early exit' ? 'Early Exit' : row['Status']) as any,
              notes: row['Notas'] || null
            }).select('id').single();
            
            if (!pData) continue;

            // 2. Process dynamic visit columns
            for (const pv of (pvSchedules || [])) {
              const statusKey = `${pv.visit_name} (Status)`;
              const dateKey = `${pv.visit_name} (Data)`;
              
              if (row[statusKey] || row[dateKey]) {
                const visitStatus = row[statusKey] || 'Scheduled';
                // Only upsert if it's not a placeholder/scheduled status that doesn't need DB persistence yet,
                // or if specifically requested. Here we persist if status is Completed or Lost Visit.
                if (['Completed', 'Lost Visit'].includes(visitStatus)) {
                  await supabase.from("patient_visits").upsert({
                    patient_id: pData.id,
                    protocol_visit_id: pv.id,
                    actual_date: row[dateKey] || null,
                    status: visitStatus,
                    payment_status: 'Pending'
                  });
                }
              }
            }
          }
        }

        toast.success("Dados importados com sucesso");
        loadProjectData();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao importar Excel. Verifique o formato.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UserCheck className="h-8 w-8 text-primary" />
              Patient Management
            </h1>
            <p className="text-muted-foreground mt-1">Manage participants, protocol visits, and payments</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-2">
              <Button variant="outline" size="sm" onClick={() => exportData()} disabled={!selectedProject}>
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={!selectedProject}>
                    <Upload className="h-4 w-4 mr-2" /> Import
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Importar Dados (Excel)</DialogTitle>
                    <DialogDescription>
                      Baixe o template, preencha as abas e faça o upload abaixo.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Button variant="outline" className="w-full justify-start" onClick={downloadTemplate}>
                      <Download className="h-4 w-4 mr-2" /> Baixar Template (.xlsx)
                    </Button>
                    <div className="grid gap-2">
                      <Label htmlFor="import-excel">Arquivo Excel</Label>
                      <Input
                        id="import-excel"
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) importData(file);
                        }}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Select value={selectedProject || ""} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Study" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => {
              setEditingPatient(null);
              setPatientForm({ patient_code: "", site_id: sites[0]?.id || "", status: "Screening", enrollment_date: "", notes: "" });
              setPatientDialogOpen(true);
            }} disabled={!selectedProject}>
              <Plus className="h-4 w-4 mr-2" />
              Add Patient
            </Button>
          </div>
        </div>

        {!selectedProject ? (
          <Card><CardContent className="py-20 text-center text-muted-foreground font-medium">Please select a study to manage patients.</CardContent></Card>
        ) : (
          <Tabs defaultValue="patients" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="patients" className="gap-2"><Users className="h-4 w-4" /> Patients</TabsTrigger>
                <TabsTrigger value="protocol" className="gap-2"><Settings2 className="h-4 w-4" /> Protocol Setup</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search patient code or site..." 
                    value={searchTerm} 
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 w-[220px]"
                  />
                </div>
                <Select value={filterSite} onValueChange={setFilterSite}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Site" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sites</SelectItem>
                    {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterPatientStatus} onValueChange={setFilterPatientStatus}>
                  <SelectTrigger className="w-[170px]"><SelectValue placeholder="Patient status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Screening">Screening</SelectItem>
                    <SelectItem value="Screen failure">Screen failure</SelectItem>
                    <SelectItem value="Included">Included</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                    <SelectItem value="Lost to FUP">Lost to FUP</SelectItem>
                    <SelectItem value="Early exit">Early exit</SelectItem>
                    <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterVisitStatus} onValueChange={setFilterVisitStatus}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Visit status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All visits</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Window">In Window</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Lost Visit">Lost Visit</SelectItem>
                  </SelectContent>
                </Select>
                {(filterSite !== "all" || filterPatientStatus !== "all" || filterVisitStatus !== "all" || searchTerm) && (
                  <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterSite("all"); setFilterPatientStatus("all"); setFilterVisitStatus("all"); }}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <TabsContent value="patients">
              <Card>
                <CardHeader>
                  <CardTitle>Participants List</CardTitle>
                  <CardDescription>Track recruitment and study progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[120px]">Patient Code</TableHead>
                          <TableHead className="min-w-[150px]">Site</TableHead>
                          <TableHead className="min-w-[120px]">Status</TableHead>
                          {protocolVisits.map(pv => (
                            <TableHead key={pv.id} className="text-center min-w-[150px]">
                              {pv.visit_name}
                            </TableHead>
                          ))}
                          <TableHead className="text-center min-w-[100px]">Visits</TableHead>
                          <TableHead className="text-right min-w-[130px]">Expected Value</TableHead>
                          <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow><TableCell colSpan={protocolVisits.length + 6} className="text-center py-10 text-muted-foreground">Loading patients...</TableCell></TableRow>
                        ) : filteredPatients.length === 0 ? (
                          <TableRow><TableCell colSpan={protocolVisits.length + 6} className="text-center py-10 text-muted-foreground">No patients found.</TableCell></TableRow>
                        ) : (
                          filteredPatients.map(p => {
                            const applicableVisits = getVisitsForPatient(p);
                            const completedVisitsCount = patientVisits.filter(v =>
                              v.patient_id === p.id &&
                              v.status === 'Completed' &&
                              applicableVisits.some(pv => pv.id === v.protocol_visit_id)
                            ).length;
                            const totalApplicable = applicableVisits.length;
                            return (
                              <TableRow key={p.id}>
                                <TableCell className="font-bold">{p.patient_code}</TableCell>
                                <TableCell>{p.site?.code} - {p.site?.name}</TableCell>
                                <TableCell>{getStatusBadge(p.status)}</TableCell>
                                
                                {protocolVisits.map(pv => {
                                  if (!visitAppliesToPatient(p, pv)) {
                                    return (
                                      <TableCell key={pv.id} className="text-center text-muted-foreground">
                                        <span title="Not configured for this site">—</span>
                                      </TableCell>
                                    );
                                  }
                                  const visit = patientVisits.find(v => v.patient_id === p.id && v.protocol_visit_id === pv.id);
                                  
                                  let computedStatus = visit?.status || 'Scheduled';
                                  let statusColor = 'bg-slate-100 text-slate-800';
                                  let Icon = null;

                                  if (visit?.status === 'Completed' || visit?.status === 'Complete') {
                                    computedStatus = 'Completed';
                                    statusColor = 'bg-green-500 text-white';
                                    Icon = CheckCircle2;
                                  } else if (visit?.status === 'Lost Visit') {
                                    computedStatus = 'Lost Visit';
                                    statusColor = 'bg-slate-500 text-white';
                                    Icon = X;
                                  } else if (p.enrollment_date) {
                                    const enrollmentDate = new Date(p.enrollment_date);
                                    const targetDate = addDays(enrollmentDate, pv.target_day);
                                    const windowStart = addDays(targetDate, -pv.window_minus);
                                    const windowEnd = addDays(targetDate, pv.window_plus);
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);

                                    if (today > windowEnd) {
                                      computedStatus = 'Overdue';
                                      statusColor = 'bg-red-500 text-white';
                                      Icon = AlertTriangle;
                                    } else if (today >= windowStart && today <= windowEnd) {
                                      computedStatus = 'Window';
                                      statusColor = 'bg-amber-500 text-white';
                                      Icon = Clock;
                                    }
                                  }

                                  return (
                                    <TableCell key={pv.id} className="text-center">
                                      <div className="flex flex-col items-center">
                                        <Badge className={`${statusColor} flex items-center gap-1`}>
                                          {Icon && <Icon className="h-3 w-3" />}
                                          {computedStatus}
                                        </Badge>
                                        {(() => {
                                          const pay = paymentForPatient(p, pv);
                                          return pay.is_paid ? (
                                            <span className="text-[10px] font-semibold text-foreground mt-1">
                                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: pv.currency || 'BRL' }).format(pay.amount)}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-semibold text-muted-foreground mt-1">Not paid</span>
                                          );
                                        })()}
                                        {visit?.actual_date ? (
                                          <span className="text-[10px] text-muted-foreground mt-1">
                                            {formatInBrasilia(visit.actual_date, "dd/MM/yyyy")}
                                          </span>
                                        ) : null}
                                        {p.enrollment_date && (
                                         <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                                           Window: {format(addDays(new Date(p.enrollment_date), pv.target_day - pv.window_minus), "dd/MM/yyyy")} – {format(addDays(new Date(p.enrollment_date), pv.target_day + pv.window_plus), "dd/MM/yyyy")}
                                         </span>
                                       )}
                                      </div>
                                    </TableCell>
                                  );
                                })}

                                <TableCell className="text-center">
                                  <div className="flex flex-col items-center">
                                    <span className="font-semibold">{completedVisitsCount}/{totalApplicable}</span>
                                    <div className="w-20 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                                      <div 
                                        className="h-full bg-primary transition-all" 
                                        style={{ width: `${totalApplicable > 0 ? (completedVisitsCount / totalApplicable) * 100 : 0}%` }}
                                      />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpectedForPatient(p))}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="icon" title="Patient Evolution" onClick={() => {
                                      setSelectedPatientForVisits(p);
                                      setVisitForm({ protocol_visit_id: "", actual_date: todayDateOnly(), status: "Completed", notes: "" });
                                      setVisitDialogOpen(true);
                                    }}>
                                      <ClipboardCheck className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => {
                                      setEditingPatient(p);
                                      setPatientForm({
                                        patient_code: p.patient_code,
                                        site_id: p.site_id,
                                        status: p.status,
                                        enrollment_date: p.enrollment_date || "",
                                        notes: p.notes || ""
                                      });
                                      setPatientDialogOpen(true);
                                    }}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deletePatient(p.id)}><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="protocol">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Visit Schedule Configuration</CardTitle>
                    <CardDescription>Each visit applies to all patients. Set a default payment and override per site (amount or mark as not paid).</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditingSchedule(null);
                    setScheduleForm({
                      visit_name: "",
                      target_day: 0,
                      window_minus: 0,
                      window_plus: 0,
                      payment_amount: 0,
                      is_paid: true,
                      site_overrides: sites.map(s => ({
                        site_id: s.id,
                        enabled: false,
                        is_paid: true,
                        payment_amount: 0,
                      })),
                    });
                    setScheduleDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Visit Type
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Visit Name</TableHead>
                        <TableHead>Target Day</TableHead>
                        <TableHead>Window (-/+)</TableHead>
                        <TableHead>Default Payment</TableHead>
                        <TableHead>Per-site overrides</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visitDefinitions().length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No protocol visits defined.</TableCell></TableRow>
                      ) : (
                        visitDefinitions().map(v => {
                          const overrides = protocolVisits.filter(o => o.site_id !== null && o.visit_name === v.visit_name && o.project_id === v.project_id);
                          return (
                            <TableRow key={v.id}>
                              <TableCell className="font-medium">{v.visit_name}</TableCell>
                              <TableCell>Day {v.target_day}</TableCell>
                              <TableCell>-{v.window_minus} / +{v.window_plus} days</TableCell>
                              <TableCell className="font-mono">
                                {v.is_paid
                                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.payment_amount)
                                  : <span className="text-muted-foreground">Not paid</span>}
                              </TableCell>
                              <TableCell>
                                {overrides.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">All sites use default</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {overrides.map(o => {
                                      const site = sites.find(s => s.id === o.site_id);
                                      return (
                                        <Badge key={o.id} variant="outline" className="text-[10px]">
                                          {site?.code || "?"}: {o.is_paid
                                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.payment_amount)
                                            : "Not paid"}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => {
                                  setEditingSchedule(v);
                                  setScheduleForm({
                                    visit_name: v.visit_name,
                                    target_day: v.target_day,
                                    window_minus: v.window_minus,
                                    window_plus: v.window_plus,
                                    payment_amount: v.payment_amount,
                                    is_paid: v.is_paid,
                                    site_overrides: sites.map(s => {
                                      const o = overrides.find(x => x.site_id === s.id);
                                      return {
                                        site_id: s.id,
                                        enabled: !!o,
                                        is_paid: o ? o.is_paid : true,
                                        payment_amount: o ? Number(o.payment_amount) : v.payment_amount,
                                      };
                                    }),
                                  });
                                  setScheduleDialogOpen(true);
                                }}><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteSchedule(v.id)}><Trash2 className="h-4 w-4" /></Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Patient Edit Dialog */}
      <Dialog open={patientDialogOpen} onOpenChange={setPatientDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPatient ? "Edit" : "New"} Patient</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Patient Code *</Label>
              <Input value={patientForm.patient_code} onChange={e => setPatientForm({...patientForm, patient_code: e.target.value})} placeholder="e.g. 001-001" />
            </div>
            <div className="grid gap-2">
              <Label>Site *</Label>
              <Select value={patientForm.site_id} onValueChange={v => setPatientForm({...patientForm, site_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                <SelectContent>
                  {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={patientForm.status} onValueChange={(v: PatientStatus) => setPatientForm({...patientForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Screening">Screening</SelectItem>
                  <SelectItem value="Screen failure">Screen failure</SelectItem>
                  <SelectItem value="Included">Included</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                  <SelectItem value="Lost to FUP">Lost to FUP</SelectItem>
                  <SelectItem value="Early exit">Early exit</SelectItem>
                  <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Enrollment Date</Label>
              <Input type="date" value={patientForm.enrollment_date} onChange={e => setPatientForm({...patientForm, enrollment_date: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={patientForm.notes || ""} onChange={e => setPatientForm({...patientForm, notes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPatientDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePatient}>Save Patient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Protocol Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Visit</DialogTitle>
            <DialogDescription>This visit applies to all patients. Set a default payment, then override per site if needed.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Visit Name</Label>
              <Input value={scheduleForm.visit_name} onChange={e => setScheduleForm({...scheduleForm, visit_name: e.target.value})} placeholder="e.g. V1 - Baseline" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-2">
                <Label>Target Day</Label>
                <Input type="number" value={scheduleForm.target_day} onChange={e => setScheduleForm({...scheduleForm, target_day: parseInt(e.target.value) || 0})} />
              </div>
              <div className="grid gap-2">
                <Label>Window (-)</Label>
                <Input type="number" value={scheduleForm.window_minus} onChange={e => setScheduleForm({...scheduleForm, window_minus: parseInt(e.target.value) || 0})} />
              </div>
              <div className="grid gap-2">
                <Label>Window (+)</Label>
                <Input type="number" value={scheduleForm.window_plus} onChange={e => setScheduleForm({...scheduleForm, window_plus: parseInt(e.target.value) || 0})} />
              </div>
            </div>

            <div className="border rounded-md p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Default payment (applies to all sites unless overridden)</Label>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={scheduleForm.is_paid}
                    onCheckedChange={(c) => setScheduleForm({ ...scheduleForm, is_paid: !!c })}
                  />
                  Paid
                </label>
              </div>
              <Input
                type="number"
                step="0.01"
                disabled={!scheduleForm.is_paid}
                value={scheduleForm.payment_amount}
                onChange={e => setScheduleForm({...scheduleForm, payment_amount: parseFloat(e.target.value) || 0})}
                placeholder="0.00 (BRL)"
              />
            </div>

            <div className="grid gap-2">
              <Label className="font-semibold">Per-site overrides</Label>
              <p className="text-[11px] text-muted-foreground">Enable a site to use a different amount or mark this visit as not paid for that site.</p>
              <div className="border rounded-md max-h-[260px] overflow-y-auto">
                {sites.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">No sites in this project.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Use</TableHead>
                        <TableHead>Site</TableHead>
                        <TableHead className="w-[80px]">Paid</TableHead>
                        <TableHead className="w-[140px]">Amount (BRL)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sites.map(s => {
                        const idx = scheduleForm.site_overrides.findIndex(o => o.site_id === s.id);
                        const o = idx >= 0 ? scheduleForm.site_overrides[idx] : { site_id: s.id, enabled: false, is_paid: true, payment_amount: scheduleForm.payment_amount };
                        const update = (patch: Partial<SiteOverrideForm>) => {
                          const next = [...scheduleForm.site_overrides];
                          if (idx >= 0) next[idx] = { ...next[idx], ...patch };
                          else next.push({ ...o, ...patch });
                          setScheduleForm({ ...scheduleForm, site_overrides: next });
                        };
                        return (
                          <TableRow key={s.id}>
                            <TableCell>
                              <Checkbox checked={o.enabled} onCheckedChange={(c) => update({ enabled: !!c })} />
                            </TableCell>
                            <TableCell className="text-xs">{s.code} {s.name ? `– ${s.name}` : ""}</TableCell>
                            <TableCell>
                              <Checkbox
                                checked={o.is_paid}
                                disabled={!o.enabled}
                                onCheckedChange={(c) => update({ is_paid: !!c })}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                disabled={!o.enabled || !o.is_paid}
                                value={o.payment_amount}
                                onChange={e => update({ payment_amount: parseFloat(e.target.value) || 0 })}
                                className="h-8"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSchedule}>Save Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Evolution Dialog */}
      <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Patient Evolution - {selectedPatientForVisits?.patient_code}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Record New Visit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Protocol Visit</Label>
                    <Select value={visitForm.protocol_visit_id} onValueChange={v => {
                      const pv = protocolVisits.find(x => x.id === v);
                      const enroll = selectedPatientForVisits?.enrollment_date;
                      const targetDate = pv && enroll ? format(addDays(new Date(enroll), pv.target_day), "yyyy-MM-dd") : visitForm.actual_date;
                      setVisitForm({ ...visitForm, protocol_visit_id: v, actual_date: targetDate });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select visit..." /></SelectTrigger>
                      <SelectContent>
                        {protocolVisits.map(pv => (
                          <SelectItem key={pv.id} value={pv.id}>{pv.visit_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Date Performed</Label>
                    <Input type="date" value={visitForm.actual_date} onChange={e => setVisitForm({...visitForm, actual_date: e.target.value})} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea value={visitForm.notes} onChange={e => setVisitForm({...visitForm, notes: e.target.value})} placeholder="Observations during visit..." />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => {
                    const newVisitForm = { ...visitForm, status: "Completed" };
                    setVisitForm(newVisitForm);
                    // Use a temporary object because state update is async
                    handleSaveVisitExplicit("Completed");
                  }}>
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Visit Completion
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => {
                    const newVisitForm = { ...visitForm, status: "Lost Visit" };
                    setVisitForm(newVisitForm);
                    handleSaveVisitExplicit("Lost Visit");
                  }}>
                    <X className="h-4 w-4 mr-2" />
                    Lost Visit
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4" />
                Visit History
              </h4>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visit</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientVisits.filter(v => v.patient_id === selectedPatientForVisits?.id).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">No visits recorded yet.</TableCell></TableRow>
                    ) : (
                      patientVisits.filter(v => v.patient_id === selectedPatientForVisits?.id).map(v => (
                        <TableRow key={v.id}>
                          <TableCell className="text-xs font-medium">{v.protocol_visit?.visit_name}</TableCell>
                          <TableCell className="text-xs">{v.actual_date ? formatInBrasilia(v.actual_date, "dd/MM/yyyy") : "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] h-5">{v.status}</Badge></TableCell>
                          <TableCell><Badge className="text-[10px] h-5 bg-green-100 text-green-800">{v.payment_status}</Badge></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

const Users = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M10.25 3.13a4 4 0 0 1 7.75 0"/></svg>
);
