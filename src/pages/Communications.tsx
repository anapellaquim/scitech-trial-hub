import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CTMSNav from '@/components/CTMSNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Inbox,
  Building2,
  Layers
} from 'lucide-react';
import { useNotifications, useNotificationStats } from '@/hooks/useNotifications';
import { AlertCard } from '@/components/communications/AlertCard';
import { AlertFilters } from '@/components/communications/AlertFilters';
import { StudySummaryPanel } from '@/components/communications/StudySummaryPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Communications() {
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { 
    notifications, 
    loading, 
    unreadCount, 
    criticalCount,
    markAsRead, 
    markAllAsRead,
    dismiss,
    dismissMultiple,
    refresh 
  } = useNotifications({
    projectId: selectedProject !== 'all' ? selectedProject : undefined,
    type: selectedType !== 'all' ? selectedType : undefined,
    severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
    onlyUnread
  });

  const { stats } = useNotificationStats();

  // Group notifications by project
  const notificationsByProject = useMemo(() => {
    const grouped: Record<string, typeof notifications> = {};
    notifications.forEach(n => {
      const key = n.project_id || 'global';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(n);
    });
    return grouped;
  }, [notifications]);

  // Group notifications by module
  const notificationsByModule = useMemo(() => {
    const grouped: Record<string, typeof notifications> = {};
    const moduleMap: Record<string, string> = {
      task_: 'Tarefas',
      visit_: 'Visitas',
      finding_: 'Achados',
      regulatory_: 'Regulatório',
      payment_: 'Pagamentos',
      document_: 'eTMF',
      participant_: 'Participantes'
    };

    notifications.forEach(n => {
      const prefix = Object.keys(moduleMap).find(p => n.type.startsWith(p));
      const module = prefix ? moduleMap[prefix] : 'Outros';
      if (!grouped[module]) grouped[module] = [];
      grouped[module].push(n);
    });
    return grouped;
  }, [notifications]);

  const criticalNotifications = useMemo(() => 
    notifications.filter(n => n.severity === 'critical'),
    [notifications]
  );

  const handleNavigate = (entityType: string, entityId: string) => {
    const routes: Record<string, string> = {
      task: '/tasks',
      study_task: '/tasks',
      visit: '/visits',
      finding: '/visits',
      submission: '/regulatory',
      report: '/regulatory',
      payment: '/payments',
      document: '/etmf'
    };
    
    const route = routes[entityType];
    if (route) {
      navigate(`${route}/${entityId}`);
    }
  };

  const handleGenerateAlerts = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('generate-alerts');
      if (error) throw error;
      
      toast.success('Alertas gerados com sucesso!');
      refresh();
    } catch (error) {
      console.error('Error generating alerts:', error);
      toast.error('Erro ao gerar alertas');
    } finally {
      setGenerating(false);
    }
  };

  const clearFilters = () => {
    setSelectedProject('all');
    setSelectedType('all');
    setSelectedSeverity('all');
    setOnlyUnread(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Central de Comunicação
            </h1>
            <p className="text-muted-foreground">
              Alertas e notificações integradas de todos os módulos
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleGenerateAlerts}
              disabled={generating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Gerando...' : 'Atualizar Alertas'}
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total de Alertas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Inbox className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.unread}</p>
                  <p className="text-xs text-muted-foreground">Não Lidos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                  <p className="text-xs text-muted-foreground">Críticos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Object.keys(stats.byProject).length}</p>
                  <p className="text-xs text-muted-foreground">Estudos com Alertas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <AlertFilters
          selectedProject={selectedProject}
          selectedType={selectedType}
          selectedSeverity={selectedSeverity}
          onlyUnread={onlyUnread}
          onProjectChange={setSelectedProject}
          onTypeChange={setSelectedType}
          onSeverityChange={setSelectedSeverity}
          onUnreadChange={setOnlyUnread}
          onClearFilters={clearFilters}
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Notifications List */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="flex items-center gap-1">
                  <Inbox className="h-4 w-4" />
                  Todos
                  {notifications.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {notifications.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="by-project" className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  Por Estudo
                </TabsTrigger>
                <TabsTrigger value="by-module" className="flex items-center gap-1">
                  <Layers className="h-4 w-4" />
                  Por Módulo
                </TabsTrigger>
                <TabsTrigger value="critical" className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Críticos
                  {criticalNotifications.length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                      {criticalNotifications.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-4 h-24" />
                        </Card>
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                        <h3 className="font-medium">Nenhum alerta pendente</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Todas as pendências estão em dia!
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map(notification => (
                        <AlertCard
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={markAsRead}
                          onDismiss={dismiss}
                          onNavigate={handleNavigate}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="by-project" className="mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  {Object.entries(notificationsByProject).map(([projectId, items]) => (
                    <div key={projectId} className="mb-6">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {items[0]?.project?.title || 'Alertas Globais'}
                        <Badge variant="outline">{items.length}</Badge>
                      </h3>
                      <div className="space-y-3">
                        {items.map(notification => (
                          <AlertCard
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={markAsRead}
                            onDismiss={dismiss}
                            onNavigate={handleNavigate}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="by-module" className="mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  {Object.entries(notificationsByModule).map(([module, items]) => (
                    <div key={module} className="mb-6">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        {module}
                        <Badge variant="outline">{items.length}</Badge>
                      </h3>
                      <div className="space-y-3">
                        {items.map(notification => (
                          <AlertCard
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={markAsRead}
                            onDismiss={dismiss}
                            onNavigate={handleNavigate}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="critical" className="mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  {criticalNotifications.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                        <h3 className="font-medium">Nenhum alerta crítico</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Não há alertas críticos no momento
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {criticalNotifications.map(notification => (
                        <AlertCard
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={markAsRead}
                          onDismiss={dismiss}
                          onNavigate={handleNavigate}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {selectedProject !== 'all' ? (
              <StudySummaryPanel projectId={selectedProject} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo por Estudo</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.entries(stats.byProject).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum estudo com alertas
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(stats.byProject)
                        .sort((a, b) => b[1].count - a[1].count)
                        .slice(0, 5)
                        .map(([projectId, { name, count }]) => (
                          <button
                            key={projectId}
                            onClick={() => setSelectedProject(projectId)}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                          >
                            <span className="text-sm font-medium truncate">{name}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </button>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Stats by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Por Tipo de Alerta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.byType)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([type, count]) => {
                      const typeLabels: Record<string, string> = {
                        task_overdue: 'Tarefas atrasadas',
                        task_due_today: 'Tarefas para hoje',
                        task_due_soon: 'Tarefas próximas',
                        visit_overdue: 'Visitas atrasadas',
                        visit_today: 'Visitas hoje',
                        visit_upcoming: 'Visitas próximas',
                        finding_critical: 'Achados críticos',
                        finding_overdue: 'Achados vencidos',
                        regulatory_pending: 'Regulatório pendente',
                        payment_overdue: 'Pagamentos atrasados',
                      };
                      
                      return (
                        <div
                          key={type}
                          className="flex items-center justify-between py-1"
                        >
                          <span className="text-sm text-muted-foreground">
                            {typeLabels[type] || type}
                          </span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
