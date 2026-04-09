import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AlertFiltersProps {
  selectedProject: string;
  selectedType: string;
  selectedSeverity: string;
  onlyUnread: boolean;
  onProjectChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
  onUnreadChange: (value: boolean) => void;
  onClearFilters: () => void;
}

interface Project {
  id: string;
  title: string;
}

const notificationTypes = [
  { value: 'task_overdue', label: 'Tarefa atrasada' },
  { value: 'task_due_today', label: 'Tarefa para hoje' },
  { value: 'task_due_soon', label: 'Tarefa próxima' },
  { value: 'visit_overdue', label: 'Visita atrasada' },
  { value: 'visit_today', label: 'Visita hoje' },
  { value: 'visit_upcoming', label: 'Visita próxima' },
  { value: 'visit_no_report', label: 'Visita sem relatório' },
  { value: 'finding_critical', label: 'Achado crítico' },
  { value: 'finding_overdue', label: 'Achado vencido' },
  { value: 'finding_aging', label: 'Achado envelhecendo' },
  { value: 'regulatory_pending', label: 'Regulatório pendente' },
  { value: 'regulatory_due_soon', label: 'Regulatório próximo' },
  { value: 'payment_overdue', label: 'Pagamento atrasado' },
  { value: 'payment_due_soon', label: 'Pagamento próximo' },
  { value: 'document_pending', label: 'Documento pendente' },
  { value: 'document_missing', label: 'Documento ausente' },
  { value: 'participant_status', label: 'Status participante' },
];

export function AlertFilters({
  selectedProject,
  selectedType,
  selectedSeverity,
  onlyUnread,
  onProjectChange,
  onTypeChange,
  onSeverityChange,
  onUnreadChange,
  onClearFilters
}: AlertFiltersProps) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase
        .from('projects')
        .select('id, title')
        .order('title');
      
      if (data) setProjects(data as unknown as Project[]);
    }
    fetchProjects();
  }, []);

  const hasActiveFilters = selectedProject !== 'all' || selectedType !== 'all' || selectedSeverity !== 'all' || onlyUnread;

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex-1 min-w-[200px]">
        <Label className="text-xs text-muted-foreground mb-1 block">Estudo</Label>
        <Select value={selectedProject} onValueChange={onProjectChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todos os estudos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estudos</SelectItem>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Label className="text-xs text-muted-foreground mb-1 block">Tipo</Label>
        <Select value={selectedType} onValueChange={onTypeChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {notificationTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[150px]">
        <Label className="text-xs text-muted-foreground mb-1 block">Severidade</Label>
        <Select value={selectedSeverity} onValueChange={onSeverityChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="warning">Atenção</SelectItem>
            <SelectItem value="info">Informativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 pt-5">
        <Switch
          id="unread-only"
          checked={onlyUnread}
          onCheckedChange={onUnreadChange}
        />
        <Label htmlFor="unread-only" className="text-sm cursor-pointer">
          Apenas não lidas
        </Label>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="pt-5"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
