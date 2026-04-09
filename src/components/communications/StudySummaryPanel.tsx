import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  FileText, 
  DollarSign,
  TrendingUp
} from 'lucide-react';

interface StudySummaryPanelProps {
  projectId: string;
}

interface StudySummary {
  projectName: string;
  protocolNumber: string;
  alerts: {
    tasks: number;
    visits: number;
    findings: number;
    regulatory: number;
    payments: number;
  };
  total: number;
  critical: number;
  resolved: number;
}

export function StudySummaryPanel({ projectId }: StudySummaryPanelProps) {
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        // Fetch project info
        const { data: project } = await supabase
          .from('projects')
          .select('title')
          .eq('id', projectId)
          .single();

        // Fetch notifications for this project
        const { data: notifications } = await supabase
          .from('notifications')
          .select('type, severity, dismissed')
          .eq('project_id', projectId);

        const proj = project as { title: string } | null;
        if (proj && notifications) {
          const notifs = notifications as Array<{ type: string; severity: string; dismissed: boolean }>;
          const alerts = {
            tasks: notifs.filter(n => n.type.startsWith('task_')).length,
            visits: notifs.filter(n => n.type.startsWith('visit_')).length,
            findings: notifs.filter(n => n.type.startsWith('finding_')).length,
            regulatory: notifs.filter(n => n.type.startsWith('regulatory_')).length,
            payments: notifs.filter(n => n.type.startsWith('payment_')).length,
          };

          setSummary({
            projectName: proj.title,
            protocolNumber: '',
            alerts,
            total: notifs.filter(n => !n.dismissed).length,
            critical: notifs.filter(n => n.severity === 'critical' && !n.dismissed).length,
            resolved: notifs.filter(n => n.dismissed).length
          });
        }
      } catch (error) {
        console.error('Error fetching study summary:', error);
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      fetchSummary();
    }
  }, [projectId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const categories = [
    { key: 'tasks', label: 'Tarefas', icon: CheckSquare, color: 'text-blue-500' },
    { key: 'visits', label: 'Visitas', icon: Clock, color: 'text-green-500' },
    { key: 'findings', label: 'Achados', icon: AlertTriangle, color: 'text-yellow-500' },
    { key: 'regulatory', label: 'Regulatório', icon: FileText, color: 'text-purple-500' },
    { key: 'payments', label: 'Pagamentos', icon: DollarSign, color: 'text-orange-500' },
  ];

  const maxAlerts = Math.max(...Object.values(summary.alerts), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{summary.protocolNumber || summary.projectName}</CardTitle>
            <p className="text-sm text-muted-foreground">{summary.projectName}</p>
          </div>
          <div className="flex items-center gap-2">
            {summary.critical > 0 && (
              <Badge variant="destructive">
                {summary.critical} crítico{summary.critical > 1 ? 's' : ''}
              </Badge>
            )}
            <Badge variant="outline">
              {summary.total} pendente{summary.total > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{summary.total}</p>
            <p className="text-xs text-muted-foreground">Alertas Ativos</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{summary.resolved}</p>
            <p className="text-xs text-muted-foreground">Resolvidos</p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Distribuição por Categoria
          </h4>
          {categories.map(({ key, label, icon: Icon, color }) => {
            const count = summary.alerts[key as keyof typeof summary.alerts];
            const percentage = (count / maxAlerts) * 100;
            
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color}`} />
                    {label}
                  </span>
                  <span className="font-medium">{count}</span>
                </div>
                <Progress value={percentage} className="h-1.5" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
