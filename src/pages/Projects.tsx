import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CTMSNav from "@/components/CTMSNav";
import NewProjectDialog from "@/components/NewProjectDialog";
import EditProjectDialog from "@/components/EditProjectDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Calendar, Users, DollarSign, CheckSquare, TrendingUp, TrendingDown, LayoutGrid, List, X, ArrowUpDown, ArrowUp, ArrowDown, Download, ChevronLeft, ChevronRight, GanttChart, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  sponsor: string | null;
  principal_investigator: string | null;
  start_date: string | null;
  end_date: string | null;
  target_enrollment: number | null;
  current_enrollment: number | null;
  budget: number | null;
  cost_center: string | null;
  value_class: string | null;
}

interface YearlyBudget {
  year: number;
  planned_amount: number;
}

interface ResearchCenterInfo {
  id: string;
  code: string;
  name: string | null;
  pi_name: string | null;
  coordinator_name: string | null;
}

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [yearlyBudgets, setYearlyBudgets] = useState<Record<string, YearlyBudget[]>>({});
  const [executedBudgets, setExecutedBudgets] = useState<Record<string, number>>({});
  const [centersByProject, setCentersByProject] = useState<Record<string, ResearchCenterInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Filters
  const [filterTitle, setFilterTitle] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Sorting
  type SortColumn = 'title' | 'status' | 'recruitment' | 'planned' | 'executed' | 'sponsor' | 'start_date';
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    checkAuth();
    loadProjects();
    loadTaskCounts();
    loadParticipantCounts();
    loadResearchCenters();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
      
      // Load yearly budgets and executed budgets for all projects
      if (data && data.length > 0) {
        await loadYearlyBudgets(data.map(p => p.id));
        await loadExecutedBudgets(data.map(p => p.id));
      }
    } catch (error) {
      console.error("Error loading studies:", error);
      toast.error("Erro ao carregar estudos");
    } finally {
      setLoading(false);
    }
  };

  const loadYearlyBudgets = async (projectIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("project_yearly_budgets")
        .select("*")
        .in("project_id", projectIds)
        .order("year", { ascending: true });

      if (error) throw error;

      const budgetsByProject: Record<string, YearlyBudget[]> = {};
      data?.forEach((budget) => {
        if (!budgetsByProject[budget.project_id]) {
          budgetsByProject[budget.project_id] = [];
        }
        budgetsByProject[budget.project_id].push({
          year: budget.year,
          planned_amount: Number(budget.planned_amount),
        });
      });
      setYearlyBudgets(budgetsByProject);
    } catch (error) {
      console.error("Error loading yearly budgets:", error);
    }
  };

  const loadExecutedBudgets = async (projectIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("vendor_payments")
        .select("project_id, amount, status")
        .in("project_id", projectIds)
        .eq("status", "pago");

      if (error) throw error;

      const executedByProject: Record<string, number> = {};
      data?.forEach((payment) => {
        executedByProject[payment.project_id] = (executedByProject[payment.project_id] || 0) + Number(payment.amount);
      });
      setExecutedBudgets(executedByProject);
    } catch (error) {
      console.error("Error loading executed budgets:", error);
    }
  };

  const loadTaskCounts = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("project_id");

      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((task) => {
        if (task.project_id) {
          counts[task.project_id] = (counts[task.project_id] || 0) + 1;
        }
      });
      setTaskCounts(counts);
    } catch (error) {
      console.error("Error loading task counts:", error);
    }
  };

  const loadParticipantCounts = async () => {
    try {
      const { data, error } = await supabase
        .from("participants")
        .select("project_id, status");

      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((participant) => {
        if (participant.project_id) {
          counts[participant.project_id] = (counts[participant.project_id] || 0) + 1;
        }
      });
      setParticipantCounts(counts);
    } catch (error) {
      console.error("Error loading participant counts:", error);
    }
  };

  const loadResearchCenters = async () => {
    try {
      const { data, error } = await supabase
        .from("research_centers")
        .select("id, code, name, pi_name, coordinator_name, project_id")
        .order("code");

      if (error) throw error;
      
      const centersByProj: Record<string, ResearchCenterInfo[]> = {};
      data?.forEach((center) => {
        if (center.project_id) {
          if (!centersByProj[center.project_id]) {
            centersByProj[center.project_id] = [];
          }
          centersByProj[center.project_id].push(center);
        }
      });
      setCentersByProject(centersByProj);
    } catch (error) {
      console.error("Error loading research centers:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      planning: { label: "Planejamento", variant: "outline" },
      active: { label: "Ativo", variant: "default" },
      on_hold: { label: "Em Pausa", variant: "secondary" },
      completed: { label: "Concluído", variant: "default" },
    };
    return config[status] || config.planning;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getTotalPlannedBudget = (projectId: string) => {
    const budgets = yearlyBudgets[projectId] || [];
    return budgets.reduce((sum, b) => sum + b.planned_amount, 0);
  };

  // Filtered projects
  const filteredProjects = projects.filter(project => {
    const matchesTitle = filterTitle === '' || project.title.toLowerCase().includes(filterTitle.toLowerCase());
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    return matchesTitle && matchesStatus;
  });

  // Sorted and filtered projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let comparison = 0;
    switch (sortColumn) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'recruitment':
        const recruitA = a.target_enrollment ? (participantCounts[a.id] || 0) / a.target_enrollment : 0;
        const recruitB = b.target_enrollment ? (participantCounts[b.id] || 0) / b.target_enrollment : 0;
        comparison = recruitA - recruitB;
        break;
      case 'planned':
        comparison = getTotalPlannedBudget(a.id) - getTotalPlannedBudget(b.id);
        break;
      case 'executed':
        comparison = (executedBudgets[a.id] || 0) - (executedBudgets[b.id] || 0);
        break;
      case 'sponsor':
        comparison = (a.sponsor || '').localeCompare(b.sponsor || '');
        break;
      case 'start_date':
        comparison = (a.start_date || '').localeCompare(b.start_date || '');
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const clearFilters = () => {
    setFilterTitle('');
    setFilterStatus('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = filterTitle !== '' || filterStatus !== 'all';

  // Pagination calculations
  const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = sortedProjects.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTitle, filterStatus, sortColumn, sortDirection]);

  const exportToCSV = () => {
    const headers = [
      'Título',
      'Status',
      'Patrocinador',
      'Investigador Principal',
      'Data Início',
      'Data Fim',
      'Meta Recrutamento',
      'Recrutados',
      'Orçamento Previsto',
      'Orçamento Realizado',
      'Centro de Custo',
      'Classe de Valor'
    ];

    const statusLabels: Record<string, string> = {
      planning: 'Planejamento',
      active: 'Ativo',
      on_hold: 'Em Pausa',
      completed: 'Concluído'
    };

    const rows = sortedProjects.map(project => [
      project.title,
      statusLabels[project.status] || project.status,
      project.sponsor || '',
      project.principal_investigator || '',
      project.start_date || '',
      project.end_date || '',
      project.target_enrollment?.toString() || '0',
      (participantCounts[project.id] || 0).toString(),
      getTotalPlannedBudget(project.id).toFixed(2),
      (executedBudgets[project.id] || 0).toFixed(2),
      project.cost_center || '',
      project.value_class || ''
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `projetos_${todayDateOnly()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Arquivo CSV exportado com sucesso!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CTMSNav />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-pulse text-muted-foreground">Carregando estudos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      
      <TooltipProvider>
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Estudos Clínicos</h2>
            <p className="text-muted-foreground">Gerencie todos os estudos clínicos da Scitech</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={sortedProjects.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar CSV
            </Button>
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <NewProjectDialog onProjectCreated={loadProjects} />
          </div>
        </div>

        {projects.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nenhum estudo ainda</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-sm">
                Comece criando seu primeiro estudo clínico para gerenciar atividades e processos.
              </p>
              <NewProjectDialog onProjectCreated={loadProjects} />
            </CardContent>
          </Card>
        ) : viewMode === 'cards' ? (
          <>
            {/* Filters for cards view */}
            <div className="mb-6 flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Título</label>
                <Input
                  placeholder="Filtrar por título..."
                  value={filterTitle}
                  onChange={(e) => setFilterTitle(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="w-[150px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="planning">Planejamento</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="on_hold">Em Pausa</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            {filteredProjects.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <p className="text-muted-foreground">Nenhum projeto encontrado com os filtros aplicados</p>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-4">
                    <X className="h-4 w-4 mr-1" />
                    Limpar filtros
                  </Button>
                </CardContent>
              </Card>
            ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => {
              const totalPlanned = getTotalPlannedBudget(project.id);
              const totalExecuted = executedBudgets[project.id] || 0;
              const projectYearlyBudgets = yearlyBudgets[project.id] || [];
              const budgetDiff = totalPlanned - totalExecuted;
              
              return (
                <Card 
                  key={project.id} 
                  className="shadow-card hover:shadow-elevated transition-smooth cursor-pointer"
                  onClick={() => {
                    setSelectedProject(project);
                    setEditDialogOpen(true);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-1">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <Badge variant={getStatusBadge(project.status).variant}>
                        {getStatusBadge(project.status).label}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2 mb-3">
                      {project.description || "Sem descrição"}
                    </CardDescription>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/projects/${project.id}/schedule`);
                            }}
                          >
                            <GanttChart className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Cronograma</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver cronograma do projeto com Gantt, dependências e matriz RACI</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(project.start_date)} - {formatDate(project.end_date)}</span>
                    </div>
                    
                    {/* Recruitment Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>Recrutamento</span>
                        </div>
                        <span className="font-medium">
                          {participantCounts[project.id] || 0} / {project.target_enrollment || 0}
                        </span>
                      </div>
                      <Progress 
                        value={project.target_enrollment 
                          ? Math.min(((participantCounts[project.id] || 0) / project.target_enrollment) * 100, 100)
                          : 0
                        } 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {project.target_enrollment 
                          ? `${Math.round(((participantCounts[project.id] || 0) / project.target_enrollment) * 100)}% concluído`
                          : "Meta não definida"
                        }
                      </p>
                    </div>

                    {/* Budget Section */}
                    <div className="pt-3 border-t space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Orçamento</p>
                      
                      {/* Yearly Budgets */}
                      {projectYearlyBudgets.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Previsto por ano:</p>
                          <div className="flex flex-wrap gap-2">
                            {projectYearlyBudgets.map((yb) => (
                              <span key={yb.year} className="text-xs bg-muted px-2 py-1 rounded">
                                {yb.year}: {formatCurrency(yb.planned_amount)}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">Total Previsto: {formatCurrency(totalPlanned)}</span>
                          </div>
                        </div>
                      ) : project.budget ? (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-blue-500" />
                          <span>Previsto: {formatCurrency(project.budget)}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Nenhum orçamento previsto</p>
                      )}

                      {/* Executed Budget */}
                      <div className="flex items-center gap-2 text-sm">
                        {budgetDiff >= 0 ? (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        )}
                        <span className={totalExecuted > 0 ? "font-medium" : ""}>
                          Realizado: {formatCurrency(totalExecuted)}
                        </span>
                      </div>

                      {/* Budget Difference */}
                      {(totalPlanned > 0 || project.budget) && (
                        <div className="text-xs">
                          <span className={budgetDiff >= 0 ? "text-green-600" : "text-red-600"}>
                            {budgetDiff >= 0 ? "Dentro do orçamento" : `Acima do orçamento: ${formatCurrency(Math.abs(budgetDiff))}`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Patrocinador</p>
                      <p className="text-sm font-medium">{project.sponsor || "-"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Investigador Principal</p>
                      <p className="text-sm font-medium">{project.principal_investigator || "-"}</p>
                    </div>

                    {/* Research Centers Section */}
                    {centersByProject[project.id] && centersByProject[project.id].length > 0 && (
                      <div className="pt-3 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <p className="text-xs font-medium text-muted-foreground">
                            Centros ({centersByProject[project.id].length})
                          </p>
                        </div>
                        <div className="space-y-1.5 max-h-24 overflow-y-auto">
                          {centersByProject[project.id].slice(0, 3).map((center) => (
                            <div key={center.id} className="text-xs bg-muted/50 rounded px-2 py-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{center.code}</span>
                                {center.name && (
                                  <span className="text-muted-foreground truncate ml-2 max-w-[120px]">
                                    {center.name}
                                  </span>
                                )}
                              </div>
                              {center.pi_name && (
                                <p className="text-muted-foreground mt-0.5">
                                  IP: {center.pi_name}
                                </p>
                              )}
                            </div>
                          ))}
                          {centersByProject[project.id].length > 3 && (
                            <p className="text-xs text-muted-foreground text-center">
                              +{centersByProject[project.id].length - 3} outros centros
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                      <CheckSquare className="h-4 w-4" />
                      <span>{taskCounts[project.id] || 0} tarefa(s)</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
            )}
          </>
        ) : (
          <Card>
            {/* Filters */}
            <div className="p-4 border-b flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Título</label>
                <Input
                  placeholder="Filtrar por título..."
                  value={filterTitle}
                  onChange={(e) => setFilterTitle(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="w-[150px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="planning">Planejamento</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="on_hold">Em Pausa</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Título
                      <SortIcon column="title" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      <SortIcon column="status" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('recruitment')}
                  >
                    <div className="flex items-center">
                      Recrutamento
                      <SortIcon column="recruitment" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('planned')}
                  >
                    <div className="flex items-center">
                      Orç. Previsto
                      <SortIcon column="planned" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('executed')}
                  >
                    <div className="flex items-center">
                      Realizado
                      <SortIcon column="executed" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('sponsor')}
                  >
                    <div className="flex items-center">
                      Patrocinador
                      <SortIcon column="sponsor" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('start_date')}
                  >
                    <div className="flex items-center">
                      Período
                      <SortIcon column="start_date" />
                    </div>
                  </TableHead>
                  <TableHead>Cronograma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum projeto encontrado com os filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : paginatedProjects.map((project) => {
                  const totalPlanned = getTotalPlannedBudget(project.id);
                  const totalExecuted = executedBudgets[project.id] || 0;
                  const recruitmentPercent = project.target_enrollment 
                    ? Math.round(((participantCounts[project.id] || 0) / project.target_enrollment) * 100)
                    : 0;
                  
                  return (
                    <TableRow 
                      key={project.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedProject(project);
                        setEditDialogOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">{project.title}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(project.status).variant}>
                          {getStatusBadge(project.status).label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={recruitmentPercent} className="h-2 w-16" />
                          <span className="text-sm text-muted-foreground">
                            {participantCounts[project.id] || 0}/{project.target_enrollment || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{totalPlanned > 0 ? formatCurrency(totalPlanned) : "-"}</TableCell>
                      <TableCell>{formatCurrency(totalExecuted)}</TableCell>
                      <TableCell>{project.sponsor || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(project.start_date)} - {formatDate(project.end_date)}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/projects/${project.id}/schedule`);
                              }}
                            >
                              <GanttChart className="h-4 w-4" />
                              <span className="text-xs font-medium">Cronograma</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Ver cronograma do projeto com Gantt, dependências e matriz RACI</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {/* Pagination Controls */}
            {sortedProjects.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Itens por página:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="ml-4">
                    {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedProjects.length)} de {sortedProjects.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    Início
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Fim
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        <EditProjectDialog
          project={selectedProject}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onProjectUpdated={loadProjects}
        />
      </main>
      </TooltipProvider>
    </div>
  );
};

export default Projects;