import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertConfig {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  projectId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const days30Ago = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const days60Ago = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const alerts: AlertConfig[] = [];

    console.log('Starting alert generation...');

    // 1. TASKS - Overdue
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('id, title, project_id, end_date')
      .lt('end_date', todayStr)
      .neq('status', 'completed');

    overdueTasks?.forEach(task => {
      alerts.push({
        type: 'task_overdue',
        severity: 'critical',
        title: `Tarefa atrasada: ${task.title}`,
        message: `A tarefa "${task.title}" está atrasada desde ${task.end_date}`,
        entityType: 'task',
        entityId: task.id,
        projectId: task.project_id
      });
    });

    // 2. TASKS - Due today
    const { data: todayTasks } = await supabase
      .from('tasks')
      .select('id, title, project_id')
      .eq('end_date', todayStr)
      .neq('status', 'completed');

    todayTasks?.forEach(task => {
      alerts.push({
        type: 'task_due_today',
        severity: 'warning',
        title: `Tarefa para hoje: ${task.title}`,
        message: `A tarefa "${task.title}" vence hoje`,
        entityType: 'task',
        entityId: task.id,
        projectId: task.project_id
      });
    });

    // 3. TASKS - Due in 7 days
    const { data: upcomingTasks } = await supabase
      .from('tasks')
      .select('id, title, project_id, end_date')
      .gt('end_date', todayStr)
      .lte('end_date', in7Days)
      .neq('status', 'completed');

    upcomingTasks?.forEach(task => {
      alerts.push({
        type: 'task_due_soon',
        severity: 'info',
        title: `Tarefa próxima: ${task.title}`,
        message: `A tarefa "${task.title}" vence em ${task.end_date}`,
        entityType: 'task',
        entityId: task.id,
        projectId: task.project_id
      });
    });

    // 4. VISITS - Overdue
    const { data: overdueVisits } = await supabase
      .from('study_visits')
      .select('id, visit_type, scheduled_date, project_id, research_centers(name)')
      .lt('scheduled_date', todayStr)
      .eq('status', 'scheduled');

    overdueVisits?.forEach((visit: any) => {
      alerts.push({
        type: 'visit_overdue',
        severity: 'critical',
        title: `Visita atrasada: ${visit.visit_type}`,
        message: `Visita ${visit.visit_type} no centro ${visit.research_centers?.name || 'N/A'} está atrasada desde ${visit.scheduled_date}`,
        entityType: 'visit',
        entityId: visit.id,
        projectId: visit.project_id
      });
    });

    // 5. VISITS - Today
    const { data: todayVisits } = await supabase
      .from('study_visits')
      .select('id, visit_type, project_id, research_centers(name)')
      .eq('scheduled_date', todayStr)
      .eq('status', 'scheduled');

    todayVisits?.forEach((visit: any) => {
      alerts.push({
        type: 'visit_today',
        severity: 'warning',
        title: `Visita hoje: ${visit.visit_type}`,
        message: `Visita ${visit.visit_type} no centro ${visit.research_centers?.name || 'N/A'} está agendada para hoje`,
        entityType: 'visit',
        entityId: visit.id,
        projectId: visit.project_id
      });
    });

    // 6. VISITS - Upcoming 7 days
    const { data: upcomingVisits } = await supabase
      .from('study_visits')
      .select('id, visit_type, scheduled_date, project_id, research_centers(name)')
      .gt('scheduled_date', todayStr)
      .lte('scheduled_date', in7Days)
      .eq('status', 'scheduled');

    upcomingVisits?.forEach((visit: any) => {
      alerts.push({
        type: 'visit_upcoming',
        severity: 'info',
        title: `Visita próxima: ${visit.visit_type}`,
        message: `Visita ${visit.visit_type} no centro ${visit.research_centers?.name || 'N/A'} em ${visit.scheduled_date}`,
        entityType: 'visit',
        entityId: visit.id,
        projectId: visit.project_id
      });
    });

    // 7. FINDINGS - Critical open
    const { data: criticalFindings } = await supabase
      .from('visit_findings')
      .select('id, description, visit_id, study_visits(project_id)')
      .eq('severity', 'critical')
      .eq('status', 'open');

    criticalFindings?.forEach((finding: any) => {
      alerts.push({
        type: 'finding_critical',
        severity: 'critical',
        title: 'Achado crítico aberto',
        message: finding.description.substring(0, 100),
        entityType: 'finding',
        entityId: finding.id,
        projectId: finding.study_visits?.project_id
      });
    });

    // 8. FINDINGS - Overdue
    const { data: overdueFindings } = await supabase
      .from('visit_findings')
      .select('id, description, due_date, visit_id, study_visits(project_id)')
      .lt('due_date', todayStr)
      .eq('status', 'open');

    overdueFindings?.forEach((finding: any) => {
      alerts.push({
        type: 'finding_overdue',
        severity: 'critical',
        title: 'Achado com prazo vencido',
        message: `Achado vencido desde ${finding.due_date}: ${finding.description.substring(0, 80)}`,
        entityType: 'finding',
        entityId: finding.id,
        projectId: finding.study_visits?.project_id
      });
    });

    // 9. FINDINGS - Aging (>30 days)
    const { data: agingFindings } = await supabase
      .from('visit_findings')
      .select('id, description, created_at, visit_id, study_visits(project_id)')
      .lt('created_at', days30Ago)
      .eq('status', 'open');

    agingFindings?.forEach((finding: any) => {
      const isOld = finding.created_at < days60Ago;
      alerts.push({
        type: 'finding_aging',
        severity: isOld ? 'warning' : 'info',
        title: `Achado aberto há ${isOld ? '60+' : '30+'} dias`,
        message: finding.description.substring(0, 100),
        entityType: 'finding',
        entityId: finding.id,
        projectId: finding.study_visits?.project_id
      });
    });

    // 10. REGULATORY - Pending submissions
    const { data: pendingSubmissions } = await supabase
      .from('regulatory_submissions')
      .select('id, submission_type, planned_date, project_id')
      .eq('status', 'pending')
      .lt('planned_date', todayStr);

    pendingSubmissions?.forEach(sub => {
      alerts.push({
        type: 'regulatory_pending',
        severity: 'warning',
        title: `Submissão pendente: ${sub.submission_type}`,
        message: `Submissão ${sub.submission_type} planejada para ${sub.planned_date} ainda pendente`,
        entityType: 'submission',
        entityId: sub.id,
        projectId: sub.project_id
      });
    });

    // 11. REGULATORY - Reports due soon
    const { data: dueReports } = await supabase
      .from('regulatory_reports')
      .select('id, report_type, due_date, project_id')
      .eq('status', 'pending')
      .lte('due_date', in7Days);

    dueReports?.forEach(report => {
      const isOverdue = report.due_date < todayStr;
      alerts.push({
        type: isOverdue ? 'regulatory_pending' : 'regulatory_due_soon',
        severity: isOverdue ? 'critical' : 'warning',
        title: `Relatório ${isOverdue ? 'atrasado' : 'próximo'}: ${report.report_type}`,
        message: `Relatório ${report.report_type} ${isOverdue ? 'venceu em' : 'vence em'} ${report.due_date}`,
        entityType: 'report',
        entityId: report.id,
        projectId: report.project_id
      });
    });

    // 12. PAYMENTS - Overdue
    const { data: overduePayments } = await supabase
      .from('vendor_payments')
      .select('id, vendor_name, amount, payment_date, project_id')
      .eq('status', 'programado')
      .lt('payment_date', todayStr);

    overduePayments?.forEach(payment => {
      alerts.push({
        type: 'payment_overdue',
        severity: 'critical',
        title: `Pagamento atrasado: ${payment.vendor_name}`,
        message: `Pagamento de R$ ${payment.amount} para ${payment.vendor_name} venceu em ${payment.payment_date}`,
        entityType: 'payment',
        entityId: payment.id,
        projectId: payment.project_id
      });
    });

    // 13. PAYMENTS - Due in 7 days
    const { data: upcomingPayments } = await supabase
      .from('vendor_payments')
      .select('id, vendor_name, amount, payment_date, project_id')
      .eq('status', 'programado')
      .gte('payment_date', todayStr)
      .lte('payment_date', in7Days);

    upcomingPayments?.forEach(payment => {
      alerts.push({
        type: 'payment_due_soon',
        severity: 'info',
        title: `Pagamento próximo: ${payment.vendor_name}`,
        message: `Pagamento de R$ ${payment.amount} para ${payment.vendor_name} vence em ${payment.payment_date}`,
        entityType: 'payment',
        entityId: payment.id,
        projectId: payment.project_id
      });
    });

    console.log(`Generated ${alerts.length} alerts`);

    // Clear existing non-dismissed notifications and insert new ones
    // First, mark old alerts as dismissed
    await supabase
      .from('notifications')
      .update({ dismissed: true, dismissed_at: new Date().toISOString() })
      .eq('dismissed', false);

    // Insert new alerts
    if (alerts.length > 0) {
      const notificationsToInsert = alerts.map(alert => ({
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        entity_type: alert.entityType,
        entity_id: alert.entityId,
        project_id: alert.projectId || null,
        user_id: null, // Global notifications
        is_read: false,
        dismissed: false
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
        throw insertError;
      }
    }

    console.log('Alert generation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsGenerated: alerts.length,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('Error generating alerts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
