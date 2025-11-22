import { useEffect, useRef } from 'react';
import { useDispatch } from '@/contexts/DispatchContext';
import { sendToWebhook } from '@/utils/webhook';
import { toast } from '@/hooks/use-toast';
import { BatchInfo } from '@/types/dispatch';

export const useScheduledBatches = () => {
  const { batches, setBatches, addToHistory, webhookUrl, sheetMeta, columnMapping, incrementStats } = useDispatch();
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
          // Update batch status to sending
          const updatedBatchesSending = batches.map(b => 
            b.block_number === batch.block_number 
              ? { ...b, status: 'sending' as const }
              : b
          );
          setBatches(updatedBatchesSending);

          try {
            if (!sheetMeta || !columnMapping) {
              throw new Error('Dados de planilha não encontrados');
            }

            const response = await sendToWebhook(
              batch,
              columnMapping,
              sheetMeta,
              webhookUrl
            );

            // Update batch status to sent
            const updatedBatchesSent = batches.map(b => 
              b.block_number === batch.block_number 
                ? { ...b, status: 'sent' as const }
                : b
            );
            setBatches(updatedBatchesSent);

            // Add to history
            if (response.success) {
              addToHistory({
                id: `${Date.now()}-${batch.block_number}`,
                timestamp: new Date().toISOString(),
                block_number: batch.block_number,
                contacts_count: batch.contacts.length,
                status: 'success',
                response_status: response.status,
              });

              incrementStats({ batches_sent: 1 });

              toast({
                title: 'Envio agendado concluído',
                description: `Bloco #${batch.block_number} foi enviado automaticamente`,
              });
            } else {
              throw new Error(response.error || 'Erro ao enviar');
            }
          } catch (error) {
            // Update batch status to error
            const updatedBatchesError = batches.map(b => 
              b.block_number === batch.block_number 
                ? { ...b, status: 'error' as const }
                : b
            );
            setBatches(updatedBatchesError);

            addToHistory({
              id: `${Date.now()}-${batch.block_number}`,
              timestamp: new Date().toISOString(),
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

    // Check every 30 seconds
    intervalRef.current = setInterval(checkScheduledBatches, 30000);
    
    // Check immediately on mount
    checkScheduledBatches();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [batches, setBatches, addToHistory, webhookUrl, sheetMeta, columnMapping, incrementStats]);
};
