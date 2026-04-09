import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CTMSNav from "@/components/CTMSNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";
import { 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Search,
  ChevronRight,
  Users,
  AlertCircle,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  History,
  FileText
} from "lucide-react";
import * as XLSX from "xlsx";
import FindingDialog from "@/components/centers/FindingDialog";
import FindingHistoryDialog from "@/components/centers/FindingHistoryDialog";
import ImportFindingsDialog from "@/components/centers/ImportFindingsDialog";
import StudyFormsDialog from "@/components/centers/StudyFormsDialog";
import EditCenterDialog from "@/components/centers/EditCenterDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ResearchCenter {
  id: string;
  code: string;
  name: string | null;
  pi_name: string | null;
  coordinator_name: string | null;
  notes?: string | null;
  project_id: string;
  project?: {
    title: string;
  };
  visitStats?: {
    completed: number;
    scheduled: number;
  };
}

interface VisitFinding {
  id: string;
  visit_id: string | null;
  is_remote?: boolean;
  participant_code?: string | null;
  finding_type?: string | null;
  form_name?: string | null;
  responsible_name?: string | null;
  description: string;
  severity: string;
  status: string;
  due_date: string | null;
  resolved_at?: string | null;
  assigned_to: string | null;
  resolution: string | null;
  created_at: string;
  visit?: {
    id: string;
    visit_type: string;
    scheduled_date: string;
    research_center_id: string | null;
    research_center?: ResearchCenter;
  };
}

interface CenterWithFindings {
  center: ResearchCenter;
  findings: VisitFinding[];
  openCount: number;
  resolvedCount: number;
  overdueCount: number;
}

const CenterManagement = () => {
  const navigate = useNavigate();
  const { 
    centerId: persistedCenterId, 
    setCenterId: setPersistedCenterId,
    centerManagementProjectId: persistedProjectId,
    setCenterManagementProjectId: setPersistedProjectId
  } = usePersistedFilters();
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState<CenterWithFindings[]>([]);
  const [allFindings, setAllFindings] = useState<VisitFinding[]>([]);
  
  // Dialog state
  const [findingDialogOpen, setFindingDialogOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<VisitFinding | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [findingToDelete, setFindingToDelete] = useState<VisitFinding | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyFindingId, setHistoryFindingId] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [formsDialogOpen, setFormsDialogOpen] = useState(false);
  const [editCenterDialogOpen, setEditCenterDialogOpen] = useState(false);
  const [selectedCenterForEdit, setSelectedCenterForEdit] = useState<ResearchCenter | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [dueDateFilter, setDueDateFilter] = useState<string>("all");
  const [selectedCenter, setSelectedCenter] = useState<string>(() => persistedCenterId || "all");
  const [selectedProject, setSelectedProject] = useState<string>(() => persistedProjectId || "all");

  // Derived data - unique projects from centers
  const uniqueProjects = centers.reduce((acc, item) => {
    if (item.center.project_id && !acc.find(p => p.id === item.center.project_id)) {
      acc.push({
        id: item.center.project_id,
        title: item.center.project?.title || "Projeto sem nome"
      });
    }
    return acc;
  }, [] as { id: string; title: string }[]);

  // Filter centers by selected project
  const filteredCenters = selectedProject === "all" 
    ? centers 
    : centers.filter(item => item.center.project_id === selectedProject);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load research centers with project info
      const { data: centersData, error: centersError } = await supabase
        .from("research_centers")
        .select(`
          *,
          project:projects(title)
        `)
        .order("code");

      if (centersError) throw centersError;

      // Load all visits with their findings
      const { data: visitsData, error: visitsError } = await supabase
        .from("study_visits")
        .select(`
          id,
          visit_type,
          scheduled_date,
          status,
          research_center_id
        `);

      if (visitsError) throw visitsError;

      // Load all findings
      const { data: findingsData, error: findingsError } = await supabase
        .from("visit_findings")
        .select("*")
        .order("created_at", { ascending: false });

      if (findingsError) throw findingsError;

      // Map findings to visits and centers
      const findingsWithVisits = (findingsData || []).map(finding => {
        const visit = visitsData?.find(v => v.id === finding.visit_id);
        const center = centersData?.find(c => c.id === visit?.research_center_id);
        return {
          ...finding,
          visit: visit ? {
            ...visit,
            research_center: center
          } : undefined
        };
      });

      setAllFindings(findingsWithVisits);

      // Group findings by center and calculate visit stats
      const centersWithFindings: CenterWithFindings[] = (centersData || []).map(center => {
        const centerFindings = findingsWithVisits.filter(
          f => f.visit?.research_center_id === center.id
        );
        
        const centerVisits = visitsData?.filter(v => v.research_center_id === center.id) || [];
        const completedVisits = centerVisits.filter(v => v.status === "completed").length;
        const scheduledVisits = centerVisits.filter(v => v.status === "scheduled").length;
        
        const today = new Date();
        const openFindings = centerFindings.filter(f => f.status === "open");
        const overdueFindings = openFindings.filter(f => 
          f.due_date && isBefore(parseISO(f.due_date), today)
        );

        return {
          center: {
            ...center,
            visitStats: {
              completed: completedVisits,
              scheduled: scheduledVisits
            }
          },
          findings: centerFindings,
          openCount: openFindings.length,
          resolvedCount: centerFindings.filter(f => f.status === "closed").length,
          overdueCount: overdueFindings.length
        };
      });

      setCenters(centersWithFindings);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredFindings = () => {
    let filtered = allFindings;

    if (searchTerm) {
      filtered = filtered.filter(f => 
        f.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(f => f.status === statusFilter);
    }

    if (severityFilter !== "all") {
      filtered = filtered.filter(f => f.severity === severityFilter);
    }

    if (selectedCenter !== "all") {
      filtered = filtered.filter(f => f.visit?.research_center_id === selectedCenter);
    }

    if (dueDateFilter !== "all") {
      const today = new Date();
      filtered = filtered.filter(f => {
        if (!f.due_date) return dueDateFilter === "no_date";
        const dueDate = parseISO(f.due_date);
        switch (dueDateFilter) {
          case "overdue":
            return isBefore(dueDate, today) && f.status === "open";
          case "today":
            return format(dueDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
          case "this_week":
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            return isAfter(dueDate, today) && isBefore(dueDate, weekFromNow);
          case "no_date":
            return false;
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Crítico</Badge>;
      case "major":
        return <Badge className="bg-orange-500 hover:bg-orange-600">Maior</Badge>;
      case "minor":
        return <Badge variant="secondary">Menor</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Aberto</Badge>;
      case "closed":
        return <Badge className="bg-green-500 hover:bg-green-600">Resolvido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalOpen = centers.reduce((acc, c) => acc + c.openCount, 0);
  const totalOverdue = centers.reduce((acc, c) => acc + c.overdueCount, 0);
  const totalResolved = centers.reduce((acc, c) => acc + c.resolvedCount, 0);
  const filteredFindings = getFilteredFindings();

  const handleCreateFinding = () => {
    setSelectedFinding(null);
    setFindingDialogOpen(true);
  };

  const handleEditFinding = (finding: VisitFinding) => {
    setSelectedFinding(finding);
    setFindingDialogOpen(true);
  };

  const handleDeleteClick = (finding: VisitFinding) => {
    setFindingToDelete(finding);
    setDeleteDialogOpen(true);
  };

  const handleViewHistory = (findingId: string) => {
    setHistoryFindingId(findingId);
    setHistoryDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!findingToDelete) return;
    
    try {
      const { error } = await supabase
        .from("visit_findings")
        .delete()
        .eq("id", findingToDelete.id);
      
      if (error) throw error;
      toast.success("Pendência excluída com sucesso");
      loadData();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setFindingToDelete(null);
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredFindings.map(finding => {
      const isOverdue = finding.due_date && 
        isBefore(parseISO(finding.due_date), new Date()) && 
        finding.status === "open";
      
      const severityLabels: Record<string, string> = {
        critical: "Crítico",
        major: "Maior",
        minor: "Menor"
      };
      
      const statusLabels: Record<string, string> = {
        open: "Aberto",
        closed: "Resolvido"
      };

      return {
        "Centro": finding.is_remote ? "Remoto" : (finding.visit?.research_center?.code || "N/A"),
        "Nome do Centro": finding.is_remote ? "Remoto" : (finding.visit?.research_center?.name || "N/A"),
        "Visita": finding.is_remote ? "Remoto" : (finding.visit?.visit_type || "N/A"),
        "Data da Visita": finding.is_remote ? "-" : (finding.visit?.scheduled_date 
          ? format(parseISO(finding.visit.scheduled_date), "dd/MM/yyyy", { locale: ptBR })
          : "N/A"),
        "Código": finding.participant_code || "-",
        "Tipo": finding.finding_type || "-",
        "Formulário": finding.form_name || "-",
        "Descrição": finding.description,
        "Responsável": finding.responsible_name || "-",
        "Severidade": severityLabels[finding.severity] || finding.severity,
        "Status": statusLabels[finding.status] || finding.status,
        "Prazo": finding.due_date 
          ? format(parseISO(finding.due_date), "dd/MM/yyyy", { locale: ptBR })
          : "-",
        "Conclusão": finding.resolved_at && finding.status === "closed"
          ? format(parseISO(finding.resolved_at), "dd/MM/yyyy", { locale: ptBR })
          : "-",
        "Vencida": isOverdue ? "Sim" : "Não",
        "Resolução": finding.resolution || "-",
        "Criado em": format(parseISO(finding.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
      };
    });

    if (dataToExport.length === 0) {
      toast.error("Nenhuma pendência para exportar");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pendências");

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, 
        ...dataToExport.map(row => String(row[key as keyof typeof row] || "").length)
      ))
    }));
    worksheet["!cols"] = colWidths;

    const fileName = `pendencias_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success("Arquivo exportado com sucesso!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CTMSNav />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestão de Centros</h1>
            <p className="text-muted-foreground mt-1">Visão consolidada de pendências por centro de pesquisa</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFormsDialogOpen(true)} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Formulários
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importar Excel
            </Button>
            <Button onClick={handleCreateFinding} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Pendência
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Centros</p>
                  <p className="text-2xl font-bold">{centers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-yellow-500/10">
                  <Clock className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendências Abertas</p>
                  <p className="text-2xl font-bold">{totalOpen}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vencidas</p>
                  <p className="text-2xl font-bold text-destructive">{totalOverdue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resolvidas</p>
                  <p className="text-2xl font-bold text-green-600">{totalResolved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="centers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="centers" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Por Centro
            </TabsTrigger>
            <TabsTrigger value="findings" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Todas as Pendências
            </TabsTrigger>
          </TabsList>

          <TabsContent value="centers" className="space-y-4">
            {/* Project Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Select 
                    value={selectedProject} 
                    onValueChange={(value) => {
                      setSelectedProject(value);
                      setPersistedProjectId(value !== "all" ? value : null);
                    }}
                  >
                    <SelectTrigger className="w-[300px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filtrar por estudo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os estudos</SelectItem>
                      {uniqueProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    {filteredCenters.length} centro{filteredCenters.length !== 1 ? 's' : ''} encontrado{filteredCenters.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCenters.map((item) => (
                <Card 
                  key={item.center.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedCenterForEdit(item.center);
                    setEditCenterDialogOpen(true);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          {item.center.code}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {item.center.name || "Nome não informado"}
                        </CardDescription>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCenter(item.center.id);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {item.center.project && (
                        <p className="text-sm text-muted-foreground truncate">
                          {item.center.project.title}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">IP:</span>
                        <span className="truncate">{item.center.pi_name || "N/A"}</span>
                      </div>

                      {/* Visit Stats */}
                      {item.center.visitStats && (
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-green-600">{item.center.visitStats.completed} realizadas</span>
                          <span className="text-blue-600">{item.center.visitStats.scheduled} agendadas</span>
                        </div>
                      )}

                      {/* Notes preview */}
                      {item.center.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                          {item.center.notes}
                        </p>
                      )}

                      <div className="flex items-center gap-4 pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">{item.openCount} abertas</span>
                        </div>
                        {item.overdueCount > 0 && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <span className="text-sm font-medium text-destructive">{item.overdueCount} vencidas</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-green-600">{item.resolvedCount}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredCenters.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {selectedProject === "all" ? "Nenhum centro cadastrado" : "Nenhum centro encontrado para este estudo"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="findings" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por descrição..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select 
                    value={selectedCenter} 
                    onValueChange={(value) => {
                      setSelectedCenter(value);
                      setPersistedCenterId(value !== "all" ? value : null);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <Building2 className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Centro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os centros</SelectItem>
                      {centers.map((item) => (
                        <SelectItem key={item.center.id} value={item.center.id}>
                          {item.center.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="closed">Resolvido</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-[150px]">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Severidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="critical">Crítico</SelectItem>
                      <SelectItem value="major">Maior</SelectItem>
                      <SelectItem value="minor">Menor</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Prazo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="overdue">Vencidas</SelectItem>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="this_week">Esta semana</SelectItem>
                      <SelectItem value="no_date">Sem prazo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Findings Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Pendências ({filteredFindings.length})
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportToExcel}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Centro</TableHead>
                      <TableHead>Visita</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="min-w-[250px]">Descrição</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Conclusão</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFindings.map((finding) => {
                      const isOverdue = finding.due_date && 
                        isBefore(parseISO(finding.due_date), new Date()) && 
                        finding.status === "open";
                      
                      return (
                        <TableRow key={finding.id} className={isOverdue ? "bg-destructive/5" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {finding.is_remote ? "Remoto" : (finding.visit?.research_center?.code || "N/A")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {finding.is_remote ? "Remoto" : (finding.visit?.visit_type || "N/A")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">{finding.participant_code || "-"}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{finding.finding_type || "NA"}</Badge>
                          </TableCell>
                          <TableCell>
                            <p className="line-clamp-2">{finding.description}</p>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{finding.responsible_name || "-"}</span>
                          </TableCell>
                          <TableCell>{getSeverityBadge(finding.severity)}</TableCell>
                          <TableCell>{getStatusBadge(finding.status)}</TableCell>
                          <TableCell>
                            {finding.due_date ? (
                              <span className={isOverdue ? "text-destructive font-medium" : ""}>
                                {format(parseISO(finding.due_date), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {finding.resolved_at && finding.status === "closed" ? (
                              <span className="text-green-600">
                                {format(parseISO(finding.resolved_at), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewHistory(finding.id)}
                                title="Ver histórico"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditFinding(finding)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(finding)}
                                className="text-destructive hover:text-destructive"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredFindings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhuma pendência encontrada com os filtros aplicados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Finding Dialog */}
        <FindingDialog
          open={findingDialogOpen}
          onOpenChange={setFindingDialogOpen}
          finding={selectedFinding}
          onSuccess={loadData}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta pendência? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* History Dialog */}
        <FindingHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          findingId={historyFindingId}
        />

        {/* Import Dialog */}
        <ImportFindingsDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onSuccess={loadData}
        />

        {/* Study Forms Dialog */}
        <StudyFormsDialog
          open={formsDialogOpen}
          onOpenChange={setFormsDialogOpen}
        />

        {/* Edit Center Dialog */}
        <EditCenterDialog
          open={editCenterDialogOpen}
          onOpenChange={setEditCenterDialogOpen}
          center={selectedCenterForEdit}
          onSuccess={loadData}
        />
      </main>
    </div>
  );
};

export default CenterManagement;
