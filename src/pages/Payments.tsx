import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CTMSNav from "@/components/CTMSNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { DollarSign, Download, Users, AlertCircle, CheckCircle2, Building2, History, Pencil, Plus, CalendarDays, TrendingUp, Briefcase, Trash2, Settings2, RefreshCw, ExternalLink, AlertTriangle, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EditPaymentDialog } from "@/components/payments/EditPaymentDialog";
import { RegisterPaymentDialog } from "@/components/payments/RegisterPaymentDialog";
import { IndividualPaymentDialog } from "@/components/payments/IndividualPaymentDialog";
import { NewCenterPaymentDialog } from "@/components/payments/NewCenterPaymentDialog";
import { EditParticipantPaymentsDialog } from "@/components/payments/EditParticipantPaymentsDialog";
import { VendorManagementDialog } from "@/components/payments/VendorManagementDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";
import { parseLocalDate, todayDateOnly, formatDateOnly } from "@/lib/dateUtils";


interface Project {
  id: string;
  title: string;
  budget: number | null;
}

interface VisitType {
  id: string;
  visit_number: number;
  name: string;
  value: number;
}

interface Visit {
  id: string;
  participant_id: string;
  visit_number: number;
  status: string;
  payment_status: string;
  payment_amount: number | null;
  scheduled_date: string | null;
  completed_at: string | null;
}

interface Participant {
  id: string;
  participant_code: string;
  name: string;
  research_center: string | null;
}

interface ResearchCenter {
  id: string;
  code: string;
  name: string | null;
}

interface ParticipantPayment {
  participant_id: string;
  participant_code: string;
  research_center: string;
  completed_visits: number;
  paid_visits: number;
  pending_payment: number;
  total_earned: number;
  total_paid: number;
}

interface CenterSummary {
  code: string;
  name: string | null;
  participants: number;
  pending_payment: number;
}

interface PaymentHistoryRecord {
  id: string;
  participant_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
  participant?: {
    participant_code: string;
    name: string;
    research_center: string | null;
  };
}

interface VendorPayment {
  id: string;
  vendor_name: string;
  vendor_id: string | null;
  category: string;
  description: string | null;
  amount: number;
  payment_date: string;
  invoice_number: string | null;
  recurrence_type: string | null;
  recurrence_end_date: string | null;
  status: string;
  paid_at: string | null;
  drive_folder_link: string | null;
  cost_center?: string | null;
  value_class?: string | null;
  protheus_code?: string | null;
  created_at: string;
}

interface Vendor {
  id: string;
  name: string;
}

export default function Payments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get("project");
  const { projectId: persistedProjectId, setProjectId: setPersistedProjectId } = usePersistedFilters();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [visitTypes, setVisitTypes] = useState<VisitType[]>([]);
  const [protocolSchedules, setProtocolSchedules] = useState<any[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantPayments, setParticipantPayments] = useState<ParticipantPayment[]>([]);
  const [centerSummaries, setCenterSummaries] = useState<CenterSummary[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCenter, setFilterCenter] = useState<string>("");
  const [selectedCenterTab, setSelectedCenterTab] = useState<string>("");
  const [editingPayment, setEditingPayment] = useState<PaymentHistoryRecord | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<CenterSummary | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantPayment | null>(null);
  const [historyStartDate, setHistoryStartDate] = useState<string>("");
  const [historyEndDate, setHistoryEndDate] = useState<string>("");
  const [historyCenterFilter, setHistoryCenterFilter] = useState<string>("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>("");
  const [individualPaymentDialogOpen, setIndividualPaymentDialogOpen] = useState(false);
  const [newCenterPaymentOpen, setNewCenterPaymentOpen] = useState(false);
  const [editParticipantPaymentsOpen, setEditParticipantPaymentsOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<ParticipantPayment | null>(null);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set());
  const [indicatorStartDate, setIndicatorStartDate] = useState<string>("");
  const [indicatorEndDate, setIndicatorEndDate] = useState<string>("");
  const [vendorPayments, setVendorPayments] = useState<VendorPayment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [receiptsFolderLink, setReceiptsFolderLink] = useState<string>("");
  const [vendorManagementOpen, setVendorManagementOpen] = useState(false);
  const [vendorFormData, setVendorFormData] = useState({
    vendor_id: "",
    vendor_name: "",
    category: "other",
    description: "",
    amount: "",
    payment_date: todayDateOnly(),
    invoice_number: "",
    recurrence_type: "none",
    recurrence_end_date: "",
    status: "programado",
    cost_center: "",
    value_class: "",
    project_id: "" as string, // "" = use selectedProject; "__na__" = not applicable; otherwise specific project id
  });
  const [vendorLoading, setVendorLoading] = useState(false);
  const [newVendorPaymentOpen, setNewVendorPaymentOpen] = useState(false);
  const [paymentConfirmDialog, setPaymentConfirmDialog] = useState<{
    open: boolean;
    paymentId: string;
    paidAt: string;
    driveFolderLink: string;
  }>({
    open: false,
    paymentId: "",
    paidAt: todayDateOnly(),
    driveFolderLink: "",
  });

  useEffect(() => {
    checkAuth();
    loadProjects();
  }, []);

  useEffect(() => {
    if (projectIdFromUrl && projects.length > 0) {
      setSelectedProject(projectIdFromUrl);
      setPersistedProjectId(projectIdFromUrl);
    } else if (persistedProjectId && projects.length > 0 && !selectedProject) {
      // Use persisted project if no URL param and no selection yet
      const projectExists = projects.some(p => p.id === persistedProjectId);
      if (projectExists) {
        setSelectedProject(persistedProjectId);
      } else if (projects.length > 0) {
        setSelectedProject(projects[0].id);
        setPersistedProjectId(projects[0].id);
      }
    } else if (!selectedProject && projects.length > 0) {
      // Default to first project if nothing selected
      setSelectedProject(projects[0].id);
      setPersistedProjectId(projects[0].id);
    }
  }, [projectIdFromUrl, projects, persistedProjectId]);

  useEffect(() => {
    if (selectedProject) {
      loadProjectData();
      loadPaymentHistory();
      loadVendorPayments();
      loadVendors();
      subscribeToVisits();
    }
  }, [selectedProject]);

  const loadVendors = useCallback(async () => {
    const { data, error } = await supabase
      .from("vendors")
      .select("id, name")
      .eq("project_id", selectedProject)
      .order("name");

    if (error) {
      console.error("Error loading vendors:", error);
      return;
    }

    setVendors(data || []);
  }, [selectedProject]);

  const loadVendorPayments = useCallback(async () => {
    const { data, error } = await supabase
      .from("vendor_payments")
      .select("*")
      .eq("project_id", selectedProject)
      .order("payment_date", { ascending: false });

    if (error) {
      console.error("Error loading vendor payments:", error);
      return;
    }

    setVendorPayments(data || []);
  }, [selectedProject]);

  const addVendorPayment = async () => {
    if (!vendorFormData.vendor_name.trim() || !vendorFormData.amount) {
      toast.error("Preencha o nome do fornecedor e o valor");
      return;
    }

    setVendorLoading(true);
    
    const resolvedProjectId =
      vendorFormData.project_id === "__na__"
        ? null
        : vendorFormData.project_id || selectedProject;

    const paymentData = {
      project_id: resolvedProjectId,
      vendor_id: vendorFormData.vendor_id || null,
      vendor_name: vendorFormData.vendor_name.trim(),
      category: vendorFormData.category,
      description: vendorFormData.description.trim() || null,
      amount: parseFloat(vendorFormData.amount),
      payment_date: vendorFormData.payment_date,
      invoice_number: vendorFormData.invoice_number.trim() || null,
      recurrence_type: vendorFormData.recurrence_type,
      recurrence_end_date: vendorFormData.recurrence_end_date || null,
      status: vendorFormData.status,
      cost_center: vendorFormData.cost_center.trim() || null,
      value_class: vendorFormData.value_class.trim() || null,
    };

    const { error } = await supabase
      .from("vendor_payments")
      .insert(paymentData);

    if (error) {
      setVendorLoading(false);
      toast.error("Erro ao adicionar pagamento");
      console.error(error);
      return;
    }

    // If recurrence is set, create future payments
    if (vendorFormData.recurrence_type !== "none" && vendorFormData.recurrence_end_date) {
      const recurrencePayments = [];
      let nextDate = parseLocalDate(vendorFormData.payment_date);
      const endDate = parseLocalDate(vendorFormData.recurrence_end_date);

      while (nextDate < endDate) {
        if (vendorFormData.recurrence_type === "monthly") {
          nextDate = parseLocalDate(nextDate.setMonth(nextDate.getMonth() + 1));
        } else if (vendorFormData.recurrence_type === "quarterly") {
          nextDate = parseLocalDate(nextDate.setMonth(nextDate.getMonth() + 3));
        } else if (vendorFormData.recurrence_type === "semiannual") {
          nextDate = parseLocalDate(nextDate.setMonth(nextDate.getMonth() + 6));
        } else if (vendorFormData.recurrence_type === "annual") {
          nextDate = parseLocalDate(nextDate.setFullYear(nextDate.getFullYear() + 1));
        }

        if (nextDate <= endDate) {
          recurrencePayments.push({
            ...paymentData,
            payment_date: formatDateOnly(nextDate),
          });
        }
      }

      if (recurrencePayments.length > 0) {
        await supabase.from("vendor_payments").insert(recurrencePayments);
      }
    }

    setVendorLoading(false);
    toast.success("Pagamento de vendor registrado!");
    setVendorFormData({
      vendor_id: "",
      vendor_name: "",
      category: "other",
      description: "",
      amount: "",
      payment_date: todayDateOnly(),
      invoice_number: "",
      recurrence_type: "none",
      recurrence_end_date: "",
      status: "programado",
      cost_center: "",
      value_class: "",
      project_id: "",
    });
    loadVendorPayments();
  };

  const deleteVendorPayment = async (id: string) => {
    const { error } = await supabase
      .from("vendor_payments")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir pagamento");
      return;
    }

    toast.success("Pagamento excluído!");
    loadVendorPayments();
  };

  const updateVendorPaymentStatus = async (id: string, newStatus: string) => {
    if (newStatus === "pago") {
      // Open dialog to get paid_at date
      setPaymentConfirmDialog({
        open: true,
        paymentId: id,
        paidAt: todayDateOnly(),
        driveFolderLink: "",
      });
      return;
    }

    // If changing back to "programado", clear paid_at
    const { error } = await supabase
      .from("vendor_payments")
      .update({ status: newStatus, paid_at: null })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    toast.success("Status atualizado para Programado");
    loadVendorPayments();
  };

  const confirmVendorPayment = async () => {
    if (!paymentConfirmDialog.paidAt) {
      toast.error("Informe a data do pagamento");
      return;
    }

    const { error } = await supabase
      .from("vendor_payments")
      .update({
        status: "pago",
        paid_at: paymentConfirmDialog.paidAt,
        drive_folder_link: paymentConfirmDialog.driveFolderLink || null,
      })
      .eq("id", paymentConfirmDialog.paymentId);

    if (error) {
      toast.error("Erro ao confirmar pagamento");
      return;
    }

    toast.success("Pagamento confirmado!");
    setPaymentConfirmDialog({ open: false, paymentId: "", paidAt: "", driveFolderLink: "" });
    loadVendorPayments();
  };

  const updateVendorDriveLink = async (id: string, link: string) => {
    const { error } = await supabase
      .from("vendor_payments")
      .update({ drive_folder_link: link || null })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar link");
      return;
    }

    toast.success("Link atualizado!");
    loadVendorPayments();
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, budget")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar projetos");
      return;
    }
    setProjects(data || []);
    setLoading(false);
  };

  const loadProjectData = useCallback(async () => {
    // Load protocol visit schedules from Patient Management module
    const { data: protocolSchedulesData } = await supabase
      .from("protocol_visit_schedules")
      .select("id, visit_name, target_day, payment_amount")
      .eq("project_id", selectedProject)
      .order("target_day");

    setProtocolSchedules(protocolSchedulesData || []);
    setVisitTypes((protocolSchedulesData || []).map(ps => ({
      id: ps.id,
      visit_number: ps.target_day,
      name: ps.visit_name,
      value: ps.payment_amount
    })));

    // Load research centers
    const { data: centers } = await supabase
      .from("research_centers")
      .select("id, code, name")
      .eq("project_id", selectedProject)
      .order("code");

    // Load patients from the new Patient Management module
    const { data: patientsBase } = await supabase
      .from("patients")
      .select("id, patient_code, site_id, status")
      .eq("project_id", selectedProject);

    const participants: Participant[] = (patientsBase || []).map(p => {
      const site = centers?.find(c => c.id === p.site_id);
      return {
        id: p.id,
        participant_code: p.patient_code,
        name: `Patient ${p.patient_code}`,
        research_center: site?.code || null
      };
    });

    if (participants.length === 0) {
      setParticipantPayments([]);
      setCenterSummaries([]);
      return;
    }

    // Load patient visits from the Patient Management module
      // Load ALL patient visits (not just completed) from the Patient Management module
      const { data: patientVisitsRes } = await supabase
        .from("patient_visits")
        .select("*, protocol_visit:protocol_visit_schedules(*)")
        .order("actual_date");

    const visitsData = (patientVisitsRes || []).map(pv => ({
      id: pv.id,
      participant_id: pv.patient_id,
      visit_number: pv.protocol_visit?.target_day || 0,
      status: pv.status.toLowerCase(),
      payment_status: pv.payment_status?.toLowerCase() || "pending",
      payment_amount: pv.protocol_visit?.payment_amount || 0,
      scheduled_date: null,
      completed_at: pv.actual_date
    }));

    setParticipants(participants || []);
    setVisits(visitsData || []);

    // Calculate payment data for each participant using visit_types values
    const payments: ParticipantPayment[] = participants.map((participant) => {
      const participantVisits = visitsData?.filter((v) => v.participant_id === participant.id) || [];
      
      let totalPaid = 0;
      let completedCount = 0;
      let paidCount = 0;
      let pendingValue = 0;

      participantVisits.forEach((visit) => {
        const visitType = protocolSchedulesData?.find(vt => vt.target_day === visit.visit_number);
        const visitValue = visit.payment_amount ?? visitType?.payment_amount ?? 0;

        if (visit.payment_status === "paid") {
          paidCount++;
          totalPaid += Number(visitValue);
        } else {
          // All visits not marked as "paid" contribute to pending value
          pendingValue += Number(visitValue);
        }

        if (visit.status === "completed") {
          completedCount++;
        }
      });

      return {
        participant_id: participant.id,
        participant_code: participant.participant_code,
        research_center: participant.research_center || "Sem Centro",
        completed_visits: completedCount,
        paid_visits: paidCount,
        pending_payment: pendingValue,
        total_earned: totalPaid + pendingValue, // Total Acumulado
        total_paid: totalPaid,
      };
    });

    setParticipantPayments(payments);

    // Calculate center summaries
    const centerMap = new Map<string, CenterSummary>();
    
    // Initialize with all centers
    centers?.forEach(center => {
      centerMap.set(center.code, {
        code: center.code,
        name: center.name,
        participants: 0,
        pending_payment: 0,
      });
    });

    // Add data from payments
    payments.forEach(payment => {
      const centerCode = payment.research_center;
      if (!centerMap.has(centerCode)) {
        centerMap.set(centerCode, {
          code: centerCode,
          name: null,
          participants: 0,
          pending_payment: 0,
        });
      }
      
      const center = centerMap.get(centerCode)!;
      center.participants++;
      center.pending_payment += payment.pending_payment;
    });

    setCenterSummaries(Array.from(centerMap.values()).sort((a, b) => a.code.localeCompare(b.code)));

    // Load receipts folder link from payment_configs
    const { data: paymentConfig } = await supabase
      .from("payment_configs")
      .select("receipts_folder_link")
      .eq("project_id", selectedProject)
      .maybeSingle();

    setReceiptsFolderLink(paymentConfig?.receipts_folder_link || "");
  }, [selectedProject]);

  const loadPaymentHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from("payment_history")
      .select(`
        id,
        participant_id,
        amount,
        payment_date,
        notes,
        created_at,
        participants!inner(participant_code, name, research_center)
      `)
      .eq("project_id", selectedProject)
      .order("payment_date", { ascending: false });

    if (error) {
      console.error("Error loading payment history:", error);
      return;
    }

    const formattedData: PaymentHistoryRecord[] = (data || []).map((record: any) => ({
      id: record.id,
      participant_id: record.participant_id,
      amount: record.amount,
      payment_date: record.payment_date,
      notes: record.notes,
      created_at: record.created_at,
      participant: record.participants ? {
        participant_code: record.participants.participant_code,
        name: record.participants.name,
        research_center: record.participants.research_center,
      } : undefined,
    }));

    setPaymentHistory(formattedData);
  }, [selectedProject]);

  const subscribeToVisits = () => {
    const channel = supabase
      .channel("payments-visits-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visits", filter: `project_id=eq.${selectedProject}` },
        () => loadProjectData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `project_id=eq.${selectedProject}` },
        () => loadProjectData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patients", filter: `project_id=eq.${selectedProject}` },
        () => loadProjectData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_visits" },
        () => loadProjectData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_history", filter: `project_id=eq.${selectedProject}` },
        () => loadPaymentHistory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsPaid = async (participantId: string, paymentDate: string, notes: string) => {
    const payment = participantPayments.find(p => p.participant_id === participantId);
    if (!payment || payment.pending_payment === 0) {
      toast.info("Não há pagamentos pendentes para este participante");
      return;
    }

    // Identify visits from standard 'visits' table
    const { data: unpaidVisits, error: fetchError } = await supabase
      .from("visits")
      .select("id")
      .eq("participant_id", participantId)
      .eq("status", "completed")
      .eq("payment_status", "pending");

    // Identify visits from newer 'patient_visits' table
    const { data: unpaidPatientVisits, error: fetchPatientError } = await supabase
      .from("patient_visits")
      .select("id")
      .eq("patient_id", participantId)
      .eq("status", "Completed")
      .eq("payment_status", "Pending");

    if (fetchError || fetchPatientError) {
      toast.error("Erro ao buscar visitas");
      return;
    }

    const totalUnpaid = (unpaidVisits?.length || 0) + (unpaidPatientVisits?.length || 0);

    if (totalUnpaid === 0) {
      toast.info("Não há pagamentos pendentes para este participante");
      return;
    }

    const updatePromises = [];

    // Update standard visits
    if (unpaidVisits && unpaidVisits.length > 0) {
      updatePromises.push(
        supabase
          .from("visits")
          .update({
            payment_status: "paid",
            paid_at: new Date().toISOString(),
          })
          .in("id", unpaidVisits.map((v) => v.id))
      );
    }

    // Update newer patient visits
    if (unpaidPatientVisits && unpaidPatientVisits.length > 0) {
      updatePromises.push(
        supabase
          .from("patient_visits")
          .update({
            payment_status: "Paid",
          })
          .in("id", unpaidPatientVisits.map((v) => v.id))
      );
    }

    const results = await Promise.all(updatePromises);
    const hasError = results.some(r => r.error);

    if (hasError) {
      toast.error("Erro ao registrar pagamento");
      return;
    }

    // Create history record
    const { error: historyError } = await supabase
      .from("payment_history")
      .insert({
        project_id: selectedProject,
        participant_id: participantId,
        amount: payment.pending_payment,
        payment_date: paymentDate,
        notes: notes || null,
      });

    if (historyError) {
      console.error("Error creating history:", historyError);
    }

    toast.success("Pagamento registrado com sucesso!");
    loadProjectData();
    loadPaymentHistory();
  };

  const markCenterAsPaid = async (centerCode: string, paymentDate: string, notes: string) => {
    // Filter by selected participants if any are selected, otherwise use all pending
    const allCenterParticipants = participantPayments.filter(p => p.research_center === centerCode && p.pending_payment > 0);
    const centerParticipants = allCenterParticipants.filter(p => selectedParticipantIds.has(p.participant_id));
    
    if (centerParticipants.length === 0) {
      toast.info("Nenhum participante selecionado com pagamento pendente");
      return;
    }

    const participantIds = centerParticipants.map(p => p.participant_id);

    // standard table
    const { data: unpaidVisits, error: fetchError } = await supabase
      .from("visits")
      .select("id")
      .in("participant_id", participantIds)
      .eq("status", "completed")
      .eq("payment_status", "pending");

    // newer table
    const { data: unpaidPatientVisits, error: fetchPatientError } = await supabase
      .from("patient_visits")
      .select("id")
      .in("patient_id", participantIds)
      .eq("status", "Completed")
      .eq("payment_status", "Pending");

    if (fetchError || fetchPatientError) {
      toast.error("Erro ao buscar visitas");
      return;
    }

    const totalUnpaid = (unpaidVisits?.length || 0) + (unpaidPatientVisits?.length || 0);

    if (totalUnpaid === 0) {
      toast.info("Não há pagamentos pendentes para os participantes selecionados");
      return;
    }

    const updatePromises = [];

    // standard table
    if (unpaidVisits && unpaidVisits.length > 0) {
      updatePromises.push(
        supabase
          .from("visits")
          .update({
            payment_status: "paid",
            paid_at: new Date().toISOString(),
          })
          .in("id", unpaidVisits.map((v) => v.id))
      );
    }

    // newer table
    if (unpaidPatientVisits && unpaidPatientVisits.length > 0) {
      updatePromises.push(
        supabase
          .from("patient_visits")
          .update({
            payment_status: "Paid",
          })
          .in("id", unpaidPatientVisits.map((v) => v.id))
      );
    }

    const results = await Promise.all(updatePromises);
    const hasError = results.some(r => r.error);

    if (hasError) {
      toast.error("Erro ao registrar pagamentos");
      return;
    }

    // Create history records for each participant
    const historyRecords = centerParticipants.map(p => ({
      project_id: selectedProject,
      participant_id: p.participant_id,
      amount: p.pending_payment,
      payment_date: paymentDate,
      notes: notes || `Pagamento em lote - Centro ${centerCode} (${centerParticipants.length} participantes)`,
    }));

    const { error: historyError } = await supabase
      .from("payment_history")
      .insert(historyRecords);

    if (historyError) {
      console.error("Error creating history:", historyError);
    }

    toast.success(`Pagamentos de ${centerParticipants.length} participante(s) registrados com sucesso!`);
    
    // Clear selection after payment
    setSelectedParticipantIds(new Set());
    
    loadProjectData();
    loadPaymentHistory();
  };

  const registerIndividualPayment = async (category: string, amount: number, description: string, paymentDate: string) => {
    // Get the first participant from the center to link the payment
    const centerParticipant = participants.find(p => p.research_center === selectedCenterTab);
    
    if (!centerParticipant) {
      toast.error("Nenhum participante encontrado no centro");
      return;
    }

    const categoryLabels: Record<string, string> = {
      overhead: "Overhead",
      startup: "Start-up",
      regulatory: "Regulatório",
      ethics: "Ética",
      equipment: "Equipamentos",
      supplies: "Suprimentos",
      training: "Treinamento",
      travel: "Viagem/Deslocamento",
      other: "Outros",
    };

    const notes = description 
      ? `[${categoryLabels[category] || category}] ${description}`
      : `[${categoryLabels[category] || category}]`;

    const { error } = await supabase
      .from("payment_history")
      .insert({
        project_id: selectedProject,
        participant_id: centerParticipant.id,
        amount: amount,
        payment_date: paymentDate,
        notes: notes,
      });

    if (error) {
      console.error("Error creating individual payment:", error);
      toast.error("Erro ao registrar pagamento");
      throw error;
    }

    toast.success("Pagamento avulso registrado com sucesso!");
    loadPaymentHistory();
  };

  const toggleVisitPaymentStatus = async (visitId: string, currentStatus: string) => {
    const newStatus = currentStatus === "paid" ? "Pending" : "Paid";
    
    // Update newer patient visits table
    const { error } = await supabase
      .from("patient_visits")
      .update({ payment_status: newStatus })
      .eq("id", visitId);

    if (error) {
      toast.error("Erro ao atualizar status do pagamento");
      console.error(error);
      return;
    }

    toast.success(`Pagamento marcado como ${newStatus === "Paid" ? "Realizado" : "Pendente"}`);
    loadProjectData();
    loadPaymentHistory();
  };

  const exportToCSV = () => {
    const dataToExport = filterCenter 
      ? participantPayments.filter(p => p.research_center === filterCenter)
      : participantPayments;

    if (dataToExport.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const projectName = projects.find((p) => p.id === selectedProject)?.title || "projeto";
    const headers = [
      "Centro",
      "Código do Participante",
      "Visitas Completadas",
      "Visitas Pagas",
      "Valor Pendente (R$)",
      "Total Pago (R$)",
      "Total Ganho (R$)",
    ];

    const rows = dataToExport.map((p) => [
      p.research_center,
      p.participant_code,
      p.completed_visits,
      p.paid_visits,
      p.pending_payment.toFixed(2),
      p.total_paid.toFixed(2),
      p.total_earned.toFixed(2),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pagamentos_${projectName}_${filterCenter || "todos"}_${todayDateOnly()}.csv`;
    link.click();

    toast.success("Arquivo exportado com sucesso!");
  };

  const exportCenterToCSV = () => {
    if (!selectedCenterTab) {
      toast.error("Selecione um centro para exportar");
      return;
    }

    const centerParticipants = participantPayments.filter(p => p.research_center === selectedCenterTab);
    
    if (centerParticipants.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const projectName = projects.find((p) => p.id === selectedProject)?.title || "projeto";
    const centerData = centerSummaries.find(c => c.code === selectedCenterTab);
    
    // Build headers: Código + each visit type + Pendente + Total Pago + Total Ganho
    const headers = [
      "Código do Participante",
      ...visitTypes.map(vt => `${vt.name} (R$ ${vt.value.toFixed(2)})`),
      "Valor Pendente (R$)",
      "Total Pago (R$)",
      "Total Ganho (R$)",
    ];

    const rows = centerParticipants.map((payment) => {
      const participantVisits = visits.filter(v => v.participant_id === payment.participant_id);
      
      const visitStatuses = visitTypes.map((vt) => {
        const visit = participantVisits.find(v => v.visit_number === vt.visit_number);
        const isCompleted = visit?.status === "completed";
        const isPaid = visit?.payment_status === "paid";
        const notPerformed = visit?.status === "not_performed";
        const isPending = visit?.status === "pending";
        
        if (notPerformed) return "N/R";
        if (isCompleted && isPaid) return "Pago";
        if (isCompleted && !isPaid) return "A pagar";
        if (isPending) return "Pendente";
        return "-";
      });

      return [
        payment.participant_code,
        ...visitStatuses,
        payment.pending_payment.toFixed(2),
        payment.total_paid.toFixed(2),
        payment.total_earned.toFixed(2),
      ];
    });

    // Add summary row
    const totalPendingCenter = centerParticipants.reduce((sum, p) => sum + p.pending_payment, 0);
    const totalPaidCenter = centerParticipants.reduce((sum, p) => sum + p.total_paid, 0);
    const totalEarnedCenter = centerParticipants.reduce((sum, p) => sum + p.total_earned, 0);
    
    const summaryRow = [
      "TOTAL",
      ...visitTypes.map(() => ""),
      totalPendingCenter.toFixed(2),
      totalPaidCenter.toFixed(2),
      totalEarnedCenter.toFixed(2),
    ];

    const csvContent = [
      `Centro: ${selectedCenterTab} - ${centerData?.name || "Sem nome"}`,
      "",
      headers.join(","),
      ...rows.map((row) => row.join(",")),
      "",
      summaryRow.join(","),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pagamentos_${projectName}_${selectedCenterTab}_${todayDateOnly()}.csv`;
    link.click();

    toast.success("Arquivo exportado com sucesso!");
  };

  const exportHistoryToCSV = (filteredHistory: PaymentHistoryRecord[]) => {
    if (filteredHistory.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const projectName = projects.find((p) => p.id === selectedProject)?.title || "projeto";
    const headers = [
      "Data",
      "Centro",
      "Código do Participante",
      "Nome do Participante",
      "Valor (R$)",
      "Observações",
    ];

    const rows = filteredHistory.map((record) => [
      format(parseLocalDate(record.payment_date), "dd/MM/yyyy", { locale: ptBR }),
      record.participant?.research_center || "-",
      record.participant?.participant_code || "-",
      record.participant?.name || "-",
      Number(record.amount).toFixed(2),
      record.notes ? `"${record.notes.replace(/"/g, '""')}"` : "-",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const dateRange = historyStartDate || historyEndDate 
      ? `_${historyStartDate || "inicio"}_${historyEndDate || "fim"}`
      : "";
    const centerSuffix = historyCenterFilter || "todos";
    link.download = `historico_pagamentos_${projectName}_${centerSuffix}${dateRange}_${todayDateOnly()}.csv`;
    link.click();

    toast.success("Histórico exportado com sucesso!");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const filteredPayments = filterCenter 
    ? participantPayments.filter(p => p.research_center === filterCenter)
    : participantPayments;

  // Filter visits by date range for indicators
  const filteredVisitsForIndicators = visits.filter(v => {
    if (!v.completed_at) return false;
    const completedDate = parseLocalDate(v.completed_at);
    if (indicatorStartDate && completedDate < parseLocalDate(indicatorStartDate)) return false;
    if (indicatorEndDate && completedDate > parseLocalDate(indicatorEndDate + 'T23:59:59')) return false;
    return true;
  });

  // Calculate totals based on filtered visits
  const calculateStatsFromVisits = (participantIds: string[]) => {
    let pending = 0;
    let paid = 0;
    
    filteredVisitsForIndicators
      .filter(v => participantIds.includes(v.participant_id))
      .forEach(visit => {
        const visitType = visitTypes.find(vt => vt.visit_number === visit.visit_number);
        const visitValue = visit.payment_amount ?? visitType?.value ?? 0;
        
        if (visit.status === "completed") {
          if (visit.payment_status === "paid") {
            paid += Number(visitValue);
          } else {
            pending += Number(visitValue);
          }
        }
      });
    
    return { pending, paid };
  };

  const allParticipantIds = participantPayments.map(p => p.participant_id);
  const indicatorStats = calculateStatsFromVisits(allParticipantIds);
  
  // Filter vendor payments by date range for indicators
  const filteredVendorPaymentsForIndicators = vendorPayments.filter(v => {
    const paymentDate = v.paid_at ? parseLocalDate(v.paid_at) : parseLocalDate(v.payment_date);
    if (indicatorStartDate && paymentDate < parseLocalDate(indicatorStartDate)) return false;
    if (indicatorEndDate && paymentDate > parseLocalDate(indicatorEndDate + 'T23:59:59')) return false;
    return true;
  });
  
  // Separate paid and programmed vendor payments
  const paidVendorPayments = filteredVendorPaymentsForIndicators.filter(v => v.status === 'pago');
  const programmedVendorPayments = filteredVendorPaymentsForIndicators.filter(v => v.status === 'programado');
  
  const totalVendorPaid = paidVendorPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalVendorProgrammed = programmedVendorPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalVendorPayments = filteredVendorPaymentsForIndicators.reduce((sum, p) => sum + Number(p.amount), 0);
  
  const totalPending = indicatorStats.pending + totalVendorProgrammed;
  const totalPaid = indicatorStats.paid + totalVendorPaid;
  const totalParticipants = participantPayments.length;

  // Get current year budget from selected project
  const currentYear = new Date().getFullYear();
  const selectedProjectData = projects.find(p => p.id === selectedProject);
  const yearlyBudget = selectedProjectData?.budget ?? 0;

  const uniqueCenters = [...new Set(participantPayments.map(p => p.research_center))].sort();

  // Calculate stats by center
  const centerStats = uniqueCenters.map(centerCode => {
    const centerParticipants = participantPayments.filter(p => p.research_center === centerCode);
    const centerParticipantIds = centerParticipants.map(p => p.participant_id);
    const stats = calculateStatsFromVisits(centerParticipantIds);
    return {
      code: centerCode,
      participants: centerParticipants.length,
      pending: stats.pending,
      paid: stats.paid,
    };
  });

  // Calculate monthly spending projection (including paid vendor payments)
  const calculateMonthlyProjection = () => {
    // Combine payment history (centers) and PAID vendor payments only
    const paidVendors = vendorPayments.filter(p => p.status === 'pago');
    const allPayments = [
      ...paymentHistory.map(p => ({ date: p.payment_date, amount: Number(p.amount) })),
      ...paidVendors.map(p => ({ date: p.paid_at || p.payment_date, amount: Number(p.amount) })),
    ];

    if (allPayments.length === 0) {
      return { monthlyAverage: 0, projectedMonths: [], monthCount: 0 };
    }

    // Group payments by month
    const monthlyPayments: Record<string, number> = {};
    allPayments.forEach(record => {
      const date = parseLocalDate(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyPayments[monthKey] = (monthlyPayments[monthKey] || 0) + record.amount;
    });

    const monthlyValues = Object.values(monthlyPayments);
    if (monthlyValues.length === 0) {
      return { monthlyAverage: 0, projectedMonths: [], monthCount: 0 };
    }

    const monthlyAverage = monthlyValues.reduce((sum, val) => sum + val, 0) / monthlyValues.length;

    // Project next 6 months
    const projectedMonths: { month: string; projected: number; cumulative: number }[] = [];
    const today = new Date();
    let cumulative = totalPaid;

    for (let i = 1; i <= 6; i++) {
      const futureDate = parseLocalDate(today.getFullYear(), today.getMonth() + i, 1);
      const monthName = format(futureDate, 'MMM/yy', { locale: ptBR });
      cumulative += monthlyAverage;
      projectedMonths.push({
        month: monthName,
        projected: monthlyAverage,
        cumulative,
      });
    }

    return { monthlyAverage, projectedMonths, monthCount: monthlyValues.length };
  };

  const projection = calculateMonthlyProjection();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CTMSNav />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Controle de Pagamentos</h1>
            <p className="text-muted-foreground mt-1">
              Pagamentos baseados nas visitas realizadas
            </p>
          </div>
          <Select 
            value={selectedProject} 
            onValueChange={(value) => {
              setSelectedProject(value);
              setPersistedProjectId(value);
            }}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecione um projeto" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedProject ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Selecione um projeto para gerenciar pagamentos
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Date Filter for Indicators */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Data inicial</label>
                    <Input
                      type="date"
                      value={indicatorStartDate}
                      onChange={(e) => setIndicatorStartDate(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Data final</label>
                    <Input
                      type="date"
                      value={indicatorEndDate}
                      onChange={(e) => setIndicatorEndDate(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>
                  {(indicatorStartDate || indicatorEndDate) && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setIndicatorStartDate("");
                        setIndicatorEndDate("");
                      }}
                    >
                      Limpar filtros
                    </Button>
                  )}
                  {(indicatorStartDate || indicatorEndDate) && (
                    <span className="text-xs text-muted-foreground">
                      Exibindo visitas completadas no período selecionado
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <CalendarDays className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Orçamento Previsto {currentYear}</p>
                      <p className="text-2xl font-bold">{formatCurrency(yearlyBudget)}</p>
                      {yearlyBudget > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Executado:</span>
                            <span className="font-medium">{((totalPaid / yearlyBudget) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all" 
                              style={{ width: `${Math.min((totalPaid / yearlyBudget) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {yearlyBudget === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Configure o orçamento no cadastro do projeto
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Participantes Incluídos</p>
                      <p className="text-2xl font-bold">{totalParticipants}</p>
                      <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                        {centerStats.map(center => (
                          <div key={center.code} className="flex justify-between text-xs text-muted-foreground">
                            <span>{center.code}:</span>
                            <span className="font-medium">{center.participants}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-warning/10 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-warning" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Pagamentos Pendentes</p>
                      <p className="text-2xl font-bold text-warning">{formatCurrency(totalPending)}</p>
                      <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                        {centerStats.filter(c => c.pending > 0).map(center => (
                          <div key={center.code} className="flex justify-between text-xs text-muted-foreground">
                            <span>{center.code}:</span>
                            <span className="font-medium text-warning">{formatCurrency(center.pending)}</span>
                          </div>
                        ))}
                        {totalVendorProgrammed > 0 && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Vendors:</span>
                            <span className="font-medium text-warning">{formatCurrency(totalVendorProgrammed)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent/10 rounded-lg">
                      <Briefcase className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Total Vendors</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalVendorPayments)}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Pago:</span>
                          <span className="font-medium text-success">{formatCurrency(totalVendorPaid)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Programado:</span>
                          <span className="font-medium text-warning">{formatCurrency(totalVendorProgrammed)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-success/10 rounded-lg">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Total Pago</p>
                      <p className="text-2xl font-bold text-success">{formatCurrency(totalPaid)}</p>
                      <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                        {centerStats.filter(c => c.paid > 0).map(center => (
                          <div key={center.code} className="flex justify-between text-xs text-muted-foreground">
                            <span>{center.code}:</span>
                            <span className="font-medium text-success">{formatCurrency(center.paid)}</span>
                          </div>
                        ))}
                        {totalVendorPaid > 0 && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Vendors:</span>
                            <span className="font-medium text-success">{formatCurrency(totalVendorPaid)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Budget Alert */}
            {yearlyBudget > 0 && projection.projectedMonths.length > 0 && projection.projectedMonths.some(m => m.cumulative > yearlyBudget) && (
              <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle className="font-semibold">Atenção: Projeção Excede Orçamento</AlertTitle>
                <AlertDescription className="mt-1">
                  Com base na média mensal de gastos ({formatCurrency(projection.monthlyAverage)}), a projeção indica que o orçamento anual de {formatCurrency(yearlyBudget)} será excedido 
                  {projection.projectedMonths.findIndex(m => m.cumulative > yearlyBudget) >= 0 && (
                    <> em <span className="font-semibold">{projection.projectedMonths[projection.projectedMonths.findIndex(m => m.cumulative > yearlyBudget)].month}</span></>
                  )}.
                  Valor projetado acumulado até o final do período: {formatCurrency(projection.projectedMonths[projection.projectedMonths.length - 1].cumulative)}.
                </AlertDescription>
              </Alert>
            )}

            {/* Spending Projection Card */}
            {projection.projectedMonths.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Projeção de Gastos (Próximos 6 meses)
                  </CardTitle>
                  <CardDescription>
                    Baseado na média mensal de {formatCurrency(projection.monthlyAverage)} ({projection.monthCount} {projection.monthCount === 1 ? 'mês' : 'meses'} de histórico)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {projection.projectedMonths.map((month, index) => (
                      <div 
                        key={month.month} 
                        className="p-3 rounded-lg bg-muted/50 border border-border/50 text-center"
                      >
                        <p className="text-xs text-muted-foreground font-medium uppercase">{month.month}</p>
                        <p className="text-sm font-bold text-primary mt-1">{formatCurrency(month.projected)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Acum: {formatCurrency(month.cumulative)}
                        </p>
                        {yearlyBudget > 0 && (
                          <div className="mt-2">
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full transition-all ${month.cumulative > yearlyBudget ? 'bg-destructive' : 'bg-primary'}`}
                                style={{ width: `${Math.min((month.cumulative / yearlyBudget) * 100, 100)}%` }}
                              />
                            </div>
                            {month.cumulative > yearlyBudget && index === projection.projectedMonths.findIndex(m => m.cumulative > yearlyBudget) && (
                              <p className="text-xs text-destructive mt-1 font-medium">Excede orçamento</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {yearlyBudget > 0 && projection.projectedMonths.some(m => m.cumulative > yearlyBudget) && (
                    <p className="text-xs text-destructive mt-3 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      A projeção indica que o orçamento anual será excedido com base na média de gastos atual.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="centers" className="space-y-4">
              <TabsList>
                <TabsTrigger value="centers">Por Centro</TabsTrigger>
                <TabsTrigger value="patients">Pacientes</TabsTrigger>
                <TabsTrigger value="vendors">Vendors</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="centers" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Pagamentos por Centro
                      </CardTitle>
                      <CardDescription>
                        Selecione um centro para ver e gerenciar pagamentos dos participantes
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="default"
                        onClick={() => setNewCenterPaymentOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Pagamento
                      </Button>
                      <Select value={selectedCenterTab || "select"} onValueChange={(v) => setSelectedCenterTab(v === "select" ? "" : v)}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Selecione um centro" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="select">Selecione um centro</SelectItem>
                          {centerSummaries
                            .filter((center) => {
                              const name = (center.name ?? "").trim().toLowerCase();
                              return name !== "" && name !== "sem nome";
                            })
                            .map((center) => (
                              <SelectItem key={center.code} value={center.code}>
                                {center.code} - {center.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {selectedCenterTab && (
                        <>
                          <Button 
                            variant="outline"
                            onClick={exportCenterToCSV}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Exportar CSV
                          </Button>
                          {receiptsFolderLink && (
                            <Button variant="outline" asChild>
                              <a href={receiptsFolderLink} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Pasta de Comprovantes
                              </a>
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Manual center payments (created via "Novo Pagamento") */}
                    {(() => {
                      const manualCenterPayments = vendorPayments.filter(p => p.category === "center");
                      if (manualCenterPayments.length === 0) return null;
                      return (
                        <div className="mb-6 border rounded-lg p-4 bg-muted/30">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Pagamentos Manuais do Centro
                            </h3>
                            <span className="text-sm text-muted-foreground">
                              {manualCenterPayments.length} pagamento(s) • Total: {formatCurrency(manualCenterPayments.reduce((s, p) => s + Number(p.amount), 0))}
                            </span>
                          </div>
                          <ScrollArea className="w-full">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data Prog.</TableHead>
                                  <TableHead>Centro</TableHead>
                                  <TableHead>Descrição</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Data Pgto.</TableHead>
                                  <TableHead>Nº NF</TableHead>
                                  <TableHead>Cód. Protheus</TableHead>
                                  <TableHead>Centro de Custo</TableHead>
                                  <TableHead>Classe de Valor</TableHead>
                                  <TableHead className="text-right">Valor</TableHead>
                                  <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {manualCenterPayments.map((payment) => (
                                  <TableRow key={payment.id}>
                                    <TableCell>{format(parseLocalDate(payment.payment_date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                                    <TableCell className="font-medium">{payment.vendor_name}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">{payment.description || "-"}</TableCell>
                                    <TableCell>
                                      <Select
                                        value={payment.status}
                                        onValueChange={(v) => updateVendorPaymentStatus(payment.id, v)}
                                      >
                                        <SelectTrigger className="w-[130px] h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="programado">Programado</SelectItem>
                                          <SelectItem value="pago">Pago</SelectItem>
                                          <SelectItem value="cancelado">Cancelado</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell>
                                      {payment.paid_at ? (
                                        <span className="text-sm text-green-600">
                                          {format(parseLocalDate(payment.paid_at), "dd/MM/yyyy", { locale: ptBR })}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell>{payment.invoice_number || "-"}</TableCell>
                                    <TableCell>{(payment as any).protheus_code || "-"}</TableCell>
                                    <TableCell>{payment.cost_center || "-"}</TableCell>
                                    <TableCell>{payment.value_class || "-"}</TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(Number(payment.amount))}</TableCell>
                                    <TableCell>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => deleteVendorPayment(payment.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </div>
                      );
                    })()}
                    {!selectedCenterTab ? (
                      <div className="text-center py-8">
                        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          Selecione um centro para visualizar os participantes
                        </p>
                      </div>
                    ) : (
                      <>
                        {!selectedCenterTab ? (
                          <div className="text-center py-8">
                            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                              Selecione um centro para visualizar os pagamentos
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-semibold">Pagamentos Manuais do Centro</h3>
                            </div>
                            {/* O bloco de pagamentos manuais (Novo Pagamento) já é exibido acima via manualCenterPayments logic */}
                            <p className="text-sm text-muted-foreground">
                              Os pagamentos individuais de pacientes agora são gerenciados exclusivamente na aba <strong>Pacientes</strong>.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="patients" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Listagem de Pacientes
                    </CardTitle>
                    <CardDescription>
                      Visualize todos os pacientes cadastrados no módulo Patient Management e seus status financeiros
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Filtrar por código ou centro..." 
                          value={filterCenter}
                          onChange={(e) => setFilterCenter(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código do Paciente</TableHead>
                            <TableHead>Centro</TableHead>
                            <TableHead className="text-center">Visitas Completas</TableHead>
                            <TableHead className="text-right">Total Acumulado</TableHead>
                            <TableHead className="text-right">Total Pago</TableHead>
                            <TableHead className="text-right">Valor Pendente</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {participantPayments
                            .filter(p => 
                              !filterCenter || 
                              p.participant_code.toLowerCase().includes(filterCenter.toLowerCase()) ||
                              p.research_center.toLowerCase().includes(filterCenter.toLowerCase())
                            )
                            .map((p) => (
                            <TableRow key={p.participant_id}>
                              <TableCell className="font-bold">{p.participant_code}</TableCell>
                              <TableCell>{p.research_center}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{p.completed_visits}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(p.total_earned)}</TableCell>
                              <TableCell className="text-right text-success">{formatCurrency(p.total_paid)}</TableCell>
                              <TableCell className="text-right text-warning font-bold">{formatCurrency(p.pending_payment)}</TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex justify-center gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => {
                                          setEditingParticipant(p);
                                          setEditParticipantPaymentsOpen(true);
                                        }}
                                      >
                                        <DollarSign className="h-4 w-4 mr-1" />
                                        Gerenciar Pagamentos
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => {
                                          setSelectedCenterTab(p.research_center);
                                        }}
                                      >
                                        Ver no Centro
                                      </Button>
                                    </div>
                                  </TableCell>
                            </TableRow>
                          ))}
                          {participantPayments.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                Nenhum paciente encontrado.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="vendors" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Pagamentos de Vendors
                      </CardTitle>
                      <CardDescription>
                        Pagamentos avulsos gerais não vinculados a centros de pesquisa
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {receiptsFolderLink && (
                        <Button variant="outline" asChild>
                          <a href={receiptsFolderLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Pasta de Comprovantes
                          </a>
                        </Button>
                      )}
                      <Button onClick={() => setNewVendorPaymentOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Pagamento
                      </Button>
                      <Button variant="outline" onClick={() => setVendorManagementOpen(true)}>
                        <Settings2 className="h-4 w-4 mr-2" />
                        Gerenciar Fornecedores
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    {/* Vendor payments list (exclude center-category manual entries) */}
                    {(() => {
                      const vendorOnlyPayments = vendorPayments.filter(p => p.category !== "center");
                      return vendorOnlyPayments.length === 0 ? (
                        <div className="text-center py-8">
                          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            Nenhum pagamento de vendor registrado
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                              {vendorOnlyPayments.length} pagamento(s) • Total: {formatCurrency(vendorOnlyPayments.reduce((sum, p) => sum + Number(p.amount), 0))}
                            </p>
                          </div>
                          <ScrollArea className="w-full">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data Prog.</TableHead>
                                  <TableHead>Fornecedor</TableHead>
                                  <TableHead>Categoria</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Data Pgto.</TableHead>
                                  <TableHead>Recorrência</TableHead>
                                  <TableHead>Nº NF</TableHead>
                                  <TableHead className="text-right">Valor</TableHead>
                                  <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {vendorOnlyPayments.map((payment) => {
                                  const categoryLabels: Record<string, string> = {
                                  overhead: "Overhead",
                                  startup: "Start-up",
                                  regulatory: "Regulatório",
                                  ethics: "Ética",
                                  equipment: "Equipamentos",
                                  supplies: "Suprimentos",
                                  training: "Treinamento",
                                  travel: "Viagem/Deslocamento",
                                  laboratory: "Laboratório",
                                  consulting: "Consultoria",
                                  other: "Outros",
                                };
                                const recurrenceLabels: Record<string, string> = {
                                  none: "-",
                                  monthly: "Mensal",
                                  quarterly: "Trimestral",
                                  semiannual: "Semestral",
                                  annual: "Anual",
                                };
                                return (
                                  <TableRow key={payment.id}>
                                    <TableCell>
                                      {format(parseLocalDate(payment.payment_date), "dd/MM/yyyy", { locale: ptBR })}
                                    </TableCell>
                                    <TableCell className="font-medium">{payment.vendor_name}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {categoryLabels[payment.category] || payment.category}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Select
                                        value={payment.status}
                                        onValueChange={(v) => updateVendorPaymentStatus(payment.id, v)}
                                      >
                                        <SelectTrigger className="w-[130px] h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="programado">
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-800">Programado</Badge>
                                          </SelectItem>
                                          <SelectItem value="pago">
                                            <Badge variant="secondary" className="bg-green-100 text-green-800">Pago</Badge>
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell>
                                      {payment.paid_at ? (
                                        <span className="text-sm text-green-600">
                                          {format(parseLocalDate(payment.paid_at), "dd/MM/yyyy", { locale: ptBR })}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {payment.recurrence_type && payment.recurrence_type !== "none" ? (
                                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                          <RefreshCw className="h-3 w-3" />
                                          {recurrenceLabels[payment.recurrence_type] || payment.recurrence_type}
                                        </Badge>
                                      ) : "-"}
                                    </TableCell>
                                    <TableCell>{payment.invoice_number || "-"}</TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(Number(payment.amount))}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => deleteVendorPayment(payment.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                              </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Histórico de Pagamentos
                      </CardTitle>
                      <CardDescription>
                        Registro de todos os pagamentos realizados (Centros e Vendors)
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap items-end">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Tipo</label>
                        <Select value={historyTypeFilter || "all"} onValueChange={(v) => setHistoryTypeFilter(v === "all" ? "" : v)}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="center">Centros</SelectItem>
                            <SelectItem value="vendor">Vendors</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Centro/Vendor</label>
                        <Select value={historyCenterFilter || "all"} onValueChange={(v) => setHistoryCenterFilter(v === "all" ? "" : v)}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {uniqueCenters.map((center) => (
                              <SelectItem key={center} value={center}>
                                {center}
                              </SelectItem>
                            ))}
                            {vendors.map((vendor) => (
                              <SelectItem key={`vendor-${vendor.id}`} value={`vendor:${vendor.name}`}>
                                🏢 {vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Data inicial</label>
                        <Input
                          type="date"
                          value={historyStartDate}
                          onChange={(e) => setHistoryStartDate(e.target.value)}
                          className="w-[150px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Data final</label>
                        <Input
                          type="date"
                          value={historyEndDate}
                          onChange={(e) => setHistoryEndDate(e.target.value)}
                          className="w-[150px]"
                        />
                      </div>
                      {(historyStartDate || historyEndDate || historyCenterFilter || historyTypeFilter) && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setHistoryStartDate("");
                            setHistoryEndDate("");
                            setHistoryCenterFilter("");
                            setHistoryTypeFilter("");
                          }}
                        >
                          Limpar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Build combined history for export
                          const centerPayments = paymentHistory
                            .filter(record => {
                              if (historyTypeFilter === "vendor") return false;
                              if (historyCenterFilter && !historyCenterFilter.startsWith("vendor:") && record.participant?.research_center !== historyCenterFilter) return false;
                              if (historyCenterFilter && historyCenterFilter.startsWith("vendor:")) return false;
                              const recordDate = parseLocalDate(record.payment_date);
                              if (historyStartDate && recordDate < parseLocalDate(historyStartDate)) return false;
                              if (historyEndDate && recordDate > parseLocalDate(historyEndDate + 'T23:59:59')) return false;
                              return true;
                            })
                            .map(record => ({
                              date: record.payment_date,
                              type: "center" as const,
                              source: record.participant?.research_center || "-",
                              description: `${record.participant?.participant_code || ""} - ${record.participant?.name || ""}`,
                              amount: Number(record.amount),
                              notes: record.notes,
                            }));

                          const vendorPaidPayments = vendorPayments
                            .filter(payment => {
                              if (payment.status !== "pago") return false;
                              if (historyTypeFilter === "center") return false;
                              if (historyCenterFilter && historyCenterFilter.startsWith("vendor:") && payment.vendor_name !== historyCenterFilter.replace("vendor:", "")) return false;
                              if (historyCenterFilter && !historyCenterFilter.startsWith("vendor:") && historyCenterFilter !== "all" && historyCenterFilter !== "") return false;
                              const paymentDate = payment.paid_at ? parseLocalDate(payment.paid_at) : parseLocalDate(payment.payment_date);
                              if (historyStartDate && paymentDate < parseLocalDate(historyStartDate)) return false;
                              if (historyEndDate && paymentDate > parseLocalDate(historyEndDate + 'T23:59:59')) return false;
                              return true;
                            })
                            .map(payment => ({
                              date: payment.paid_at || payment.payment_date,
                              type: "vendor" as const,
                              source: payment.vendor_name,
                              description: payment.description || payment.category,
                              amount: Number(payment.amount),
                              notes: payment.invoice_number ? `NF: ${payment.invoice_number}` : null,
                            }));

                          const combinedHistory = [...centerPayments, ...vendorPaidPayments].sort((a, b) => 
                            parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
                          );

                          const csvContent = [
                            ["Data", "Tipo", "Centro/Vendor", "Participante/Descrição", "Valor", "Observações"].join(","),
                            ...combinedHistory.map(item => [
                              format(parseLocalDate(item.date), "dd/MM/yyyy"),
                              item.type === "center" ? "Centro" : "Vendor",
                              item.source,
                              item.description,
                              item.amount.toFixed(2),
                              item.notes || ""
                            ].map(v => `"${v}"`).join(","))
                          ].join("\n");
                          
                          const blob = new Blob([csvContent], { type: "text/csv" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `historico-pagamentos-${format(new Date(), "yyyy-MM-dd")}.csv`;
                          a.click();
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const getCombinedHistory = () => {
                        // Map center payments
                        const centerPayments = paymentHistory
                          .filter(record => {
                            if (historyTypeFilter === "vendor") return false;
                            if (historyCenterFilter && !historyCenterFilter.startsWith("vendor:") && record.participant?.research_center !== historyCenterFilter) return false;
                            if (historyCenterFilter && historyCenterFilter.startsWith("vendor:")) return false;
                            const recordDate = parseLocalDate(record.payment_date);
                            if (historyStartDate && recordDate < parseLocalDate(historyStartDate)) return false;
                            if (historyEndDate && recordDate > parseLocalDate(historyEndDate + 'T23:59:59')) return false;
                            return true;
                          })
                          .map(record => ({
                            id: record.id,
                            date: record.payment_date,
                            type: "center" as const,
                            source: record.participant?.research_center || "-",
                            description: `${record.participant?.participant_code || ""} - ${record.participant?.name || ""}`,
                            amount: Number(record.amount),
                            notes: record.notes,
                            original: record,
                          }));

                        // Map vendor payments (only paid ones, excluding manual center entries)
                        const vendorPaidPayments = vendorPayments
                          .filter(payment => {
                            if (payment.category === "center") return false;
                            if (payment.status !== "pago") return false;
                            if (historyTypeFilter === "center") return false;
                            if (historyCenterFilter && historyCenterFilter.startsWith("vendor:") && payment.vendor_name !== historyCenterFilter.replace("vendor:", "")) return false;
                            if (historyCenterFilter && !historyCenterFilter.startsWith("vendor:") && historyCenterFilter !== "all" && historyCenterFilter !== "") return false;
                            const paymentDate = payment.paid_at ? parseLocalDate(payment.paid_at) : parseLocalDate(payment.payment_date);
                            if (historyStartDate && paymentDate < parseLocalDate(historyStartDate)) return false;
                            if (historyEndDate && paymentDate > parseLocalDate(historyEndDate + 'T23:59:59')) return false;
                            return true;
                          })
                          .map(payment => ({
                            id: payment.id,
                            date: payment.paid_at || payment.payment_date,
                            type: "vendor" as const,
                            source: payment.vendor_name,
                            description: payment.description || payment.category,
                            amount: Number(payment.amount),
                            notes: payment.invoice_number ? `NF: ${payment.invoice_number}` : null,
                            original: payment,
                          }));

                        // Map manual center payments (category === "center")
                        const manualCenterPayments = vendorPayments
                          .filter(payment => {
                            if (payment.category !== "center") return false;
                            if (historyTypeFilter === "vendor") return false;
                            if (historyCenterFilter && historyCenterFilter.startsWith("vendor:")) return false;
                            const paymentDate = payment.paid_at ? parseLocalDate(payment.paid_at) : parseLocalDate(payment.payment_date);
                            if (historyStartDate && paymentDate < parseLocalDate(historyStartDate)) return false;
                            if (historyEndDate && paymentDate > parseLocalDate(historyEndDate + 'T23:59:59')) return false;
                            return true;
                          })
                          .map(payment => ({
                            id: payment.id,
                            date: payment.paid_at || payment.payment_date,
                            type: "center" as const,
                            source: payment.vendor_name,
                            description: payment.description || "Pagamento manual",
                            amount: Number(payment.amount),
                            notes: payment.invoice_number ? `NF: ${payment.invoice_number}` : null,
                            original: payment as any,
                          }));

                        // Combine and sort by date descending
                        return [...centerPayments, ...vendorPaidPayments, ...manualCenterPayments].sort((a, b) => 
                          parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
                        );
                      };

                      const combinedHistory = getCombinedHistory();

                      if (combinedHistory.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                              {paymentHistory.length === 0 && vendorPayments.filter(v => v.status === "pago").length === 0
                                ? "Nenhum pagamento registrado ainda"
                                : "Nenhum pagamento encontrado com os filtros selecionados"
                              }
                            </p>
                          </div>
                        );
                      }

                      const totalFiltered = combinedHistory.reduce((sum, r) => sum + r.amount, 0);
                      const totalCenters = combinedHistory.filter(r => r.type === "center").reduce((sum, r) => sum + r.amount, 0);
                      const totalVendors = combinedHistory.filter(r => r.type === "vendor").reduce((sum, r) => sum + r.amount, 0);

                      return (
                        <>
                          <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-muted-foreground">
                                {combinedHistory.length} pagamento(s)
                              </span>
                              {totalCenters > 0 && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                  <Building2 className="h-3 w-3 mr-1" />
                                  Centros: {formatCurrency(totalCenters)}
                                </Badge>
                              )}
                              {totalVendors > 0 && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                  <Briefcase className="h-3 w-3 mr-1" />
                                  Vendors: {formatCurrency(totalVendors)}
                                </Badge>
                              )}
                            </div>
                            <span className="font-bold text-success">{formatCurrency(totalFiltered)}</span>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Centro/Vendor</TableHead>
                                <TableHead>Participante/Descrição</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead>Observações</TableHead>
                                <TableHead className="text-center">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {combinedHistory.map((record) => (
                                <TableRow key={`${record.type}-${record.id}`}>
                                  <TableCell>
                                    {format(parseLocalDate(record.date), "dd/MM/yyyy", { locale: ptBR })}
                                  </TableCell>
                                  <TableCell>
                                    {record.type === "center" ? (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                        <Building2 className="h-3 w-3 mr-1" />
                                        Centro
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                        <Briefcase className="h-3 w-3 mr-1" />
                                        Vendor
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-medium">{record.source}</TableCell>
                                  <TableCell>{record.description}</TableCell>
                                  <TableCell className="text-right font-medium text-success">
                                    {formatCurrency(record.amount)}
                                  </TableCell>
                                  <TableCell className="max-w-[200px] truncate">
                                    {record.notes || "-"}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {record.type === "center" && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingPayment(record.original as PaymentHistoryRecord);
                                          setEditDialogOpen(true);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      <EditPaymentDialog
        payment={editingPayment}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          loadPaymentHistory();
          loadProjectData();
        }}
      />

      <RegisterPaymentDialog
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
        title={selectedCenter ? `Registrar Pagamento - Centro ${selectedCenter.code}` : `Registrar Pagamento - ${selectedParticipant?.participant_code || ""}`}
        description={selectedCenter ? `${selectedCenter.participants} participante(s) com pagamento pendente` : `Participante: ${selectedParticipant?.participant_code || ""}`}
        amount={selectedCenter?.pending_payment || selectedParticipant?.pending_payment || 0}
        onConfirm={async (paymentDate, notes) => {
          if (selectedCenter) {
            await markCenterAsPaid(selectedCenter.code, paymentDate, notes);
          } else if (selectedParticipant) {
            await markAsPaid(selectedParticipant.participant_id, paymentDate, notes);
          }
        }}
      />

      <IndividualPaymentDialog
        open={individualPaymentDialogOpen}
        onOpenChange={setIndividualPaymentDialogOpen}
        centerCode={selectedCenterTab}
        onConfirm={registerIndividualPayment}
      />

      <NewCenterPaymentDialog
        open={newCenterPaymentOpen}
        onOpenChange={setNewCenterPaymentOpen}
        defaultProjectId={selectedProject}
        defaultCenterCode={selectedCenterTab}
        onCreated={() => {
          loadVendorPayments();
          loadPaymentHistory();
        }}
      />

      <VendorManagementDialog
        open={vendorManagementOpen}
        onOpenChange={setVendorManagementOpen}
        projectId={selectedProject}
        onVendorsChange={loadVendors}
      />

      {/* Dialog para novo pagamento de vendor */}
      <Dialog open={newVendorPaymentOpen} onOpenChange={setNewVendorPaymentOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Pagamento de Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Fornecedor *</label>
                {vendors.length > 0 ? (
                  <Select 
                    value={vendorFormData.vendor_id || "manual"} 
                    onValueChange={(v) => {
                      if (v === "manual") {
                        setVendorFormData(prev => ({ ...prev, vendor_id: "", vendor_name: "" }));
                      } else {
                        const vendor = vendors.find(ven => ven.id === v);
                        setVendorFormData(prev => ({ 
                          ...prev, 
                          vendor_id: v, 
                          vendor_name: vendor?.name || "" 
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">+ Digitar manualmente</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                {(!vendorFormData.vendor_id || vendors.length === 0) && (
                  <Input
                    placeholder="Nome do fornecedor"
                    value={vendorFormData.vendor_name}
                    onChange={(e) => setVendorFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
                    className={vendors.length > 0 ? "mt-2" : ""}
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Select 
                  value={vendorFormData.category} 
                  onValueChange={(v) => setVendorFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overhead">Overhead</SelectItem>
                    <SelectItem value="startup">Start-up</SelectItem>
                    <SelectItem value="regulatory">Regulatório</SelectItem>
                    <SelectItem value="ethics">Ética</SelectItem>
                    <SelectItem value="equipment">Equipamentos</SelectItem>
                    <SelectItem value="supplies">Suprimentos</SelectItem>
                    <SelectItem value="training">Treinamento</SelectItem>
                    <SelectItem value="travel">Viagem/Deslocamento</SelectItem>
                    <SelectItem value="laboratory">Laboratório</SelectItem>
                    <SelectItem value="consulting">Consultoria</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor (R$) *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={vendorFormData.amount}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Programada</label>
                <Input
                  type="date"
                  value={vendorFormData.payment_date}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nº Nota Fiscal</label>
                <Input
                  placeholder="NF-123456"
                  value={vendorFormData.invoice_number}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select 
                  value={vendorFormData.status} 
                  onValueChange={(v) => setVendorFormData(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="programado">Programado</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Recorrência</label>
                <Select 
                  value={vendorFormData.recurrence_type} 
                  onValueChange={(v) => setVendorFormData(prev => ({ ...prev, recurrence_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem recorrência</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="semiannual">Semestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {vendorFormData.recurrence_type !== "none" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recorrência até</label>
                  <Input
                    type="date"
                    value={vendorFormData.recurrence_end_date}
                    onChange={(e) => setVendorFormData(prev => ({ ...prev, recurrence_end_date: e.target.value }))}
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Centro de Custo</label>
                <Input
                  placeholder="Ex.: CC-001 / Operações"
                  value={vendorFormData.cost_center}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, cost_center: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Classe de Valor</label>
                <Input
                  placeholder="Ex.: CAPEX, OPEX, Honorários…"
                  value={vendorFormData.value_class}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, value_class: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Estudo Vinculado</label>
                <Select
                  value={vendorFormData.project_id || selectedProject || "__na__"}
                  onValueChange={(v) => setVendorFormData(prev => ({ ...prev, project_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estudo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__na__">Não se aplica (sem estudo vinculado)</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Descrição</label>
                <Input
                  placeholder="Descrição do pagamento"
                  value={vendorFormData.description}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            {vendorFormData.recurrence_type !== "none" && vendorFormData.recurrence_end_date && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Serão criados pagamentos recorrentes até {format(parseLocalDate(vendorFormData.recurrence_end_date), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewVendorPaymentOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              addVendorPayment();
              setNewVendorPaymentOpen(false);
            }} disabled={vendorLoading}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar pagamento de vendor */}
      <Dialog open={paymentConfirmDialog.open} onOpenChange={(open) => {
        if (!open) setPaymentConfirmDialog({ open: false, paymentId: "", paidAt: "", driveFolderLink: "" });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data do Pagamento *</label>
              <Input
                type="date"
                value={paymentConfirmDialog.paidAt}
                onChange={(e) => setPaymentConfirmDialog(prev => ({ ...prev, paidAt: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentConfirmDialog({ open: false, paymentId: "", paidAt: "", driveFolderLink: "" })}>
              Cancelar
            </Button>
            <Button onClick={confirmVendorPayment}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar pagamentos de participante */}
      {editingParticipant && (
        <EditParticipantPaymentsDialog
          open={editParticipantPaymentsOpen}
          onOpenChange={setEditParticipantPaymentsOpen}
          participantId={editingParticipant.participant_id}
          participantCode={editingParticipant.participant_code}
          visits={visits}
          visitTypes={protocolSchedules.map(ps => ({
            id: ps.id,
            visit_number: ps.target_day,
            name: ps.visit_name,
            value: ps.payment_amount
          }))}
          onSave={() => {
            loadProjectData();
            loadPaymentHistory();
          }}
        />
      )}
    </div>
  );
}
