import { WebhookPayload, BatchInfo, ColumnMapping, SheetMeta } from '@/types/dispatch';

const WEBHOOK_URL = 'https://n8n.converthub.com.br/webhook/disparos-precatorizei';

export const sendToWebhook = async (
  batch: BatchInfo,
  mapping: ColumnMapping,
  sheetMeta: SheetMeta
): Promise<{ success: boolean; status?: number; error?: string }> => {
  const payload: WebhookPayload = {
    source: 'lovable-disparos',
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
    const response = await fetch(WEBHOOK_URL, {
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao enviar',
    };
  }
};
