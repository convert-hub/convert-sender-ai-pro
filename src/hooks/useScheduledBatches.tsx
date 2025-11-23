import { useEffect, useRef } from 'react';
import { useBatches } from '@/hooks/useBatches';
import { useHistory } from '@/hooks/useHistory';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useDispatch } from '@/contexts/DispatchContext';
import { sendToWebhook } from '@/utils/webhook';
import { toast } from '@/hooks/use-toast';

export const useScheduledBatches = () => {
  const { batches, updateBatch } = useBatches();
  const { addHistoryItem } = useHistory();
  const { settings, incrementStats } = useUserSettings();
  const { campaigns } = useCampaigns();
  const { sheetMeta, columnMapping } = useDispatch();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkScheduledBatches = async () => {
      const now = new Date();
      
      const scheduledBatches = batches.filter(
        batch => batch.status === 'scheduled' && batch.scheduled_at
      );

      for (const batch of scheduledBatches) {
        const scheduledTime = new Date(batch.scheduled_at!);
        
        if (now >= scheduledTime) {
          await updateBatch(batch.block_number, { status: 'sending' });

          try {
            if (!sheetMeta || !columnMapping) {
              throw new Error('Dados de planilha não encontrados');
            }
            
            const campaign = campaigns.find(c => c.id === batch.campaign_id);
            if (!campaign) {
              throw new Error('Campanha não encontrada');
            }

            const response = await sendToWebhook(
              batch,
              columnMapping,
              sheetMeta,
              campaign,
              settings?.webhook_url || ''
            );

            if (response.success) {
              await updateBatch(batch.block_number, { status: 'sent' });
              await addHistoryItem({
                block_number: batch.block_number,
                contacts_count: batch.contacts.length,
                status: 'success',
                response_status: response.status,
              });
              await incrementStats('batches_sent', 1);

              toast({
                title: 'Envio agendado concluído',
                description: `Bloco #${batch.block_number} foi enviado automaticamente`,
              });
            } else {
              throw new Error(response.error || 'Erro ao enviar');
            }
          } catch (error) {
            await updateBatch(batch.block_number, { status: 'error' });
            await addHistoryItem({
              block_number: batch.block_number,
              contacts_count: batch.contacts.length,
              status: 'error',
              error_message: error instanceof Error ? error.message : 'Erro desconhecido',
            });

            toast({
              title: 'Erro no envio agendado',
              description: `Falha ao enviar bloco #${batch.block_number}`,
              variant: 'destructive',
            });
          }
        }
      }
    };

    intervalRef.current = setInterval(checkScheduledBatches, 30000);
    checkScheduledBatches();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [batches, updateBatch, addHistoryItem, settings, sheetMeta, columnMapping, incrementStats, campaigns]);
};
