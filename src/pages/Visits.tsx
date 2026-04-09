import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import EDCNav from "@/components/EDCNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Settings, Users, Plus, CheckCircle2, DollarSign, Download, Filter, X, Calendar, Target, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";

interface Project {
  id: string;
  title: string;
}

interface VisitType {
  id: string;
  project_id: string;
  visit_number: number;
  name: string;
  value: number;
  days_from_enrollment: number;
  window_days: number;
}

interface Participant {
  id: string;
  participant_code: string;
  name: string;
  status: string;
  status_date: string | null;
  research_center: string | null;
  enrolled_at: string;
  notes: string | null;
}

const PARTICIPANT_STATUS_OPTIONS = [
  { value: "active", label: "Em acompanhamento" },
  { value: "early_exit", label: "Saída antecipada" },
  { value: "lost_followup", label: "Perda de Follow-up" },
  { value: "completed", label: "Concluído" },
] as const;

interface Visit {
  id: string;
  participant_id: string;
  visit_number: number;
  status: string;
  payment_status: string;
  completed_at: string | null;
  scheduled_date: string | null;
}

interface ResearchCenter {
  id: string;
  code: string;
  name: string | null;
  target_enrollment: number;
  recruitment_status: string;
}

export default function Visits() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get("project");
  const { projectId: persistedProjectId, setProjectId: setPersistedProjectId } = usePersistedFilters();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [visitTypes, setVisitTypes] = useState<VisitType[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [researchCenters, setResearchCenters] = useState<ResearchCenter[]>([]);
  const [loading, setLoading] = useState(true);

  // Setup dialog
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [numVisits, setNumVisits] = useState(6);
  const [visitNames, setVisitNames] = useState<string[]>([]);
  const [visitValues, setVisitValues] = useState<number[]>([]);
  const [visitDays, setVisitDays] = useState<number[]>([]);
  const [visitWindows, setVisitWindows] = useState<number[]>([]);
  const [defaultValue, setDefaultValue] = useState(0);
  const [receiptsFolderLink, setReceiptsFolderLink] = useState("");

  // Add participant dialog
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState("");
  const [newParticipantEnrolledAt, setNewParticipantEnrolledAt] = useState(format(new Date(), "yyyy-MM-dd"));

  // Filters
  const [filterResearchCenter, setFilterResearchCenter] = useState("");
  const [filterCode, setFilterCode] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Edit visit dialog
  const [editVisitOpen, setEditVisitOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<{
    participantId: string;
    visitNumber: number;
    visitId?: string;
    participantCode: string;
    visitName: string;
  } | null>(null);
  const [editVisitCompleted, setEditVisitCompleted] = useState(false);
  const [editVisitNotPerformed, setEditVisitNotPerformed] = useState(false);
  const [editVisitCompletedDate, setEditVisitCompletedDate] = useState("");
  const [editVisitScheduledDate, setEditVisitScheduledDate] = useState("");

  // Pending status changes (local state before saving)
  const [pendingStatusChanges, setPendingStatusChanges] = useState<Record<string, { status: string; date: string | null }>>({});
  
  // Pending notes changes (local state before saving)
  const [pendingNotesChanges, setPendingNotesChanges] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAuth();
    loadProjects();
  }, []);

  useEffect(() => {
    if (projectIdFromUrl && projects.length > 0) {
      setSelectedProject(projectIdFromUrl);
      setPersistedProjectId(projectIdFromUrl);
    } else if (persistedProjectId && projects.length > 0 && !selectedProject) {
      const projectExists = projects.some(p => p.id === persistedProjectId);
      if (projectExists) {
        setSelectedProject(persistedProjectId);
      } else if (projects.length > 0) {
        setSelectedProject(projects[0].id);
        setPersistedProjectId(projects[0].id);
      }
    } else if (!selectedProject && projects.length > 0) {
      setSelectedProject(projects[0].id);
      setPersistedProjectId(projects[0].id);
    }
  }, [projectIdFromUrl, projects, persistedProjectId]);

  useEffect(() => {
    if (selectedProject) {
      loadProjectData();
      subscribeToChanges();
    }
  }, [selectedProject]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("id, title")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar projetos");
      return;
    }
    setProjects(data || []);
    setLoading(false);
  };

  const loadProjectData = useCallback(async () => {
    // Load visit types
    const { data: types } = await supabase
      .from("visit_types")
      .select("*")
      .eq("project_id", selectedProject)
      .order("visit_number");

    setVisitTypes(types || []);

    // Load research centers
    const { data: centers } = await supabase
      .from("research_centers")
      .select("id, code, name, target_enrollment, recruitment_status")
      .eq("project_id", selectedProject)
      .order("code");

    setResearchCenters(centers || []);

    // Load participants
    const { data: parts } = await supabase
      .from("participants")
      .select("id, participant_code, name, status, status_date, research_center, enrolled_at, notes")
      .eq("project_id", selectedProject)
      .order("participant_code");

    setParticipants(parts || []);

    // Load visits
    const { data: visitsData } = await supabase
      .from("visits")
      .select("id, participant_id, visit_number, status, payment_status, completed_at, scheduled_date")
      .eq("project_id", selectedProject);

    setVisits(visitsData || []);

    // Load payment configs for receipts folder link
    const { data: paymentConfig } = await supabase
      .from("payment_configs")
      .select("receipts_folder_link")
      .eq("project_id", selectedProject)
      .maybeSingle();

    if (paymentConfig?.receipts_folder_link) {
      setReceiptsFolderLink(paymentConfig.receipts_folder_link);
    } else {
      setReceiptsFolderLink("");
    }
  }, [selectedProject]);

  const subscribeToChanges = () => {
    const channel = supabase
      .channel("visits-grid-realtime")
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
        { event: "*", schema: "public", table: "visit_types", filter: `project_id=eq.${selectedProject}` },
        () => loadProjectData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "research_centers", filter: `project_id=eq.${selectedProject}` },
        () => loadProjectData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Setup functions
  const initializeSetup = () => {
    if (visitTypes.length > 0) {
      setNumVisits(visitTypes.length);
      setVisitNames(visitTypes.map(vt => vt.name));
      setVisitValues(visitTypes.map(vt => vt.value));
      setVisitDays(visitTypes.map(vt => vt.days_from_enrollment || 0));
      setVisitWindows(visitTypes.map(vt => vt.window_days || 0));
    } else {
      const names = Array.from({ length: numVisits }, (_, i) => `Visita ${i + 1}`);
      const values = Array.from({ length: numVisits }, () => defaultValue);
      const days = Array.from({ length: numVisits }, (_, i) => i * 30);
      const windows = Array.from({ length: numVisits }, () => 3);
      setVisitNames(names);
      setVisitValues(values);
      setVisitDays(days);
      setVisitWindows(windows);
    }
  };

  useEffect(() => {
    if (setupDialogOpen) {
      initializeSetup();
    }
  }, [setupDialogOpen]);

  useEffect(() => {
    if (setupDialogOpen && visitTypes.length === 0) {
      const names = Array.from({ length: numVisits }, (_, i) => `Visita ${i + 1}`);
      const values = Array.from({ length: numVisits }, () => defaultValue);
      const days = Array.from({ length: numVisits }, (_, i) => i * 30);
      const windows = Array.from({ length: numVisits }, () => 3);
      setVisitNames(names);
      setVisitValues(values);
      setVisitDays(days);
      setVisitWindows(windows);
    }
  }, [numVisits, defaultValue]);

  const saveProjectSetup = async () => {
    try {
      // Delete existing visit types
      await supabase.from("visit_types").delete().eq("project_id", selectedProject);

      // Insert new visit types
      const visitTypesData = visitNames.map((name, index) => ({
        project_id: selectedProject,
        visit_number: index + 1,
        name,
        value: visitValues[index] || 0,
        days_from_enrollment: visitDays[index] || 0,
        window_days: visitWindows[index] || 0,
      }));

      const { error } = await supabase.from("visit_types").insert(visitTypesData);

      if (error) throw error;

      // Save receipts folder link to payment_configs
      if (receiptsFolderLink) {
        const { data: existingConfig } = await supabase
          .from("payment_configs")
          .select("id")
          .eq("project_id", selectedProject)
          .maybeSingle();

        if (existingConfig) {
          await supabase
            .from("payment_configs")
            .update({ receipts_folder_link: receiptsFolderLink })
            .eq("project_id", selectedProject);
        } else {
          await supabase
            .from("payment_configs")
            .insert({
              project_id: selectedProject,
              receipts_folder_link: receiptsFolderLink,
            });
        }
      }

      toast.success("Configuração do estudo salva com sucesso!");
      setSetupDialogOpen(false);
      loadProjectData();
    } catch (error) {
      console.error("Error saving setup:", error);
      toast.error("Erro ao salvar configuração");
    }
  };

  // Generate participant code based on center code (2 chars) and sequential (4 chars)
  const generateParticipantCode = (centerCode: string) => {
    const centerParticipants = participants.filter(
      p => p.research_center === centerCode || p.participant_code.startsWith(`${centerCode}-`)
    );
    const nextSequential = centerParticipants.length + 1;
    const formattedCenterCode = centerCode.padStart(2, "0").slice(-2);
    return `${formattedCenterCode}-${String(nextSequential).padStart(4, "0")}`;
  };

  const addParticipant = async () => {
    if (!selectedCenter) {
      toast.error("Selecione um centro de pesquisa");
      return;
    }

    const center = researchCenters.find(c => c.code === selectedCenter);
    if (!center) {
      toast.error("Centro não encontrado");
      return;
    }

    const participantCode = generateParticipantCode(center.code);

    try {
      // Create participant
      const { data: participant, error: pError } = await supabase
        .from("participants")
        .insert({
          project_id: selectedProject,
          participant_code: participantCode,
          name: participantCode,
          research_center: center.code,
          enrolled_at: newParticipantEnrolledAt,
        })
        .select()
        .single();

      if (pError) throw pError;

      // Create visits for participant based on visit types with scheduled dates
      if (visitTypes.length > 0) {
        const enrollmentDate = parseISO(newParticipantEnrolledAt);
        const visitsData = visitTypes.map((vt) => ({
          project_id: selectedProject,
          participant_id: participant.id,
          visit_number: vt.visit_number,
          status: "pending",
          payment_status: "pending",
          payment_amount: vt.value,
          scheduled_date: format(addDays(enrollmentDate, vt.days_from_enrollment || 0), "yyyy-MM-dd"),
        }));

        const { error: vError } = await supabase.from("visits").insert(visitsData);
        if (vError) console.error("Error creating visits:", vError);
      }

      toast.success(`Participante ${participantCode} adicionado com sucesso!`);
      setAddParticipantOpen(false);
      setSelectedCenter("");
      setNewParticipantEnrolledAt(format(new Date(), "yyyy-MM-dd"));
      loadProjectData();
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Código de participante já existe");
      } else {
        toast.error("Erro ao adicionar participante");
      }
    }
  };

  const openEditVisitDialog = (participantId: string, visitNumber: number) => {
    const visit = visits.find(
      (v) => v.participant_id === participantId && v.visit_number === visitNumber
    );
    const participant = participants.find(p => p.id === participantId);
    const visitType = visitTypes.find(vt => vt.visit_number === visitNumber);
    
    // Calculate default scheduled date if not set
    let defaultScheduledDate = "";
    if (participant && visitType) {
      const enrollmentDate = parseISO(participant.enrolled_at);
      defaultScheduledDate = format(addDays(enrollmentDate, visitType.days_from_enrollment || 0), "yyyy-MM-dd");
    }

    setEditingVisit({
      participantId,
      visitNumber,
      visitId: visit?.id,
      participantCode: participant?.participant_code || "",
      visitName: visitType?.name || `Visita ${visitNumber}`,
    });
    setEditVisitCompleted(visit?.status === "completed");
    setEditVisitNotPerformed(visit?.status === "not_performed");
    setEditVisitCompletedDate(visit?.completed_at ? format(parseISO(visit.completed_at), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
    setEditVisitScheduledDate(visit?.scheduled_date || defaultScheduledDate);
    setEditVisitOpen(true);
  };

  const saveVisitChanges = async () => {
    if (!editingVisit) return;

    const visitType = visitTypes.find(vt => vt.visit_number === editingVisit.visitNumber);
    
    try {
      const getStatus = () => {
        if (editVisitNotPerformed) return "not_performed";
        if (editVisitCompleted) return "completed";
        return "pending";
      };

      if (editingVisit.visitId) {
        // Update existing visit
        const updateData: any = {
          status: getStatus(),
          scheduled_date: editVisitScheduledDate || null,
          completed_at: editVisitCompleted && editVisitCompletedDate 
            ? new Date(editVisitCompletedDate + "T12:00:00").toISOString() 
            : null,
        };

        const { error } = await supabase
          .from("visits")
          .update(updateData)
          .eq("id", editingVisit.visitId);

        if (error) throw error;
      } else {
        // Create new visit
        const { error } = await supabase.from("visits").insert({
          project_id: selectedProject,
          participant_id: editingVisit.participantId,
          visit_number: editingVisit.visitNumber,
          status: getStatus(),
          payment_status: "pending",
          payment_amount: visitType?.value || 0,
          completed_at: editVisitCompleted && editVisitCompletedDate 
            ? new Date(editVisitCompletedDate + "T12:00:00").toISOString() 
            : null,
          scheduled_date: editVisitScheduledDate || null,
        });

        if (error) throw error;
      }

      toast.success("Visita atualizada com sucesso!");
      setEditVisitOpen(false);
      setEditingVisit(null);
      loadProjectData();
    } catch (error) {
      console.error("Error saving visit:", error);
      toast.error("Erro ao salvar visita");
    }
  };

  const deleteParticipant = async (participantId: string) => {
    if (!confirm("Tem certeza que deseja excluir este participante e todas as suas visitas?")) return;

    try {
      // Delete visits first
      await supabase.from("visits").delete().eq("participant_id", participantId);
      // Delete participant
      const { error } = await supabase.from("participants").delete().eq("id", participantId);

      if (error) throw error;
      toast.success("Participante excluído");
      loadProjectData();
    } catch (error) {
      toast.error("Erro ao excluir participante");
    }
  };

  const updateParticipantStatus = async (participantId: string, newStatus: string, statusDate: string | null) => {
    // Validation for "completed" status - all visits must be completed
    if (newStatus === "completed") {
      const participantVisits = visits.filter(v => v.participant_id === participantId);
      const allVisitsCompleted = visitTypes.every(vt => {
        const visit = participantVisits.find(v => v.visit_number === vt.visit_number);
        return visit?.status === "completed" || visit?.status === "not_performed";
      });
      
      if (!allVisitsCompleted) {
        toast.error("Todas as visitas devem estar concluídas ou marcadas como não realizadas para selecionar 'Concluído'");
        return;
      }
    }

    try {
      const { error } = await supabase
        .from("participants")
        .update({ 
          status: newStatus, 
          status_date: newStatus === "active" ? null : statusDate 
        })
        .eq("id", participantId);

      if (error) throw error;
      toast.success("Status do participante atualizado");
      loadProjectData();
    } catch (error) {
      console.error("Error updating participant status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const updateParticipantNotes = async (participantId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from("participants")
        .update({ notes: notes || null })
        .eq("id", participantId);

      if (error) throw error;
      toast.success("Notas atualizadas");
      loadProjectData();
    } catch (error) {
      console.error("Error updating participant notes:", error);
      toast.error("Erro ao atualizar notas");
    }
  };

  const getParticipantStatusLabel = (status: string) => {
    const found = PARTICIPANT_STATUS_OPTIONS.find(opt => opt.value === status);
    return found?.label || "Em acompanhamento";
  };

  // Check if a visit is disabled based on participant status
  const isVisitDisabled = (participant: Participant, visitNumber: number) => {
    const status = participant.status;
    const statusDate = participant.status_date;
    
    // If active, visits are enabled
    if (!status || status === "active") return false;
    
    // If completed, all visits remain as they are (no editing)
    if (status === "completed") return true;
    
    // For early_exit or lost_followup, disable visits scheduled after the status date
    if ((status === "early_exit" || status === "lost_followup") && statusDate) {
      const visit = visits.find(v => v.participant_id === participant.id && v.visit_number === visitNumber);
      if (visit?.scheduled_date) {
        return parseISO(visit.scheduled_date) > parseISO(statusDate);
      }
    }
    
    return false;
  };

  const getVisitStatus = (participantId: string, visitNumber: number) => {
    const visit = visits.find(
      (v) => v.participant_id === participantId && v.visit_number === visitNumber
    );
    return visit?.status === "completed";
  };

  const getVisitScheduledDate = (participantId: string, visitNumber: number) => {
    const visit = visits.find(
      (v) => v.participant_id === participantId && v.visit_number === visitNumber
    );
    return visit?.scheduled_date;
  };

  const getVisitCompletedAt = (participantId: string, visitNumber: number) => {
    const visit = visits.find(
      (v) => v.participant_id === participantId && v.visit_number === visitNumber
    );
    return visit?.completed_at;
  };

  const isVisitNotPerformed = (participantId: string, visitNumber: number) => {
    const visit = visits.find(
      (v) => v.participant_id === participantId && v.visit_number === visitNumber
    );
    return visit?.status === "not_performed";
  };

  const isVisitOutsideWindow = (participantId: string, visitNumber: number, windowDays: number) => {
    const visit = visits.find(
      (v) => v.participant_id === participantId && v.visit_number === visitNumber
    );
    
    if (!visit || visit.status !== "completed" || !visit.completed_at || !visit.scheduled_date || windowDays === 0) {
      return false;
    }

    const scheduledDate = parseISO(visit.scheduled_date);
    const completedDate = parseISO(visit.completed_at);
    const windowStart = addDays(scheduledDate, -windowDays);
    const windowEnd = addDays(scheduledDate, windowDays);
    
    return completedDate < windowStart || completedDate > windowEnd;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  // Calculate totals
  const calculateParticipantTotal = (participantId: string) => {
    return visits
      .filter((v) => v.participant_id === participantId && v.status === "completed")
      .reduce((sum, v) => {
        const visitType = visitTypes.find((vt) => vt.visit_number === v.visit_number);
        return sum + (visitType?.value || 0);
      }, 0);
  };

  // Calculate recruitment by center
  const getCenterRecruitment = (centerCode: string) => {
    return participants.filter(p => p.research_center === centerCode).length;
  };


  // Count pending visits already within protocol window
  const countPendingVisitsInWindow = () => {
    const today = new Date();
    let count = 0;
    visits.forEach((visit) => {
      if (visit.status !== "pending" || !visit.scheduled_date) return;
      
      const visitType = visitTypes.find(vt => vt.visit_number === visit.visit_number);
      const windowDays = visitType?.window_days || 0;

      const scheduledDate = parseISO(visit.scheduled_date);
      const windowStart = addDays(scheduledDate, -windowDays);
      const windowEnd = addDays(scheduledDate, windowDays);
      
      if (today >= windowStart && today <= windowEnd) {
        count++;
      }
    });
    return count;
  };

  const pendingInWindowCount = countPendingVisitsInWindow();

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    const matchesCenter = !filterResearchCenter || 
      (p.research_center?.toLowerCase().includes(filterResearchCenter.toLowerCase()));
    const matchesCode = !filterCode || 
      p.participant_code.toLowerCase().includes(filterCode.toLowerCase());
    return matchesCenter && matchesCode;
  });

  const totalDueToCenter = filteredParticipants.reduce((sum, p) => sum + calculateParticipantTotal(p.id), 0);

  // Get unique research centers for filter options
  const uniqueCenters = [...new Set(participants.map(p => p.research_center).filter(Boolean))];

  const exportToCSV = () => {
    if (filteredParticipants.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const headers = ["Centro de Pesquisa", "Código", "Data Inclusão", ...visitTypes.map((vt) => vt.name), "Total Devido"];
    const rows = filteredParticipants.map((p) => {
      const visitStatuses = visitTypes.map((vt) => (getVisitStatus(p.id, vt.visit_number) ? "X" : ""));
      const total = calculateParticipantTotal(p.id);
      return [p.research_center || "", p.participant_code, p.enrolled_at, ...visitStatuses, total.toFixed(2)];
    });

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const projectName = projects.find((p) => p.id === selectedProject)?.title || "projeto";
    link.href = URL.createObjectURL(blob);
    link.download = `visitas_${projectName}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast.success("Arquivo exportado com sucesso!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EDCNav />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EDCNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Controle de Visitas</h1>
            <p className="text-muted-foreground mt-1">
              Registre visitas e acompanhe valores devidos por projeto
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
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Selecione um projeto para gerenciar visitas
              </p>
            </CardContent>
          </Card>
        ) : visitTypes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Settings className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center mb-4">
                Configure as visitas deste estudo primeiro
              </p>
              <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar Estudo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configurar Visitas do Estudo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Número de Visitas</Label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={numVisits}
                          onChange={(e) => setNumVisits(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor Padrão por Visita (R$)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={defaultValue}
                          onChange={(e) => setDefaultValue(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Configurar cada visita (com dias do protocolo)</Label>
                      <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto space-y-3">
                        {visitNames.map((name, index) => (
                          <div key={index} className="grid grid-cols-4 gap-2 items-center">
                            <span className="text-sm text-muted-foreground">V{index + 1}</span>
                            <Input
                              placeholder={`Nome da visita ${index + 1}`}
                              value={name}
                              onChange={(e) => {
                                const newNames = [...visitNames];
                                newNames[index] = e.target.value;
                                setVisitNames(newNames);
                              }}
                            />
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                placeholder="Dias"
                                value={visitDays[index] || 0}
                                onChange={(e) => {
                                  const newDays = [...visitDays];
                                  newDays[index] = Number(e.target.value);
                                  setVisitDays(newDays);
                                }}
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">dias</span>
                            </div>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Valor"
                              value={visitValues[index] || 0}
                              onChange={(e) => {
                                const newValues = [...visitValues];
                                newValues[index] = Number(e.target.value);
                                setVisitValues(newValues);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Pasta de Comprovantes (Link Externo)
                      </Label>
                      <Input
                        type="url"
                        placeholder="https://drive.google.com/drive/folders/..."
                        value={receiptsFolderLink}
                        onChange={(e) => setReceiptsFolderLink(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Link para a pasta onde serão arquivados os comprovantes de pagamento
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSetupDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={saveProjectSetup}>Salvar Configuração</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Recruitment Status by Center */}
            {researchCenters.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Status de Recrutamento por Centro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {researchCenters.map((center) => {
                      const enrolled = getCenterRecruitment(center.code);
                      const target = center.target_enrollment || 0;
                      const progress = target > 0 ? (enrolled / target) * 100 : 0;
                      return (
                        <div key={center.id} className="p-4 border rounded-lg space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{center.code}</p>
                              <p className="text-sm text-muted-foreground">{center.name || "Sem nome"}</p>
                            </div>
                            <Badge variant={progress >= 100 ? "default" : "secondary"}>
                              {enrolled}/{target || "∞"}
                            </Badge>
                          </div>
                          {target > 0 && (
                            <Progress value={Math.min(progress, 100)} className="h-2" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Participantes</p>
                      <p className="text-2xl font-bold">{participants.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-info/10 rounded-lg">
                      <CheckCircle2 className="h-6 w-6 text-info" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Visitas Configuradas</p>
                      <p className="text-2xl font-bold">{visitTypes.length}</p>
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
                    <div>
                      <p className="text-sm text-muted-foreground">Visitas Concluídas</p>
                      <p className="text-2xl font-bold">{visits.filter((v) => v.status === "completed").length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className={pendingInWindowCount > 0 ? "border-warning" : ""}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${pendingInWindowCount > 0 ? "bg-warning/10" : "bg-muted"}`}>
                      <Clock className={`h-6 w-6 ${pendingInWindowCount > 0 ? "text-warning" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Na Janela (Pendentes)</p>
                      <p className={`text-2xl font-bold ${pendingInWindowCount > 0 ? "text-warning" : ""}`}>
                        {pendingInWindowCount}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap gap-2">
            {/* Add Participant Dialog */}
              <Dialog open={addParticipantOpen} onOpenChange={setAddParticipantOpen}>
                <DialogTrigger asChild>
                  <Button disabled={researchCenters.length === 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Participante
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Participante</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Centro de Pesquisa *</Label>
                      <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um centro" />
                        </SelectTrigger>
                        <SelectContent>
                          {researchCenters.map((center) => (
                            <SelectItem key={center.id} value={center.code}>
                              {center.code} - {center.name || "Sem nome"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedCenter && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Código do participante:</p>
                        <p className="font-mono font-medium">{generateParticipantCode(selectedCenter)}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Data de Inclusão *</Label>
                      <Input
                        type="date"
                        value={newParticipantEnrolledAt}
                        onChange={(e) => setNewParticipantEnrolledAt(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddParticipantOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={addParticipant}>Adicionar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Editar Configuração
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configurar Visitas do Estudo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Número de Visitas</Label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={numVisits}
                          onChange={(e) => setNumVisits(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor Padrão por Visita (R$)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={defaultValue}
                          onChange={(e) => setDefaultValue(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Configurar cada visita (com dias do protocolo e janela)</Label>
                      <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto space-y-3">
                        <div className="grid grid-cols-5 gap-2 items-center text-xs text-muted-foreground font-medium">
                          <span></span>
                          <span>Nome</span>
                          <span>Dia do protocolo</span>
                          <span>Janela (±dias)</span>
                          <span>Valor (R$)</span>
                        </div>
                        {visitNames.map((name, index) => (
                          <div key={index} className="grid grid-cols-5 gap-2 items-center">
                            <span className="text-sm text-muted-foreground">V{index + 1}</span>
                            <Input
                              placeholder={`Visita ${index + 1}`}
                              value={name}
                              onChange={(e) => {
                                const newNames = [...visitNames];
                                newNames[index] = e.target.value;
                                setVisitNames(newNames);
                              }}
                            />
                            <Input
                              type="number"
                              min={0}
                              placeholder="Dias"
                              value={visitDays[index] || 0}
                              onChange={(e) => {
                                const newDays = [...visitDays];
                                newDays[index] = Number(e.target.value);
                                setVisitDays(newDays);
                              }}
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">±</span>
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={visitWindows[index] || 0}
                                onChange={(e) => {
                                  const newWindows = [...visitWindows];
                                  newWindows[index] = Number(e.target.value);
                                  setVisitWindows(newWindows);
                                }}
                              />
                            </div>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Valor"
                              value={visitValues[index] || 0}
                              onChange={(e) => {
                                const newValues = [...visitValues];
                                newValues[index] = Number(e.target.value);
                                setVisitValues(newValues);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Pasta de Comprovantes (Link Externo)
                      </Label>
                      <Input
                        type="url"
                        placeholder="https://drive.google.com/drive/folders/..."
                        value={receiptsFolderLink}
                        onChange={(e) => setReceiptsFolderLink(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Link para a pasta onde serão arquivados os comprovantes de pagamento
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSetupDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={saveProjectSetup}>Salvar Configuração</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={exportToCSV} disabled={filteredParticipants.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>

              <Button 
                variant={showFilters ? "secondary" : "outline"} 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {(filterResearchCenter || filterCode) && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    !
                  </Badge>
                )}
              </Button>
            </div>

            {/* Filters */}
            {showFilters && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-2 min-w-[200px]">
                      <Label>Centro de Pesquisa</Label>
                      <Select value={filterResearchCenter || "all"} onValueChange={(v) => setFilterResearchCenter(v === "all" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os centros" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os centros</SelectItem>
                          {researchCenters.map((center) => (
                            <SelectItem key={center.id} value={center.code}>
                              {center.code} - {center.name || "Sem nome"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 min-w-[200px]">
                      <Label>Código do Participante</Label>
                      <Input
                        value={filterCode}
                        onChange={(e) => setFilterCode(e.target.value)}
                        placeholder="Buscar por código..."
                      />
                    </div>
                    {(filterResearchCenter || filterCode) && (
                      <Button 
                        variant="ghost" 
                        onClick={() => { setFilterResearchCenter(""); setFilterCode(""); }}
                        className="text-muted-foreground"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Exibindo {filteredParticipants.length} de {participants.length} participantes
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Edit Visit Dialog */}
            <Dialog open={editVisitOpen} onOpenChange={setEditVisitOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Visita</DialogTitle>
                </DialogHeader>
                {editingVisit && (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Participante</p>
                      <p className="font-medium">{editingVisit.participantCode}</p>
                      <p className="text-sm text-muted-foreground mt-2">Visita</p>
                      <p className="font-medium">{editingVisit.visitName}</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Data Programada</Label>
                      <Input
                        type="date"
                        value={editVisitScheduledDate}
                        onChange={(e) => setEditVisitScheduledDate(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="visitCompleted"
                        checked={editVisitCompleted}
                        disabled={editVisitNotPerformed}
                        onCheckedChange={(checked) => {
                          setEditVisitCompleted(checked === true);
                          if (checked) setEditVisitNotPerformed(false);
                        }}
                      />
                      <Label htmlFor="visitCompleted" className={`cursor-pointer ${editVisitNotPerformed ? "text-muted-foreground" : ""}`}>
                        Visita Realizada
                      </Label>
                    </div>

                    {editVisitCompleted && !editVisitNotPerformed && (
                      <div className="space-y-2">
                        <Label>Data da Realização *</Label>
                        <Input
                          type="date"
                          value={editVisitCompletedDate}
                          onChange={(e) => setEditVisitCompletedDate(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="visitNotPerformed"
                        checked={editVisitNotPerformed}
                        onCheckedChange={(checked) => {
                          setEditVisitNotPerformed(checked === true);
                          if (checked) setEditVisitCompleted(false);
                        }}
                      />
                      <Label htmlFor="visitNotPerformed" className="cursor-pointer text-destructive">
                        Visita Não Realizada
                      </Label>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditVisitOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={saveVisitChanges}>
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Visits Grid */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Grade de Visitas</CardTitle>
                  <CardDescription>
                    Marque as visitas concluídas para cada participante. Datas são calculadas automaticamente.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={filterResearchCenter || "all"} onValueChange={(v) => setFilterResearchCenter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Todos os centros" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os centros</SelectItem>
                      {researchCenters.map((center) => (
                        <SelectItem key={center.id} value={center.code}>
                          {center.code} - {center.name || "Sem nome"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filterResearchCenter && (
                    <Button variant="ghost" size="sm" onClick={() => setFilterResearchCenter("")}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {researchCenters.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum centro de pesquisa cadastrado</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure os centros na página de Projetos
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate("/projects")}
                    >
                      Ir para Projetos
                    </Button>
                  </div>
                ) : participants.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum participante cadastrado</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Clique em "Adicionar Participante" para começar
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background z-10 min-w-[100px]">Centro</TableHead>
                          <TableHead className="sticky left-[100px] bg-background z-10 min-w-[120px]">Código</TableHead>
                          <TableHead className="min-w-[100px]">Inclusão</TableHead>
                          {visitTypes.map((vt) => (
                            <TableHead key={vt.id} className="text-center min-w-[120px]">
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-medium">{vt.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  D{vt.days_from_enrollment || 0}
                                </span>
                                {vt.window_days > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    ±{vt.window_days} dias
                                  </span>
                                )}
                              </div>
                            </TableHead>
                          ))}
                          <TableHead className="text-center min-w-[180px]">Status</TableHead>
                          <TableHead className="min-w-[200px]">Notas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredParticipants.map((participant) => {
                          const hasPendingChanges = pendingStatusChanges[participant.id] !== undefined;
                          return (
                          <TableRow 
                            key={participant.id}
                            className={hasPendingChanges ? "bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-300 dark:ring-amber-700" : ""}
                          >
                            <TableCell className={`sticky left-0 z-10 font-medium ${hasPendingChanges ? "bg-amber-50 dark:bg-amber-950/30" : "bg-background"}`}>
                              {participant.research_center || "-"}
                            </TableCell>
                            <TableCell className={`sticky left-[100px] z-10 font-medium ${hasPendingChanges ? "bg-amber-50 dark:bg-amber-950/30" : "bg-background"}`}>
                              {participant.participant_code}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(parseISO(participant.enrolled_at), "dd/MM/yy", { locale: ptBR })}
                            </TableCell>
                            {visitTypes.map((vt) => {
                              const isCompleted = getVisitStatus(participant.id, vt.visit_number);
                              const notPerformed = isVisitNotPerformed(participant.id, vt.visit_number);
                              const scheduledDate = getVisitScheduledDate(participant.id, vt.visit_number);
                              const completedAt = getVisitCompletedAt(participant.id, vt.visit_number);
                              const windowDays = vt.window_days || 0;
                              const outsideWindow = isVisitOutsideWindow(participant.id, vt.visit_number, windowDays);
                              const disabled = isVisitDisabled(participant, vt.visit_number);
                              
                              // Calculate window dates
                              let windowStart = "";
                              let windowEnd = "";
                              if (scheduledDate) {
                                const scheduled = parseISO(scheduledDate);
                                if (windowDays > 0) {
                                  windowStart = format(addDays(scheduled, -windowDays), "dd/MM", { locale: ptBR });
                                  windowEnd = format(addDays(scheduled, windowDays), "dd/MM", { locale: ptBR });
                                }
                              }
                              
                              return (
                                <TableCell 
                                  key={vt.id} 
                                  className={`text-center transition-colors ${
                                    disabled
                                      ? "bg-muted/30 opacity-50 cursor-not-allowed"
                                      : notPerformed
                                        ? "bg-muted/50 hover:bg-muted cursor-pointer"
                                        : outsideWindow 
                                          ? "bg-destructive/20 hover:bg-destructive/30 cursor-pointer" 
                                          : "hover:bg-muted/50 cursor-pointer"
                                  }`}
                                  onClick={() => !disabled && openEditVisitDialog(participant.id, vt.visit_number)}
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    {notPerformed ? (
                                      <div className="w-4 h-4 flex items-center justify-center">
                                        <X className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    ) : disabled && !isCompleted ? (
                                      <div className="w-4 h-4 flex items-center justify-center">
                                        <span className="text-muted-foreground text-xs">—</span>
                                      </div>
                                    ) : (
                                      <Checkbox
                                        checked={isCompleted}
                                        className={`mx-auto pointer-events-none ${outsideWindow ? "border-destructive" : ""}`}
                                      />
                                    )}
                                    {isCompleted && completedAt && !notPerformed && (
                                      <span className={`text-xs font-medium ${outsideWindow ? "text-destructive" : "text-success"}`}>
                                        {format(parseISO(completedAt), "dd/MM", { locale: ptBR })}
                                      </span>
                                    )}
                                    {notPerformed && (
                                      <span className="text-[10px] text-muted-foreground">
                                        Não realizada
                                      </span>
                                    )}
                                    {disabled && !isCompleted && !notPerformed && (
                                      <span className="text-[10px] text-muted-foreground">
                                        Desabilitada
                                      </span>
                                    )}
                                    {scheduledDate && !notPerformed && !disabled && (
                                      <div className="flex flex-col items-center">
                                        <span className="text-[10px] text-muted-foreground">
                                          Prog: {format(parseISO(scheduledDate), "dd/MM", { locale: ptBR })}
                                        </span>
                                        {windowDays > 0 && (
                                          <span className="text-[10px] text-muted-foreground">
                                            ({windowStart} - {windowEnd})
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center">
                              {(() => {
                                const pending = pendingStatusChanges[participant.id];
                                const currentStatus = pending?.status ?? participant.status ?? "active";
                                const currentDate = pending?.date ?? participant.status_date;
                                const hasPendingChanges = pending !== undefined;
                                
                                return (
                                  <div className="flex flex-col items-center gap-1">
                                    <Select 
                                      value={currentStatus} 
                                      onValueChange={(value) => {
                                        if (value === "active") {
                                          setPendingStatusChanges(prev => ({
                                            ...prev,
                                            [participant.id]: { status: value, date: null }
                                          }));
                                        } else {
                                          setPendingStatusChanges(prev => ({
                                            ...prev,
                                            [participant.id]: { 
                                              status: value, 
                                              date: currentDate || format(new Date(), "yyyy-MM-dd") 
                                            }
                                          }));
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="w-[160px] h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {PARTICIPANT_STATUS_OPTIONS.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {currentStatus && currentStatus !== "active" && (
                                      <Input
                                        type="date"
                                        value={currentDate || ""}
                                        className="w-[140px] h-7 text-xs"
                                        onChange={(e) => {
                                          setPendingStatusChanges(prev => ({
                                            ...prev,
                                            [participant.id]: { status: currentStatus, date: e.target.value }
                                          }));
                                        }}
                                      />
                                    )}
                                    {hasPendingChanges && (
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={async () => {
                                          await updateParticipantStatus(participant.id, pending.status, pending.date);
                                          setPendingStatusChanges(prev => {
                                            const newState = { ...prev };
                                            delete newState[participant.id];
                                            return newState;
                                          });
                                        }}
                                      >
                                        Salvar
                                      </Button>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const pendingNotes = pendingNotesChanges[participant.id];
                                const currentNotes = pendingNotes !== undefined ? pendingNotes : (participant.notes || "");
                                const hasNotesPending = pendingNotes !== undefined;
                                
                                return (
                                  <div className="flex flex-col gap-1">
                                    <Input
                                      type="text"
                                      placeholder="Adicionar notas..."
                                      value={currentNotes}
                                      className="h-8 text-xs min-w-[180px]"
                                      onChange={(e) => {
                                        setPendingNotesChanges(prev => ({
                                          ...prev,
                                          [participant.id]: e.target.value
                                        }));
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    {hasNotesPending && (
                                      <Button
                                        size="sm"
                                        className="h-6 text-xs"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await updateParticipantNotes(participant.id, pendingNotes);
                                          setPendingNotesChanges(prev => {
                                            const newState = { ...prev };
                                            delete newState[participant.id];
                                            return newState;
                                          });
                                        }}
                                      >
                                        Salvar
                                      </Button>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
