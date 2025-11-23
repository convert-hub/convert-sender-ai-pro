import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string | null;
  ai_instructions: any; // Use 'any' to match database schema
  is_custom: boolean;
  is_global: boolean;
  user_id: string | null;
  created_at: string;
}

export const useCampaignTemplates = () => {
  const { user, isAdmin } = useAuth();
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('campaign_templates')
          .select('*')
          .order('is_global', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;

        setTemplates((data || []) as CampaignTemplate[]);
      } catch (error) {
        console.error('Error fetching templates:', error);
        toast.error('Erro ao carregar templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();

    // Real-time subscription
    const channel = supabase
      .channel('campaign_templates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_templates',
        },
        () => {
          fetchTemplates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addTemplate = async (template: Omit<CampaignTemplate, 'id' | 'created_at' | 'user_id'>) => {
    if (!user || !isAdmin) {
      toast.error('Apenas administradores podem criar templates');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('campaign_templates')
        .insert([{
          name: template.name,
          description: template.description,
          ai_instructions: template.ai_instructions,
          is_custom: template.is_custom,
          is_global: template.is_global,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Template criado com sucesso');
      return data;
    } catch (error) {
      console.error('Error adding template:', error);
      toast.error('Erro ao criar template');
      throw error;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<CampaignTemplate>) => {
    if (!user || !isAdmin) {
      toast.error('Apenas administradores podem editar templates');
      return;
    }

    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.ai_instructions) updateData.ai_instructions = updates.ai_instructions;

      const { error } = await supabase
        .from('campaign_templates')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Template atualizado');
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Erro ao atualizar template');
      throw error;
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!user || !isAdmin) {
      toast.error('Apenas administradores podem excluir templates');
      return;
    }

    try {
      const { error } = await supabase
        .from('campaign_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Template excluído');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erro ao excluir template');
      throw error;
    }
  };

  return {
    templates,
    loading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    canManageTemplates: isAdmin,
  };
};
