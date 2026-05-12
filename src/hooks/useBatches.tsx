import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BatchInfo } from '@/types/dispatch';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const FETCH_BACKOFF_MS = [500, 1500, 3000];

const mapRowToBatch = (row: any): BatchInfo => ({
  id: row.id,
  block_number: row.block_number,
  block_size: row.block_size,
  range: {
    start: row.range_start,
    end: row.range_end,
  },
  contacts: row.contacts as any,
  status: row.status as any,
  scheduled_at: row.scheduled_at || undefined,
  created_at: row.created_at,
  campaign_id: row.campaign_id || '',
  sheet_meta: row.sheet_meta as any,
  column_mapping: row.column_mapping as any,
  sending_started_at: row.sending_started_at || null,
});

export const useBatches = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const refetchTrigger = useRef(0);
  const [refetchTick, setRefetchTick] = useState(0);

  const fetchBatchesWithBackoff = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    let lastError: unknown = null;
    for (let attempt = 0; attempt < FETCH_BACKOFF_MS.length; attempt++) {
      try {
        const { data, error } = await supabase
          .from('batches')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setBatches((data || []).map(mapRowToBatch));
        setFetchError(null);
        setLoading(false);
        return;
      } catch (err) {
        lastError = err;
        console.error(`Error fetching batches (attempt ${attempt + 1}):`, err);
        if (attempt < FETCH_BACKOFF_MS.length - 1) {
          await new Promise((r) => setTimeout(r, FETCH_BACKOFF_MS[attempt]));
        }
      }
    }

    const message = lastError instanceof Error ? lastError.message : 'Erro ao carregar lotes';
    setBatches([]);
    setFetchError(message);
    setLoading(false);
    toast.error('Erro ao carregar lotes');
  }, []);

  const refetch = useCallback(() => {
    refetchTrigger.current += 1;
    setRefetchTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!user) {
      setBatches([]);
      setLoading(false);
      return;
    }

    fetchBatchesWithBackoff();

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
            setBatches((prev) => [mapRowToBatch(payload.new), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapRowToBatch(payload.new);
            setBatches((prev) =>
              prev.map((b) => (b.id === payload.new.id ? updated : b))
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
  }, [user, fetchBatchesWithBackoff, refetchTick]);

  const addBatch = useCallback(async (batch: BatchInfo) => {
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
          sheet_meta: batch.sheet_meta as any,
          column_mapping: batch.column_mapping as any,
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
  }, [user]);

  const updateBatch = useCallback(async (id: string, updates: Partial<BatchInfo>) => {
    if (!user) return;

    try {
      const updateData: any = {};
      if (updates.status) {
        updateData.status = updates.status;
        if (updates.status === 'sending') {
          updateData.sending_started_at = new Date().toISOString();
        } else if (updates.status === 'sent' || updates.status === 'error' || updates.status === 'ready') {
          updateData.sending_started_at = null;
        }
      }
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
  }, [user]);

  const deleteBatch = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setBatches((prev) => prev.filter((b) => b.id !== id));

      toast.success('Lote excluído');
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error('Erro ao excluir lote');
      throw error;
    }
  }, [user]);

  return {
    batches,
    loading,
    fetchError,
    refetch,
    addBatch,
    updateBatch,
    deleteBatch,
  };
};
