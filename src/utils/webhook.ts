import { WebhookPayload, BatchInfo, ColumnMapping, SheetMeta, Campaign } from '@/types/dispatch';

export { testWebhook } from './webhookTest';

export const sendToWebhook = async (
  batch: BatchInfo,
  mapping: ColumnMapping,
  sheetMeta: SheetMeta,
  campaign: Campaign,
  webhookUrl: string
): Promise<{ success: boolean; status?: number; error?: string }> => {
  const payload: WebhookPayload = {
    source: 'lovable-disparos',
    campaign: {
      id: campaign.id,
      name: campaign.name,
      objective: campaign.objective,
      ai_instructions: campaign.ai_instructions,
    },
    sheet_meta: sheetMeta,
    mapping: {
      name: mapping.name,
      email: mapping.email,
      phone: mapping.phone,
      extras: mapping.extras,
    },
    batch: {
      block_number: batch.block_number,
      block_size: batch.block_size,
      range: batch.range,
    },
    contacts: batch.contacts,
  };

  try {
    // Primeira tentativa: requisição normal com CORS
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        status: response.status,
        error: `Erro ${response.status}: ${errorText}`,
      };
    }

    return {
      success: true,
      status: response.status,
    };
  } catch (error) {
    // Se falhar por CORS, tenta com modo no-cors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        // Com no-cors, não conseguimos ler a resposta, mas assumimos sucesso se não houver erro
        return {
          success: true,
          status: 200,
        };
      } catch (noCorsError) {
        return {
          success: false,
          error: 'Erro de CORS: O webhook do n8n precisa permitir requisições do domínio Lovable. Configure CORS no n8n ou use um proxy.',
        };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao enviar',
    };
  }
};
