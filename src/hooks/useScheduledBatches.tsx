import { useEffect, useRef } from 'react';
import { useBatches } from '@/hooks/useBatches';
import { useHistory } from '@/hooks/useHistory';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useCampaigns } from '@/hooks/useCampaigns';
import { sendToWebhook } from '@/utils/webhook';
import { toast } from '@/hooks/use-toast';

export const useScheduledBatches = () => {
  const { batches, updateBatch } = useBatches();
  const { addHistoryItem } = useHistory();
  const { settings, incrementStats, checkDailyLimit, confirmDailyDispatch } = useUserSettings();
  const { campaigns } = useCampaigns();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs para evitar re-execuções do useEffect
  const batchesRef = useRef(batches);
  const settingsRef = useRef(settings);
  const campaignsRef = useRef(campaigns);
  
  // Set para rastrear batches sendo processados (evita duplicatas)
  const processingRef = useRef<Set<string>>(new Set());

  // Atualizar refs quando os valores mudam
  useEffect(() => {
    batchesRef.current = batches;
  }, [batches]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    campaignsRef.current = campaigns;
  }, [campaigns]);

  useEffect(() => {
    const checkScheduledBatches = async () => {
      const now = new Date();
      const currentBatches = batchesRef.current;
      
      const scheduledBatches = currentBatches.filter(
        batch => batch.status === 'scheduled' && batch.scheduled_at
      );

      for (const batch of scheduledBatches) {
        // Pular se já está sendo processado
        if (processingRef.current.has(batch.id)) {
          console.log(`[Scheduler] Batch #${batch.block_number} já está sendo processado, pulando...`);
          continue;
        }

        const scheduledTime = new Date(batch.scheduled_at!);
        
        if (now >= scheduledTime) {
          // Marcar como em processamento ANTES de qualquer operação
          processingRef.current.add(batch.id);
          console.log(`[Scheduler] Iniciando processamento do batch #${batch.block_number}`);

          try {
            await updateBatch(batch.id, { status: 'sending' });

            // 1. Verificar limite diário (SEM incrementar)
            const limitCheck = await checkDailyLimit(batch.contacts.length);
            
            if (!limitCheck.allowed) {
              const remaining = limitCheck.limit - limitCheck.used_today;
              throw new Error(
                `Limite diário insuficiente. Você tem ${remaining} disparos restantes, mas está tentando enviar ${batch.contacts.length} contatos.`
              );
            }

            // 2. Obter dados do batch
            const batchSheetMeta = batch.sheet_meta;
            const batchMapping = batch.column_mapping;

            if (!batchSheetMeta || !batchMapping) {
              throw new Error('Dados de mapeamento não encontrados no batch');
            }
            
            const campaign = campaignsRef.current.find(c => c.id === batch.campaign_id);
            if (!campaign) {
              throw new Error('Campanha não encontrada');
            }

            // 3. Tentar enviar
            const response = await sendToWebhook(
              batch,
              batchMapping,
              batchSheetMeta,
              campaign,
              settingsRef.current?.webhook_url || ''
            );

            if (response.success) {
              // 4. SÓ CONFIRMA disparo se envio foi bem-sucedido
              await confirmDailyDispatch(batch.contacts.length);
              
              await updateBatch(batch.id, { status: 'sent' });
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
              
              console.log(`[Scheduler] Batch #${batch.block_number} enviado com sucesso`);
            } else {
              throw new Error(response.error || 'Erro ao enviar');
            }
          } catch (error) {
            await updateBatch(batch.id, { status: 'error' });
            await addHistoryItem({
              block_number: batch.block_number,
              contacts_count: batch.contacts.length,
              status: 'error',
              error_message: error instanceof Error ? error.message : 'Erro desconhecido',
            });

            toast({
              title: 'Erro no envio agendado',
              description: `Falha ao enviar bloco #${batch.block_number}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
              variant: 'destructive',
            });
            
            console.error(`[Scheduler] Erro no batch #${batch.block_number}:`, error);
          } finally {
            // Remover do set de processamento
            processingRef.current.delete(batch.id);
          }
        }
      }
    };

    // Iniciar intervalo apenas uma vez
    intervalRef.current = setInterval(checkScheduledBatches, 30000);
    checkScheduledBatches();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  // Dependências mínimas - funções estáveis apenas
  }, [updateBatch, addHistoryItem, incrementStats, checkDailyLimit, confirmDailyDispatch]);
};
