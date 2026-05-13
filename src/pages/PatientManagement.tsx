import { useState, useEffect, useCallback, useMemo } from "react";
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

interface Patient {
  id: string;
  project_id: string;
  site_id: string;
  patient_code: string;
  status: PatientStatus;
  enrollment_date: string | null;
  randomization_date: string | null;
  notes: string | null;
  site?: { code: string; name: string | null };
}

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

  // Dialog States
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientForm, setPatientForm] = useState({
    patient_code: "",
    site_id: "",
    status: "Screening" as PatientStatus,
    enrollment_date: "",
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
    site_ids: string[];
  }>({
    visit_name: "",
    target_day: 0,
    window_minus: 0,
    window_plus: 0,
    payment_amount: 0,
    site_ids: [] // Can be empty for global study schedule
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
    // If multiple sites are selected, we save one record for each.
    // If none are selected, it's global (site_id = null).
    const siteIdsToSave = scheduleForm.site_ids.length > 0 ? scheduleForm.site_ids : [null];
    
    const updates = siteIdsToSave.map(siteId => ({
      project_id: selectedProject,
      site_id: siteId,
      visit_name: scheduleForm.visit_name,
      target_day: scheduleForm.target_day,
      window_minus: scheduleForm.window_minus,
      window_plus: scheduleForm.window_plus,
      payment_amount: scheduleForm.payment_amount
    }));

    let error;
    if (editingSchedule) {
      // If editing, we update the specific record. We use updates[0] but with the original site_id logic
      const { error: err } = await supabase.from("protocol_visit_schedules").update({
        visit_name: scheduleForm.visit_name,
        target_day: scheduleForm.target_day,
        window_minus: scheduleForm.window_minus,
        window_plus: scheduleForm.window_plus,
        payment_amount: scheduleForm.payment_amount,
        site_id: updates[0].site_id
      }).eq("id", editingSchedule.id);
      error = err;
    } else {
      const { error: err } = await supabase.from("protocol_visit_schedules").insert(updates);
      error = err;
    }

    if (error) {
      toast.error("Error saving schedule");
    } else {
      toast.success("Schedule updated");
      setScheduleDialogOpen(false);
      loadProjectData();
    }
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
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) toast.error("Error deleting patient");
    else loadProjectData();
  };

  const filteredPatients = patients.filter(p => 
    p.patient_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.site?.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    
    // Patients Sheet
    const patientsData = patients.map(p => ({
      'Código do Paciente': p.patient_code,
      'Centro (ID)': p.site_id,
      'Centro (Código)': p.site?.code || '',
      'Status': p.status,
      'Data de Inclusão': p.enrollment_date,
      'Notas': p.notes
    }));
    const patientsSheet = XLSX.utils.json_to_sheet(patientsData);
    XLSX.utils.book_append_sheet(workbook, patientsSheet, "Pacientes");

    // Protocol Visits Sheet
    const protocolData = protocolVisits.map(v => ({
      'Nome da Visita': v.visit_name,
      'Dia Alvo': v.target_day,
      'Janela Negativa': v.window_minus,
      'Janela Positiva': v.window_plus,
      'Valor do Pagamento': v.payment_amount,
      'Centro (ID)': v.site_id || 'Global'
    }));
    const protocolSheet = XLSX.utils.json_to_sheet(protocolData);
    XLSX.utils.book_append_sheet(workbook, protocolSheet, "Protocolo");

    XLSX.writeFile(workbook, `patient-management-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success("Dados exportados para Excel");
  };

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    
    const patientsTemplate = [{
      'Código do Paciente': 'PAC-001',
      'Centro (ID)': sites[0]?.id || 'ID_DO_CENTRO',
      'Status': 'Screening',
      'Notas': 'Exemplo'
    }];
    
    // Create a visits sample row based on protocol setup
    const visitsTemplate: any = {
      'Código do Paciente': 'PAC-001'
    };
    
    protocolVisits.forEach(v => {
      visitsTemplate[`${v.visit_name} (Data)`] = format(new Date(), 'yyyy-MM-dd');
      visitsTemplate[`${v.visit_name} (Status)`] = 'Completed';
    });
    
    if (protocolVisits.length === 0) {
      visitsTemplate['Visita Exemplo (Data)'] = format(new Date(), 'yyyy-MM-dd');
      visitsTemplate['Visita Exemplo (Status)'] = 'Completed';
    }

    const patientsSheet = XLSX.utils.json_to_sheet(patientsTemplate);
    XLSX.utils.book_append_sheet(workbook, patientsSheet, "Pacientes");

    const visitsSheet = XLSX.utils.json_to_sheet([visitsTemplate]);
    XLSX.utils.book_append_sheet(workbook, visitsSheet, "Visitas");

    const protocolTemplate = [{
      'Nome da Visita': 'V1 - Screening',
      'Dia Alvo': 0,
      'Janela Negativa': 0,
      'Janela Positiva': 0,
      'Valor do Pagamento': 500.00,
      'Centro (ID)': 'Global'
    }];
    const protocolSheet = XLSX.utils.json_to_sheet(protocolTemplate);
    XLSX.utils.book_append_sheet(workbook, protocolSheet, "Protocolo");

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

        // Import Protocol (Aba Protocolo)
        if (workbook.SheetNames.includes("Protocolo")) {
          const protocolRows = XLSX.utils.sheet_to_json(workbook.Sheets["Protocolo"]) as any[];
          for (const row of protocolRows) {
            await supabase.from("protocol_visit_schedules").upsert({
              project_id: selectedProject,
              visit_name: row['Nome da Visita'],
              target_day: Number(row['Dia Alvo']),
              window_minus: Number(row['Janela Negativa']),
              window_plus: Number(row['Janela Positiva']),
              payment_amount: Number(row['Valor do Pagamento']),
              site_id: row['Centro (ID)'] === 'Global' ? null : row['Centro (ID)']
            });
          }
        }

        // Import Patients (Aba Pacientes)
        let importedPatientsMap = new Map<string, string>(); // Code to ID
        if (workbook.SheetNames.includes("Pacientes")) {
          const patientRows = XLSX.utils.sheet_to_json(workbook.Sheets["Pacientes"]) as any[];
          for (const row of patientRows) {
            const { data, error } = await supabase.from("patients").upsert({
              project_id: selectedProject,
              patient_code: row['Código do Paciente'],
              site_id: row['Centro (ID)'],
              status: (row['Status'] === 'Complete' ? 'Completed' : 
                       row['Status'] === 'Included' ? 'Randomized' : 
                       row['Status'] === 'Screen failure' ? 'Screen Failure' :
                       row['Status'] === 'Lost to FUP' ? 'Lost to Follow-up' :
                       row['Status'] === 'Early exit' ? 'Early Exit' : row['Status']) as any,
              notes: row['Notas'] || null
            }).select('id').single();
            
            if (data) {
              importedPatientsMap.set(row['Código do Paciente'], data.id);
            }
          }
        }

        // Import Visits (Aba Visitas)
        if (workbook.SheetNames.includes("Visitas")) {
          const visitRows = XLSX.utils.sheet_to_json(workbook.Sheets["Visitas"]) as any[];
          // Reload protocol visits to have IDs
          const { data: pvSchedules } = await supabase.from("protocol_visit_schedules").select("*").eq("project_id", selectedProject);
          
          for (const row of visitRows) {
            const patientCode = row['Código do Paciente'];
            const patientId = importedPatientsMap.get(patientCode) || patients.find(p => p.patient_code === patientCode)?.id;
            
            if (!patientId) continue;

            for (const pv of (pvSchedules || [])) {
              const dateKey = `${pv.visit_name} (Data)`;
              const statusKey = `${pv.visit_name} (Status)`;
              
              if (row[dateKey] || row[statusKey]) {
                await supabase.from("patient_visits").upsert({
                  patient_id: patientId,
                  protocol_visit_id: pv.id,
                  actual_date: row[dateKey] || null,
                  status: row[statusKey] || 'Completed',
                  payment_status: 'Pending'
                });
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
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search patient code or site..." 
                    value={searchTerm} 
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 w-[250px]"
                  />
                </div>
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
                          <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow><TableCell colSpan={protocolVisits.length + 5} className="text-center py-10 text-muted-foreground">Loading patients...</TableCell></TableRow>
                        ) : filteredPatients.length === 0 ? (
                          <TableRow><TableCell colSpan={protocolVisits.length + 5} className="text-center py-10 text-muted-foreground">No patients found.</TableCell></TableRow>
                        ) : (
                          filteredPatients.map(p => {
                            const completedVisitsCount = patientVisits.filter(v => v.patient_id === p.id && v.status === 'Completed').length;
                            return (
                              <TableRow key={p.id}>
                                <TableCell className="font-bold">{p.patient_code}</TableCell>
                                <TableCell>{p.site?.code} - {p.site?.name}</TableCell>
                                <TableCell>{getStatusBadge(p.status)}</TableCell>
                                
                                {protocolVisits.map(pv => {
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
                                        {visit?.actual_date ? (
                                          <span className="text-[10px] text-muted-foreground mt-1">
                                            {format(new Date(visit.actual_date), "dd/MM/yyyy")}
                                          </span>
                                        ) : p.enrollment_date ? (
                                          <span className="text-[10px] text-muted-foreground mt-1">
                                            Exp: {format(addDays(new Date(p.enrollment_date), pv.target_day), "dd/MM/yyyy")}
                                          </span>
                                        ) : null}
                                      </div>
                                    </TableCell>
                                  );
                                })}

                                <TableCell className="text-center">
                                  <div className="flex flex-col items-center">
                                    <span className="font-semibold">{completedVisitsCount}/{protocolVisits.length}</span>
                                    <div className="w-20 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                                      <div 
                                        className="h-full bg-primary transition-all" 
                                        style={{ width: `${protocolVisits.length > 0 ? (completedVisitsCount / protocolVisits.length) * 100 : 0}%` }}
                                      />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="icon" title="Patient Evolution" onClick={() => {
                                      setSelectedPatientForVisits(p);
                                      setVisitForm({ protocol_visit_id: "", actual_date: format(new Date(), "yyyy-MM-dd"), status: "Completed", notes: "" });
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
                    <CardDescription>Define target days, windows, and payments per visit</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditingSchedule(null);
                    setScheduleForm({ visit_name: "", target_day: 0, window_minus: 0, window_plus: 0, payment_amount: 0, site_ids: [] });
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
                        <TableHead>Payment (BRL)</TableHead>
                        <TableHead>Scope</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {protocolVisits.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No protocol visits defined.</TableCell></TableRow>
                      ) : (
                        protocolVisits.map(v => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">{v.visit_name}</TableCell>
                            <TableCell>Day {v.target_day}</TableCell>
                            <TableCell>-{v.window_minus} / +{v.window_plus} days</TableCell>
                            <TableCell className="font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.payment_amount)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{v.site_id ? "Site Specific" : "Global"}</Badge>
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
                                  site_id: v.site_id || ""
                                });
                                setScheduleDialogOpen(true);
                              }}><Pencil className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))
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
        <DialogContent>
          <DialogHeader><DialogTitle>Configure Visit</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Visit Name</Label>
              <Input value={scheduleForm.visit_name} onChange={e => setScheduleForm({...scheduleForm, visit_name: e.target.value})} placeholder="e.g. V1 - Baseline" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-2">
                <Label>Target Day</Label>
                <Input type="number" value={scheduleForm.target_day} onChange={e => setScheduleForm({...scheduleForm, target_day: parseInt(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Window (-)</Label>
                <Input type="number" value={scheduleForm.window_minus} onChange={e => setScheduleForm({...scheduleForm, window_minus: parseInt(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Window (+)</Label>
                <Input type="number" value={scheduleForm.window_plus} onChange={e => setScheduleForm({...scheduleForm, window_plus: parseInt(e.target.value)})} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Payment Amount (BRL)</Label>
              <Input type="number" value={scheduleForm.payment_amount} onChange={e => setScheduleForm({...scheduleForm, payment_amount: parseFloat(e.target.value)})} />
            </div>
            <div className="grid gap-2">
              <Label>Site Specific (optional)</Label>
              <Select value={scheduleForm.site_id} onValueChange={v => setScheduleForm({...scheduleForm, site_id: v})}>
                <SelectTrigger><SelectValue placeholder="Global (all sites)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Global Study-wide</SelectItem>
                  {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
                    <Select value={visitForm.protocol_visit_id} onValueChange={v => setVisitForm({...visitForm, protocol_visit_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select visit..." /></SelectTrigger>
                      <SelectContent>
                        {protocolVisits.map(pv => (
                          <SelectItem key={pv.id} value={pv.id}>{pv.visit_name} (Target Day {pv.target_day})</SelectItem>
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
                          <TableCell className="text-xs">{v.actual_date ? format(new Date(v.actual_date), "dd/MM/yyyy") : "—"}</TableCell>
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
