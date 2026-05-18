import { parseLocalDate, formatDateOnly, todayDateOnly , formatInBrasilia } from "@/lib/dateUtils";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScheduleTask, TaskDependency, TaskRACI, Profile, Project } from '@/types/schedule';

interface ExportData {
  project: Project;
  tasks: ScheduleTask[];
  dependencies: TaskDependency[];
  raciAssignments: TaskRACI[];
  profiles: Profile[];
}

const statusLabels: Record<string, string> = {
  backlog: 'Backlog',
  in_progress: 'Em Progresso',
  waiting: 'Aguardando',
  completed: 'Concluído',
  pending: 'Pendente',
};

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

const formatDate = (date: string | null) => {
  if (!date) return '-';
  return format(parseLocalDate(date), 'dd/MM/yyyy', { locale: ptBR });
};

export const useScheduleExport = () => {
  const getProfileName = (profiles: Profile[], id: string | null) => {
    if (!id) return '-';
    const profile = profiles.find(p => p.id === id);
    return profile?.full_name || '-';
  };

  const getDependencyNames = (
    taskId: string, 
    tasks: ScheduleTask[], 
    dependencies: TaskDependency[]
  ) => {
    const deps = dependencies.filter(d => d.task_id === taskId);
    return deps.map(d => {
      const task = tasks.find(t => t.id === d.depends_on_task_id);
      return task?.title || '-';
    }).join(', ') || '-';
  };

  const exportToExcel = ({ project, tasks, dependencies, raciAssignments, profiles }: ExportData) => {
    const wb = XLSX.utils.book_new();

    // Tasks sheet
    const tasksData = tasks.map(task => ({
      'Título': task.title,
      'Descrição': task.description || '-',
      'Status': statusLabels[task.status] || task.status,
      'Prioridade': priorityLabels[task.priority || ''] || task.priority || '-',
      'Progresso (%)': task.progress_percentage || 0,
      'Responsável': getProfileName(profiles, task.assigned_to),
      'Data Início Planejada': formatDate(task.planned_start_date),
      'Data Fim Planejada': formatDate(task.planned_end_date),
      'Data Início Real': formatDate(task.actual_start_date),
      'Data Fim Real': formatDate(task.actual_end_date),
      'Dependências': getDependencyNames(task.id, tasks, dependencies),
    }));

    const wsTask = XLSX.utils.json_to_sheet(tasksData);
    XLSX.utils.book_append_sheet(wb, wsTask, 'Tarefas');

    // RACI sheet
    const raciData: Record<string, Record<string, string>> = {};
    tasks.forEach(task => {
      raciData[task.title] = { 'Tarefa': task.title };
      profiles.forEach(profile => {
        raciData[task.title][profile.full_name] = '';
      });
    });

    raciAssignments.forEach(raci => {
      const task = tasks.find(t => t.id === raci.task_id);
      const profile = profiles.find(p => p.id === raci.user_id);
      if (task && profile && raciData[task.title]) {
        const current = raciData[task.title][profile.full_name];
        raciData[task.title][profile.full_name] = current 
          ? `${current}, ${raci.role.toUpperCase()}` 
          : raci.role.toUpperCase();
      }
    });

    const raciRows = Object.values(raciData);
    if (raciRows.length > 0) {
      const wsRaci = XLSX.utils.json_to_sheet(raciRows);
      XLSX.utils.book_append_sheet(wb, wsRaci, 'Matriz RACI');
    }

    // Download
    const fileName = `cronograma_${project.title.replace(/\s+/g, '_')}_${todayDateOnly()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportToPDF = ({ project, tasks, dependencies, raciAssignments, profiles }: ExportData) => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.text(`Cronograma: ${project.title}`, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Exportado em: ${formatInBrasilia(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth / 2, 22, { align: 'center' });

    // Tasks table
    const tableData = tasks.map(task => [
      task.title,
      statusLabels[task.status] || task.status,
      priorityLabels[task.priority || ''] || '-',
      `${task.progress_percentage || 0}%`,
      getProfileName(profiles, task.assigned_to),
      formatDate(task.planned_start_date),
      formatDate(task.planned_end_date),
      formatDate(task.actual_start_date),
      formatDate(task.actual_end_date),
    ]);

    autoTable(doc, {
      head: [['Tarefa', 'Status', 'Prioridade', 'Progresso', 'Responsável', 'Início Plan.', 'Fim Plan.', 'Início Real', 'Fim Real']],
      body: tableData,
      startY: 30,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // RACI Matrix on new page
    if (raciAssignments.length > 0 && profiles.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Matriz RACI', pageWidth / 2, 15, { align: 'center' });

      const raciHeaders = ['Tarefa', ...profiles.map(p => p.full_name)];
      const raciBody = tasks.map(task => {
        const row = [task.title];
        profiles.forEach(profile => {
          const assignments = raciAssignments
            .filter(r => r.task_id === task.id && r.user_id === profile.id)
            .map(r => r.role.charAt(0).toUpperCase())
            .join('/');
          row.push(assignments || '-');
        });
        return row;
      });

      autoTable(doc, {
        head: [raciHeaders],
        body: raciBody,
        startY: 25,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });
    }

    // Download
    const fileName = `cronograma_${project.title.replace(/\s+/g, '_')}_${todayDateOnly()}.pdf`;
    doc.save(fileName);
  };

  return { exportToExcel, exportToPDF };
};
