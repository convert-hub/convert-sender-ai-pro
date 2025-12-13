import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DispatchHistory } from '@/types/dispatch';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<DispatchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('dispatch_history')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform database format to DispatchHistory format
        const transformedHistory = (data || []).map((item) => ({
          id: item.id,
          timestamp: item.created_at,
          block_number: item.block_number,
          contacts_count: item.contacts_count,
          status: item.status as 'success' | 'error',
          response_status: item.response_status || undefined,
          error_message: item.error_message || undefined,
        }));

        setHistory(transformedHistory);
      } catch (error) {
        console.error('Error fetching history:', error);
        toast.error('Erro ao carregar histórico');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();

    // Real-time subscription
    const channel = supabase
      .channel('history-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dispatch_history',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newHistoryItem = {
            id: payload.new.id,
            timestamp: payload.new.created_at,
            block_number: payload.new.block_number,
            contacts_count: payload.new.contacts_count,
            status: payload.new.status as 'success' | 'error',
            response_status: payload.new.response_status || undefined,
            error_message: payload.new.error_message || undefined,
          };
          setHistory((prev) => [newHistoryItem, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addHistoryItem = useCallback(async (item: Omit<DispatchHistory, 'id' | 'timestamp'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dispatch_history')
        .insert({
          block_number: item.block_number,
          contacts_count: item.contacts_count,
          status: item.status,
          response_status: item.response_status || null,
          error_message: item.error_message || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error adding history item:', error);
      toast.error('Erro ao adicionar ao histórico');
      throw error;
    }
  }, [user]);

  return {
    history,
    loading,
    addHistoryItem,
  };
};
