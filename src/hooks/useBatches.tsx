import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BatchInfo } from '@/types/dispatch';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useBatches = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBatches([]);
      setLoading(false);
      return;
    }

    const fetchBatches = async () => {
      try {
        const { data, error } = await supabase
          .from('batches')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform database format to BatchInfo format
        const transformedBatches = (data || []).map((batch) => ({
          id: batch.id,
          block_number: batch.block_number,
          block_size: batch.block_size,
          range: {
            start: batch.range_start,
            end: batch.range_end,
          },
          contacts: batch.contacts as any,
          status: batch.status as any,
          scheduled_at: batch.scheduled_at || undefined,
          created_at: batch.created_at,
          campaign_id: batch.campaign_id || '',
        }));

        setBatches(transformedBatches);
      } catch (error) {
        console.error('Error fetching batches:', error);
        toast.error('Erro ao carregar lotes');
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();

    // Real-time subscription
    const channel = supabase
      .channel('batches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batches',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newBatch = {
              id: payload.new.id,
              block_number: payload.new.block_number,
              block_size: payload.new.block_size,
              range: {
                start: payload.new.range_start,
                end: payload.new.range_end,
              },
              contacts: payload.new.contacts as any,
              status: payload.new.status as any,
              scheduled_at: payload.new.scheduled_at || undefined,
              created_at: payload.new.created_at,
              campaign_id: payload.new.campaign_id || '',
            };
            setBatches((prev) => [newBatch, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedBatch = {
              id: payload.new.id,
              block_number: payload.new.block_number,
              block_size: payload.new.block_size,
              range: {
                start: payload.new.range_start,
                end: payload.new.range_end,
              },
              contacts: payload.new.contacts as any,
              status: payload.new.status as any,
              scheduled_at: payload.new.scheduled_at || undefined,
              created_at: payload.new.created_at,
              campaign_id: payload.new.campaign_id || '',
            };
            setBatches((prev) =>
              prev.map((b) =>
                b.id === payload.new.id ? updatedBatch : b
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setBatches((prev) => prev.filter((b) => b.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addBatch = async (batch: BatchInfo) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('batches')
        .insert([{
          block_number: batch.block_number,
          block_size: batch.block_size,
          range_start: batch.range.start,
          range_end: batch.range.end,
          contacts: batch.contacts as any,
          status: batch.status,
          scheduled_at: batch.scheduled_at || null,
          campaign_id: batch.campaign_id || null,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Lote criado com sucesso');
      return data;
    } catch (error) {
      console.error('Error adding batch:', error);
      toast.error('Erro ao criar lote');
      throw error;
    }
  };

  const updateBatch = async (id: string, updates: Partial<BatchInfo>) => {
    if (!user) return;

    try {
      const updateData: any = {};
      if (updates.status) updateData.status = updates.status;
      if (updates.scheduled_at !== undefined) updateData.scheduled_at = updates.scheduled_at;

      const { error } = await supabase
        .from('batches')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Lote atualizado');
    } catch (error) {
      console.error('Error updating batch:', error);
      toast.error('Erro ao atualizar lote');
      throw error;
    }
  };

  const deleteBatch = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Manual state update
      setBatches((prev) => prev.filter((b) => b.id !== id));

      toast.success('Lote excluído');
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error('Erro ao excluir lote');
      throw error;
    }
  };

  return {
    batches,
    loading,
    addBatch,
    updateBatch,
    deleteBatch,
  };
};
