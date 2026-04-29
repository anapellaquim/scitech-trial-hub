import { parseLocalDate, formatDateOnly, todayDateOnly } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import CTMSNav from "@/components/CTMSNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, FileText, Clock, AlertTriangle, CheckCircle, Calendar } from "lucide-react";
import { format, differenceInDays, isPast, isWithinInterval, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import NewSubmissionDialog from "@/components/regulatory/NewSubmissionDialog";
import NewReportDialog from "@/components/regulatory/NewReportDialog";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";

import EditSubmissionDialog from "@/components/regulatory/EditSubmissionDialog";
import EditReportDialog from "@/components/regulatory/EditReportDialog";
import ReportSchedulesManager from "@/components/regulatory/ReportSchedulesManager";

interface Project {
  id: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
}

interface Site { id: string; site_code: string; name: string; project_id: string; }

interface Submission {
  id: string;
  project_id: string | null;
  site_id: string | null;
  submission_type: string;
  planned_date: string | null;
  submission_date: string | null;
  status: string;
  notes: string | null;
  compliance_response: string | null;
  project?: Project;
  site?: Site;
}

interface Report {
  id: string;
  project_id: string | null;
  submission_id: string | null;
  report_type: string;
  due_date: string;
  submitted_date: string | null;
  status: string;
  notes: string | null;
  project?: Project;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  submitted: "bg-blue-100 text-blue-800 border-blue-200",
  under_review: "bg-purple-100 text-purple-800 border-purple-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  revision_required: "bg-orange-100 text-orange-800 border-orange-200",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  submitted: "Submetido",
  under_review: "Em Análise",
  approved: "Aprovado",
  rejected: "Rejeitado",
  revision_required: "Revisão Necessária",
};

export default function Regulatory() {
  const navigate = useNavigate();
  const { projectId: persistedProjectId, setProjectId: setPersistedProjectId } = usePersistedFilters();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [showNewSubmission, setShowNewSubmission] = useState(false);
  const [showNewReport, setShowNewReport] = useState(false);
  
  const [showEditSubmission, setShowEditSubmission] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showEditReport, setShowEditReport] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectsRes, sitesRes, submissionsRes, reportsRes] = await Promise.all([
        supabase.from("projects").select("id, title, start_date, end_date").order("title"),
        supabase.from("study_sites").select("id, site_code, name, project_id").order("site_code"),
        supabase.from("regulatory_submissions").select("*").order("planned_date", { ascending: true }),
        supabase.from("regulatory_reports").select("*").order("due_date", { ascending: true }),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (sitesRes.error) throw sitesRes.error;
      if (submissionsRes.error) throw submissionsRes.error;
      if (reportsRes.error) throw reportsRes.error;

      const projectsData = projectsRes.data || [];
      setProjects(projectsData);
      const sitesData = sitesRes.data || [];
      setSites(sitesData);

      // Set default project filter if persisted
      if (persistedProjectId && projectsData.some(p => p.id === persistedProjectId) && projectFilter === "all") {
        setProjectFilter(persistedProjectId);
      }

      // Map projects/sites to submissions and reports
      const projectMap = new Map(projectsData.map(p => [p.id, p]));
      const siteMap = new Map(sitesData.map(s => [s.id, s]));

      setSubmissions(((submissionsRes.data as any) || []).map((s: any) => ({
        ...s,
        project: s.project_id ? projectMap.get(s.project_id) : undefined,
        site: s.site_id ? siteMap.get(s.site_id) : undefined,
      })));

      setReports((reportsRes.data || []).map(r => ({
        ...r,
        project: r.project_id ? projectMap.get(r.project_id) : undefined
      })));
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDeadlineStatus = (date: string | null) => {
    if (!date) return null;
    const dueDate = parseLocalDate(date);
    const today = new Date();
    const daysUntil = differenceInDays(dueDate, today);

    if (isPast(dueDate)) {
      return { color: "text-red-600", icon: AlertTriangle, label: "Atrasado" };
    }
    if (daysUntil <= 7) {
      return { color: "text-orange-600", icon: Clock, label: `${daysUntil} dias` };
    }
    if (daysUntil <= 30) {
      return { color: "text-yellow-600", icon: Calendar, label: `${daysUntil} dias` };
    }
    return { color: "text-green-600", icon: CheckCircle, label: `${daysUntil} dias` };
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = sub.submission_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.project?.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    const matchesProject = projectFilter === "all" || sub.project_id === projectFilter;
    const matchesSite = siteFilter === "all" || sub.site_id === siteFilter;
    return matchesSearch && matchesStatus && matchesProject && matchesSite;
  });

  const filteredReports = reports.filter(rep => {
    const matchesSearch = rep.report_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.project?.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || rep.status === statusFilter;
    const matchesProject = projectFilter === "all" || rep.project_id === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  // Stats
  const pendingSubmissions = submissions.filter(s => s.status === "pending").length;
  const overdueReports = reports.filter(r => r.status === "pending" && r.due_date && isPast(parseLocalDate(r.due_date))).length;
  const approvedSubmissions = submissions.filter(s => s.status === "approved").length;
  const upcomingDeadlines = reports.filter(r => {
    if (!r.due_date || r.status !== "pending") return false;
    const dueDate = parseLocalDate(r.due_date);
    return isWithinInterval(dueDate, { start: new Date(), end: addDays(new Date(), 30) });
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CTMSNav />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Regulatório</h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe prazos e fluxos regulatórios dos estudos
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button variant="outline" onClick={() => setShowNewReport(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Relatório
            </Button>
            <Button onClick={() => setShowNewSubmission(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Submissão
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Submissões Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingSubmissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Relatórios Atrasados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueReports}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovações</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedSubmissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prazos em 30 dias</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{upcomingDeadlines}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por tipo ou estudo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select 
            value={projectFilter} 
            onValueChange={(value) => {
              setProjectFilter(value);
              if (value !== "all") {
                setPersistedProjectId(value);
              }
            }}
          >
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder="Filtrar por estudo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estudos</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={siteFilter} onValueChange={setSiteFilter} disabled={projectFilter === "all"}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={projectFilter === "all" ? "Selecione um estudo" : "Filtrar por centro"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os centros</SelectItem>
              {sites.filter(s => s.project_id === projectFilter).map(s => (
                <SelectItem key={s.id} value={s.id}>{s.site_code} · {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs for Submissions and Reports */}
        <Tabs defaultValue="submissions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="submissions">Submissões ({filteredSubmissions.length})</TabsTrigger>
            <TabsTrigger value="reports">Relatórios ({filteredReports.length})</TabsTrigger>
            <TabsTrigger value="schedule">Cronograma</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <ReportSchedulesManager projects={projects} />
          </TabsContent>

          <TabsContent value="submissions">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estudo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Centro</TableHead>
                      <TableHead>Data Planejada</TableHead>
                      <TableHead>Data Submissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prazo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhuma submissão encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubmissions.map((sub) => {
                        const deadlineStatus = getDeadlineStatus(sub.planned_date);
                        return (
                          <TableRow 
                            key={sub.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedSubmission(sub);
                              setShowEditSubmission(true);
                            }}
                          >
                            <TableCell>
                              <div>
                                <div className="font-medium">{sub.project?.title || "-"}</div>
                              </div>
                            </TableCell>
                            <TableCell>{sub.submission_type}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {sub.site ? `${sub.site.site_code} · ${sub.site.name}` : "—"}
                            </TableCell>
                            <TableCell>
                              {sub.planned_date ? format(parseLocalDate(sub.planned_date), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                            </TableCell>
                            <TableCell>
                              {sub.submission_date ? format(parseLocalDate(sub.submission_date), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[sub.status]}>
                                {statusLabels[sub.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {deadlineStatus && sub.status === "pending" && (
                                <div className={`flex items-center gap-1 ${deadlineStatus.color}`}>
                                  <deadlineStatus.icon className="h-4 w-4" />
                                  <span className="text-sm">{deadlineStatus.label}</span>
                                </div>
                              )}
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

          <TabsContent value="reports">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estudo</TableHead>
                      <TableHead>Tipo de Relatório</TableHead>
                      <TableHead>Data Limite</TableHead>
                      <TableHead>Data Envio</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prazo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum relatório encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReports.map((rep) => {
                        const deadlineStatus = getDeadlineStatus(rep.due_date);
                        return (
                          <TableRow 
                            key={rep.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedReport(rep);
                              setShowEditReport(true);
                            }}
                          >
                            <TableCell>
                              <div>
                                <div className="font-medium">{rep.project?.title || "-"}</div>
                              </div>
                            </TableCell>
                            <TableCell>{rep.report_type}</TableCell>
                            <TableCell>
                              {format(parseLocalDate(rep.due_date), "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {rep.submitted_date ? format(parseLocalDate(rep.submitted_date), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[rep.status]}>
                                {statusLabels[rep.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {deadlineStatus && rep.status === "pending" && (
                                <div className={`flex items-center gap-1 ${deadlineStatus.color}`}>
                                  <deadlineStatus.icon className="h-4 w-4" />
                                  <span className="text-sm">{deadlineStatus.label}</span>
                                </div>
                              )}
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

        {/* Dialogs */}
        <NewSubmissionDialog
          open={showNewSubmission}
          onOpenChange={setShowNewSubmission}
          projects={projects}
          onSuccess={fetchData}
        />
        <NewReportDialog
          open={showNewReport}
          onOpenChange={setShowNewReport}
          projects={projects}
          onSuccess={fetchData}
        />
        <EditSubmissionDialog
          open={showEditSubmission}
          onOpenChange={setShowEditSubmission}
          submission={selectedSubmission}
          projects={projects}
          onSuccess={fetchData}
        />
        <EditReportDialog
          open={showEditReport}
          onOpenChange={setShowEditReport}
          report={selectedReport}
          projects={projects}
          onSuccess={fetchData}
        />
      </main>
    </div>
  );
}
