import { parseLocalDate, formatDateOnly, todayDateOnly } from "@/lib/dateUtils";
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  FileText, 
  DollarSign, 
  FolderArchive,
  Users,
  Bell,
  ExternalLink,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Notification } from '@/hooks/useNotifications';

interface AlertCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigate?: (entityType: string, entityId: string) => void;
}

const typeConfig: Record<string, { icon: React.ElementType; label: string; module: string }> = {
  task_overdue: { icon: CheckSquare, label: 'Tarefa atrasada', module: 'Tarefas' },
  task_due_today: { icon: CheckSquare, label: 'Tarefa para hoje', module: 'Tarefas' },
  task_due_soon: { icon: CheckSquare, label: 'Tarefa próxima', module: 'Tarefas' },
  visit_overdue: { icon: Clock, label: 'Visita atrasada', module: 'Visitas' },
  visit_today: { icon: Clock, label: 'Visita hoje', module: 'Visitas' },
  visit_upcoming: { icon: Clock, label: 'Visita próxima', module: 'Visitas' },
  visit_no_report: { icon: Clock, label: 'Visita sem relatório', module: 'Visitas' },
  finding_critical: { icon: AlertTriangle, label: 'Achado crítico', module: 'Achados' },
  finding_overdue: { icon: AlertTriangle, label: 'Achado vencido', module: 'Achados' },
  finding_aging: { icon: AlertTriangle, label: 'Achado envelhecendo', module: 'Achados' },
  regulatory_pending: { icon: FileText, label: 'Regulatório pendente', module: 'Regulatório' },
  regulatory_due_soon: { icon: FileText, label: 'Regulatório próximo', module: 'Regulatório' },
  payment_overdue: { icon: DollarSign, label: 'Pagamento atrasado', module: 'Pagamentos' },
  payment_due_soon: { icon: DollarSign, label: 'Pagamento próximo', module: 'Pagamentos' },
  document_pending: { icon: FolderArchive, label: 'Documento pendente', module: 'eTMF' },
  document_missing: { icon: FolderArchive, label: 'Documento ausente', module: 'eTMF' },
  participant_status: { icon: Users, label: 'Status participante', module: 'Participantes' },
  general: { icon: Bell, label: 'Geral', module: 'Sistema' }
};

const severityConfig = {
  info: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', badge: 'default' as const },
  warning: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', badge: 'secondary' as const },
  critical: { color: 'bg-red-500/10 text-red-600 border-red-500/20', badge: 'destructive' as const }
};

export function AlertCard({ notification, onMarkAsRead, onDismiss, onNavigate }: AlertCardProps) {
  const config = typeConfig[notification.type] || typeConfig.general;
  const severity = severityConfig[notification.severity];
  const Icon = config.icon;

  const timeAgo = formatDistanceToNow(parseLocalDate(notification.created_at), {
    addSuffix: true,
    locale: ptBR
  });

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      !notification.is_read && "border-l-4 border-l-primary",
      severity.color
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            notification.severity === 'critical' && "bg-red-500/20",
            notification.severity === 'warning' && "bg-yellow-500/20",
            notification.severity === 'info' && "bg-blue-500/20"
          )}>
            <Icon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant={severity.badge} className="text-xs">
                {notification.severity === 'critical' ? 'Crítico' : 
                 notification.severity === 'warning' ? 'Atenção' : 'Info'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {config.module}
              </Badge>
              {notification.project && (
                <Badge variant="outline" className="text-xs bg-background">
                  {notification.project.title}
                </Badge>
              )}
            </div>
            
            <h4 className={cn(
              "font-medium text-sm",
              !notification.is_read && "font-semibold"
            )}>
              {notification.title}
            </h4>
            
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {notification.message}
            </p>
            
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">
                {timeAgo}
              </span>
              
              <div className="flex items-center gap-1">
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarkAsRead(notification.id)}
                    className="h-7 px-2 text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Lida
                  </Button>
                )}
                
                {notification.entity_type && notification.entity_id && onNavigate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate(notification.entity_type!, notification.entity_id!)}
                    className="h-7 px-2 text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(notification.id)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
