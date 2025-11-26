import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Campaign } from '@/types/dispatch';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useCampaigns = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    const fetchCampaigns = async () => {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setCampaigns((data || []) as unknown as Campaign[]);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        toast.error('Erro ao carregar campanhas');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();

    // Real-time subscription
    const channel = supabase
      .channel('campaigns-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCampaigns((prev) => [payload.new as Campaign, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setCampaigns((prev) =>
              prev.map((c) => (c.id === payload.new.id ? (payload.new as Campaign) : c))
            );
          } else if (payload.eventType === 'DELETE') {
            setCampaigns((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addCampaign = async (campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          name: campaign.name,
          objective: campaign.objective || null,
          description: campaign.description || null,
          ai_instructions: campaign.ai_instructions as any,
          stats: campaign.stats as any,
          status: campaign.status,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Campanha criada com sucesso');
      return data as unknown as Campaign;
    } catch (error) {
      console.error('Error adding campaign:', error);
      toast.error('Erro ao criar campanha');
      throw error;
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    if (!user) return;

    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.objective !== undefined) updateData.objective = updates.objective;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.ai_instructions) updateData.ai_instructions = updates.ai_instructions;
      if (updates.stats) updateData.stats = updates.stats;
      if (updates.status) updateData.status = updates.status;

      const { error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Campanha atualizada');
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Erro ao atualizar campanha');
      throw error;
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Atualizar estado local imediatamente
      setCampaigns((prev) => prev.filter((c) => c.id !== id));

      toast.success('Campanha excluída');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Erro ao excluir campanha');
      throw error;
    }
  };

  return {
    campaigns,
    loading,
    addCampaign,
    updateCampaign,
    deleteCampaign,
  };
};
