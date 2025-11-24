import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemSetting {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const useSystemSettings = () => {
  const [templateSheetUrl, setTemplateSheetUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplateUrl();

    // Subscribe to changes
    const channel = supabase
      .channel('system_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.template_sheet_url',
        },
        () => {
          fetchTemplateUrl();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTemplateUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'template_sheet_url')
        .single();

      if (error) throw error;

      setTemplateSheetUrl(data?.value || '');
    } catch (error) {
      console.error('Error fetching template URL:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTemplateUrl = async (url: string) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: url })
        .eq('key', 'template_sheet_url');

      if (error) throw error;

      setTemplateSheetUrl(url);
      
      toast({
        title: 'Template atualizado',
        description: 'URL do template foi atualizada com sucesso.',
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível atualizar o template.',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  return {
    templateSheetUrl,
    loading,
    updateTemplateUrl,
  };
};
