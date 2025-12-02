import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserStats {
  uploads_total: number;
  rows_total: number;
  rows_valid: number;
  rows_invalid: number;
  batches_total: number;
  batches_sent: number;
  daily_dispatch_limit?: number;
  dispatches_today?: number;
  last_dispatch_date?: string;
}

interface UserSettings {
  webhook_url: string;
  stats: UserStats;
}

interface DailyLimitCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
  used_today: number;
  error?: string;
}

export const useUserSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    webhook_url: '',
    stats: {
      uploads_total: 0,
      rows_total: 0,
      rows_valid: 0,
      rows_invalid: 0,
      batches_total: 0,
      batches_sent: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          // If settings don't exist, create default ones
          if (error.code === 'PGRST116') {
            const { data: newData, error: insertError } = await supabase
              .from('user_settings')
              .insert({
                user_id: user.id,
                webhook_url: 'https://n8n.converthub.com.br/webhook/disparos-precatorizei',
                stats: {
                  uploads_total: 0,
                  rows_total: 0,
                  rows_valid: 0,
                  rows_invalid: 0,
                  batches_total: 0,
                  batches_sent: 0,
                },
              })
              .select()
              .single();

            if (insertError) throw insertError;
            
            setSettings({
              webhook_url: newData.webhook_url || '',
              stats: (newData.stats || {
                uploads_total: 0,
                rows_total: 0,
                rows_valid: 0,
                rows_invalid: 0,
                batches_total: 0,
                batches_sent: 0,
              }) as unknown as UserStats,
            });
          } else {
            throw error;
          }
        } else {
          setSettings({
            webhook_url: data.webhook_url || '',
            stats: (data.stats || {
              uploads_total: 0,
              rows_total: 0,
              rows_valid: 0,
              rows_invalid: 0,
              batches_total: 0,
              batches_sent: 0,
            }) as unknown as UserStats,
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();

    // Real-time subscription
    const channel = supabase
      .channel('settings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setSettings({
            webhook_url: payload.new.webhook_url || '',
            stats: payload.new.stats as UserStats,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const updateWebhookUrl = async (url: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ webhook_url: url })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Webhook atualizado');
    } catch (error) {
      console.error('Error updating webhook:', error);
      toast.error('Erro ao atualizar webhook');
      throw error;
    }
  };

  const updateStats = async (newStats: Partial<UserStats>) => {
    if (!user) return;

    try {
      const updatedStats = { ...settings.stats, ...newStats };

      const { error } = await supabase
        .from('user_settings')
        .update({ stats: updatedStats })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating stats:', error);
      toast.error('Erro ao atualizar estatísticas');
      throw error;
    }
  };

  const incrementStats = async (field: keyof UserStats, amount: number = 1) => {
    if (!user) return;

    try {
      const currentValue = settings.stats[field];
      const numericValue = typeof currentValue === 'number' ? currentValue : 0;
      
      const updatedStats = {
        ...settings.stats,
        [field]: numericValue + amount,
      };

      const { error } = await supabase
        .from('user_settings')
        .update({ stats: updatedStats })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error incrementing stats:', error);
      throw error;
    }
  };

  const checkDailyLimit = async (contactsToSend: number): Promise<DailyLimitCheck> => {
    if (!user) {
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        used_today: 0,
        error: 'User not authenticated',
      };
    }

    try {
      const { data, error } = await supabase
        .rpc('check_daily_limit', {
          _user_id: user.id,
          _contacts_to_send: contactsToSend,
        });

      if (error) throw error;

      return data as unknown as DailyLimitCheck;
    } catch (error) {
      console.error('Error checking daily limit:', error);
      // NÃO mostrar toast aqui - deixar o chamador decidir como tratar
      return {
        allowed: false,
        remaining: 0,
        limit: 50,
        used_today: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const confirmDailyDispatch = async (contactsSent: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .rpc('confirm_daily_dispatch', {
          _user_id: user.id,
          _contacts_sent: contactsSent,
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error confirming daily dispatch:', error);
      return false;
    }
  };

  return {
    settings,
    loading,
    updateWebhookUrl,
    updateStats,
    incrementStats,
    checkDailyLimit,
    confirmDailyDispatch,
  };
};
