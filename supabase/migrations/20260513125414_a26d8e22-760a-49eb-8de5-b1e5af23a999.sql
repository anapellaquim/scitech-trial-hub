-- Adicionar triggers de auditoria para Site Monitoring
CREATE TRIGGER audit_site_monitoring_visits
AFTER INSERT OR UPDATE OR DELETE ON public.site_monitoring_visits
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_site_monitoring_oversight
AFTER INSERT OR UPDATE OR DELETE ON public.site_monitoring_oversight
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_monitor_notes
AFTER INSERT OR UPDATE OR DELETE ON public.monitor_notes
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
