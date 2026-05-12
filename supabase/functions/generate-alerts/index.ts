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

    // 14. COMMUNICATION OCCURRENCES — overdue, today, due soon
    const { data: commOccurrences } = await supabase
      .from('communication_occurrences')
      .select('id, plan_id, project_id, due_date, status, communication_plans!inner(title, lead_time_days, is_active, is_mandatory, channel)')
      .in('status', ['scheduled', 'overdue']);

    commOccurrences?.forEach((occ: any) => {
      const plan = occ.communication_plans;
      if (!plan?.is_active) return;
      const due = new Date(occ.due_date);
      const dueStr = occ.due_date;
      const leadTime = plan.lead_time_days || 0;
      const diffDays = Math.floor((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

      if (diffDays < 0) {
        alerts.push({
          type: 'communication_overdue',
          severity: 'critical',
          title: `Overdue communication: ${plan.title}`,
          message: `Mandatory communication "${plan.title}" was due on ${dueStr} (${plan.channel})`,
          entityType: 'communication_occurrence',
          entityId: occ.id,
          projectId: occ.project_id,
        });
      } else if (diffDays === 0) {
        alerts.push({
          type: 'communication_today',
          severity: 'warning',
          title: `Communication due today: ${plan.title}`,
          message: `Communication "${plan.title}" is due today via ${plan.channel}`,
          entityType: 'communication_occurrence',
          entityId: occ.id,
          projectId: occ.project_id,
        });
      } else if (diffDays <= leadTime) {
        alerts.push({
          type: 'communication_due_soon',
          severity: plan.is_mandatory ? 'warning' : 'info',
          title: `Upcoming communication: ${plan.title}`,
          message: `Communication "${plan.title}" is due in ${diffDays} day(s) on ${dueStr}`,
          entityType: 'communication_occurrence',
          entityId: occ.id,
          projectId: occ.project_id,
        });
      }
    });

    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 15. SITE MONITORING VISITS - overdue / today / upcoming / no report
    const { data: smVisits } = await supabase
      .from('site_monitoring_visits')
      .select('id, project_id, visit_type, status, planned_date, actual_date, report_date');
    smVisits?.forEach((v: any) => {
      if (v.status === 'planned' && v.planned_date) {
        if (v.planned_date < todayStr) {
          alerts.push({ type: 'site_monitoring_overdue', severity: 'critical',
            title: `Monitoring visit overdue: ${v.visit_type}`,
            message: `Site monitoring visit "${v.visit_type}" planned for ${v.planned_date} is overdue`,
            entityType: 'site_monitoring_visit', entityId: v.id, projectId: v.project_id });
        } else if (v.planned_date === todayStr) {
          alerts.push({ type: 'site_monitoring_today', severity: 'warning',
            title: `Monitoring visit today: ${v.visit_type}`,
            message: `Site monitoring visit "${v.visit_type}" is scheduled for today`,
            entityType: 'site_monitoring_visit', entityId: v.id, projectId: v.project_id });
        } else if (v.planned_date <= in7Days) {
          alerts.push({ type: 'site_monitoring_upcoming', severity: 'info',
            title: `Upcoming monitoring visit: ${v.visit_type}`,
            message: `Site monitoring visit "${v.visit_type}" planned for ${v.planned_date}`,
            entityType: 'site_monitoring_visit', entityId: v.id, projectId: v.project_id });
        }
      }
      if (v.status === 'completed' && v.actual_date && !v.report_date && v.actual_date < days30Ago) {
        alerts.push({ type: 'site_monitoring_no_report', severity: 'warning',
          title: `Monitoring report pending: ${v.visit_type}`,
          message: `Visit completed on ${v.actual_date} has no report after 30+ days`,
          entityType: 'site_monitoring_visit', entityId: v.id, projectId: v.project_id });
      }
    });

    // 16. SITE MONITORING FINDINGS
    const { data: smFindings } = await supabase
      .from('site_monitoring_oversight')
      .select('id, severity, status, due_date, description, monitoring_visit_id, site_monitoring_visits(project_id)');
    smFindings?.forEach((f: any) => {
      if (f.status === 'resolved' || f.status === 'closed') return;
      const pid = f.site_monitoring_visits?.project_id;
      if (f.severity === 'critical') {
        alerts.push({ type: 'site_finding_critical', severity: 'critical',
          title: 'Critical site monitoring finding',
          message: (f.description || '').substring(0, 120),
          entityType: 'site_monitoring_finding', entityId: f.id, projectId: pid });
      }
      if (f.due_date && f.due_date < todayStr) {
        alerts.push({ type: 'site_finding_overdue', severity: 'critical',
          title: 'Site monitoring finding overdue',
          message: `Due ${f.due_date}: ${(f.description || '').substring(0, 100)}`,
          entityType: 'site_monitoring_finding', entityId: f.id, projectId: pid });
      }
    });

    // 17. CHANGE CONTROLS - pending/in review
    const { data: changeControls } = await supabase
      .from('change_controls')
      .select('id, project_id, change_type, status')
      .in('status', ['pending', 'in_review', 'submitted']);
    changeControls?.forEach((c: any) => {
      alerts.push({ type: 'change_control_pending', severity: 'warning',
        title: `Change control pending: ${c.change_type}`,
        message: `Change control of type "${c.change_type}" is in status "${c.status}"`,
        entityType: 'change_control', entityId: c.id, projectId: c.project_id });
    });

    // 18. RISKS - review overdue / due soon
    const { data: risks } = await supabase
      .from('risks')
      .select('id, project_id, status, next_review_date')
      .neq('status', 'closed')
      .not('next_review_date', 'is', null);
    risks?.forEach((r: any) => {
      if (r.next_review_date < todayStr) {
        alerts.push({ type: 'risk_review_overdue', severity: 'warning',
          title: 'Risk review overdue',
          message: `Risk review was due on ${r.next_review_date}`,
          entityType: 'risk', entityId: r.id, projectId: r.project_id });
      } else if (r.next_review_date <= in7Days) {
        alerts.push({ type: 'risk_review_due_soon', severity: 'info',
          title: 'Risk review due soon',
          message: `Risk review due on ${r.next_review_date}`,
          entityType: 'risk', entityId: r.id, projectId: r.project_id });
      }
    });

    // 19. PROTOCOL DEVIATIONS - open
    const { data: deviations } = await supabase
      .from('protocol_deviations')
      .select('id, project_id, deviation_type, status, deviation_date, description')
      .in('status', ['open', 'under_review', 'pending']);
    deviations?.forEach((d: any) => {
      alerts.push({ type: 'deviation_open', severity: 'warning',
        title: `Open protocol deviation: ${d.deviation_type}`,
        message: (d.description || `Deviation on ${d.deviation_date}`).substring(0, 120),
        entityType: 'protocol_deviation', entityId: d.id, projectId: d.project_id });
    });

    // 20. SAFETY EVENTS - open / serious
    const { data: safetyEvents } = await supabase
      .from('safety_events')
      .select('id, project_id, event_type, status, severity, onset_date')
      .neq('status', 'resolved')
      .neq('status', 'closed');
    safetyEvents?.forEach((s: any) => {
      const isSerious = s.severity === 'serious' || s.severity === 'severe' || s.severity === 'critical';
      alerts.push({
        type: isSerious ? 'safety_event_serious' : 'safety_event_open',
        severity: isSerious ? 'critical' : 'warning',
        title: `${isSerious ? 'Serious safety event' : 'Safety event open'}: ${s.event_type}`,
        message: `Onset ${s.onset_date} — status ${s.status}`,
        entityType: 'safety_event', entityId: s.id, projectId: s.project_id });
    });

    // 21. TRAININGS - overdue / due soon
    const { data: trainings } = await supabase
      .from('trainings')
      .select('id, project_id, title, due_date, status')
      .neq('status', 'completed')
      .not('due_date', 'is', null);
    trainings?.forEach((t: any) => {
      if (t.due_date < todayStr) {
        alerts.push({ type: 'training_overdue', severity: 'critical',
          title: `Training overdue: ${t.title}`,
          message: `Training "${t.title}" was due on ${t.due_date}`,
          entityType: 'training', entityId: t.id, projectId: t.project_id });
      } else if (t.due_date <= in7Days) {
        alerts.push({ type: 'training_due_soon', severity: 'info',
          title: `Training due soon: ${t.title}`,
          message: `Training "${t.title}" due on ${t.due_date}`,
          entityType: 'training', entityId: t.id, projectId: t.project_id });
      }
    });

    // 22. QUALIFICATION CONTRACTS - expiring / expired
    const { data: contracts } = await supabase
      .from('qualification_contracts')
      .select('id, title, contract_type, status, end_date')
      .not('end_date', 'is', null);
    contracts?.forEach((c: any) => {
      if (c.status === 'terminated' || c.status === 'cancelled') return;
      if (c.end_date < todayStr) {
        alerts.push({ type: 'qualification_contract_expired', severity: 'critical',
          title: `Contract expired: ${c.title}`,
          message: `Contract "${c.title}" expired on ${c.end_date}`,
          entityType: 'qualification_contract', entityId: c.id });
      } else if (c.end_date <= in30Days) {
        alerts.push({ type: 'qualification_contract_expiring', severity: 'warning',
          title: `Contract expiring: ${c.title}`,
          message: `Contract "${c.title}" expires on ${c.end_date}`,
          entityType: 'qualification_contract', entityId: c.id });
      }
    });

    // 23. PMCF surveys - ending soon
    const { data: pmcfSurveys } = await supabase
      .from('pmcf_surveys')
      .select('id, project_id, title, status, end_date')
      .not('end_date', 'is', null);
    pmcfSurveys?.forEach((p: any) => {
      if (p.status === 'closed' || p.status === 'completed') return;
      if (p.end_date >= todayStr && p.end_date <= in30Days) {
        alerts.push({ type: 'pmcf_survey_ending_soon', severity: 'info',
          title: `PMCF survey ending soon: ${p.title}`,
          message: `Survey "${p.title}" ends on ${p.end_date}`,
          entityType: 'pmcf_survey', entityId: p.id, projectId: p.project_id });
      }
    });

    // 24. PMCF monthly checks - overdue
    const { data: pmcfChecks } = await supabase
      .from('pmcf_monthly_checks')
      .select('id, project_id, status')
      .in('status', ['pending', 'overdue']);
    pmcfChecks?.forEach((c: any) => {
      alerts.push({ type: 'pmcf_check_overdue', severity: 'warning',
        title: 'PMCF monthly check pending',
        message: `PMCF monthly check is in status "${c.status}"`,
        entityType: 'pmcf_check', entityId: c.id, projectId: c.project_id });
    });

    // 25. STEERING MEETINGS - upcoming / overdue (next_meeting_date)
    const { data: steerMeetings } = await supabase
      .from('steering_meetings')
      .select('id, project_id, status, meeting_date, next_meeting_date');
    steerMeetings?.forEach((m: any) => {
      const ref = m.next_meeting_date || m.meeting_date;
      if (!ref) return;
      if (m.status === 'scheduled' && ref < todayStr) {
        alerts.push({ type: 'steering_meeting_overdue', severity: 'warning',
          title: 'Steering meeting overdue',
          message: `Steering meeting was scheduled for ${ref}`,
          entityType: 'steering_meeting', entityId: m.id, projectId: m.project_id });
      } else if (ref >= todayStr && ref <= in7Days) {
        alerts.push({ type: 'steering_meeting_upcoming', severity: 'info',
          title: 'Upcoming steering meeting',
          message: `Steering meeting on ${ref}`,
          entityType: 'steering_meeting', entityId: m.id, projectId: m.project_id });
      }
    });

    // 26. CLINICAL EVALUATION DOCUMENTS - review due
    const { data: ceDocs } = await supabase
      .from('clinical_evaluation_documents')
      .select('id, project_id, title, status, next_review_date')
      .not('next_review_date', 'is', null);
    ceDocs?.forEach((d: any) => {
      if (d.next_review_date <= in30Days) {
        const overdue = d.next_review_date < todayStr;
        alerts.push({ type: 'clinical_evaluation_review_due',
          severity: overdue ? 'critical' : 'warning',
          title: `Clinical evaluation review ${overdue ? 'overdue' : 'due'}: ${d.title}`,
          message: `Document "${d.title}" review ${overdue ? 'was due' : 'due'} on ${d.next_review_date}`,
          entityType: 'clinical_evaluation_document', entityId: d.id, projectId: d.project_id });
      }
    });

    // 27. COMMITTEE LETTERS - pending/draft
    const { data: letters } = await supabase
      .from('committee_letters')
      .select('id, project_id, title, committee_type, status, letter_date')
      .in('status', ['draft', 'pending', 'in_review']);
    letters?.forEach((l: any) => {
      alerts.push({ type: 'committee_letter_pending', severity: 'info',
        title: `Committee letter pending: ${l.title}`,
        message: `${l.committee_type} letter "${l.title}" is in status "${l.status}"`,
        entityType: 'committee_letter', entityId: l.id, projectId: l.project_id });
    });

    // 28. TMF DOCUMENTS - expiring / expired
    const { data: tmfDocs } = await supabase
      .from('tmf_documents')
      .select('id, project_id, file_name, status, expiration_date')
      .not('expiration_date', 'is', null);
    tmfDocs?.forEach((d: any) => {
      if (d.expiration_date < todayStr) {
        alerts.push({ type: 'tmf_document_expired', severity: 'critical',
          title: `TMF document expired: ${d.file_name}`,
          message: `Document expired on ${d.expiration_date}`,
          entityType: 'tmf_document', entityId: d.id, projectId: d.project_id });
      } else if (d.expiration_date <= in30Days) {
        alerts.push({ type: 'tmf_document_expiring', severity: 'warning',
          title: `TMF document expiring: ${d.file_name}`,
          message: `Document expires on ${d.expiration_date}`,
          entityType: 'tmf_document', entityId: d.id, projectId: d.project_id });
      }
    });

    // 29. IP SUPPLY - expiring / expired (no project_id)
    const { data: ipItems } = await supabase
      .from('ip_supply')
      .select('id, description, lot_number, expiration_date')
      .not('expiration_date', 'is', null);
    ipItems?.forEach((i: any) => {
      if (i.expiration_date < todayStr) {
        alerts.push({ type: 'ip_supply_expired', severity: 'critical',
          title: `IP supply expired: ${i.description || i.lot_number || i.id}`,
          message: `Lot ${i.lot_number || '—'} expired on ${i.expiration_date}`,
          entityType: 'ip_supply', entityId: i.id });
      } else if (i.expiration_date <= in30Days) {
        alerts.push({ type: 'ip_supply_expiring', severity: 'warning',
          title: `IP supply expiring: ${i.description || i.lot_number || i.id}`,
          message: `Lot ${i.lot_number || '—'} expires on ${i.expiration_date}`,
          entityType: 'ip_supply', entityId: i.id });
      }
    });

    // 30. DATA QUERIES - open
    const { data: dq } = await supabase
      .from('data_queries')
      .select('id, query_type, status')
      .in('status', ['open', 'pending', 'awaiting_response']);
    dq?.forEach((q: any) => {
      alerts.push({ type: 'data_query_open', severity: 'info',
        title: `Open data query: ${q.query_type}`,
        message: `Data query of type "${q.query_type}" is ${q.status}`,
        entityType: 'data_query', entityId: q.id });
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
