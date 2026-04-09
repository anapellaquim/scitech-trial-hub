import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  user_id: string | null;
  project_id: string | null;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  dismissed: boolean;
  dismissed_at: string | null;
  created_at: string;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  project?: {
    title: string;
  };
}

interface UseNotificationsOptions {
  projectId?: string;
  type?: string;
  severity?: string;
  onlyUnread?: boolean;
  limit?: number;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('notifications')
        .select(`
          *,
          project:projects(title)
        `)
        .eq('dismissed', false)
        .order('created_at', { ascending: false });

      if (options.projectId) {
        query = query.eq('project_id', options.projectId);
      }

      if (options.type) {
        query = query.eq('type', options.type as any);
      }

      if (options.severity) {
        query = query.eq('severity', options.severity as any);
      }

      if (options.onlyUnread) {
        query = query.eq('is_read', false);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      const notifs = (data || []) as unknown as Notification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
      setCriticalCount(notifs.filter(n => n.severity === 'critical' && !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [options.projectId, options.type, options.severity, options.onlyUnread, options.limit]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar como lida",
        variant: "destructive"
      });
    }
  }, [toast]);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
      setCriticalCount(0);
      
      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas"
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar todas como lidas",
        variant: "destructive"
      });
    }
  }, [notifications, toast]);

  const dismiss = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast({
        title: "Notificação dispensada",
      });
    } catch (error) {
      console.error('Error dismissing notification:', error);
      toast({
        title: "Erro",
        description: "Não foi possível dispensar a notificação",
        variant: "destructive"
      });
    }
  }, [toast]);

  const dismissMultiple = useCallback(async (notificationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ dismissed: true, dismissed_at: new Date().toISOString() })
        .in('id', notificationIds);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
      toast({
        title: "Notificações dispensadas",
        description: `${notificationIds.length} notificações foram dispensadas`
      });
    } catch (error) {
      console.error('Error dismissing notifications:', error);
      toast({
        title: "Erro",
        description: "Não foi possível dispensar as notificações",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    unreadCount,
    criticalCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    dismissMultiple,
    refresh: fetchNotifications
  };
}

export function useNotificationStats() {
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    critical: 0,
    byType: {} as Record<string, number>,
    byProject: {} as Record<string, { name: string; count: number }>
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select(`
            id,
            type,
            severity,
            is_read,
            project_id,
            project:projects(name)
          `)
          .eq('dismissed', false);

        if (error) throw error;

        const notifs = data || [];
        const byType: Record<string, number> = {};
        const byProject: Record<string, { name: string; count: number }> = {};

        notifs.forEach((n: any) => {
          // Count by type
          byType[n.type] = (byType[n.type] || 0) + 1;

          // Count by project
          if (n.project_id && n.project) {
            if (!byProject[n.project_id]) {
              byProject[n.project_id] = { name: n.project.name, count: 0 };
            }
            byProject[n.project_id].count++;
          }
        });

        setStats({
          total: notifs.length,
          unread: notifs.filter((n: any) => !n.is_read).length,
          critical: notifs.filter((n: any) => n.severity === 'critical').length,
          byType,
          byProject
        });
      } catch (error) {
        console.error('Error fetching notification stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return { stats, loading };
}
