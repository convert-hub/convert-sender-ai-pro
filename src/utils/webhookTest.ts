export const testWebhook = async (
  url: string
): Promise<{ success: boolean; latency?: number; error?: string }> => {
  const testPayload = {
    source: 'lovable-disparos-test',
    test: true,
    timestamp: new Date().toISOString(),
  };

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        error: `Erro ${response.status}: Webhook retornou status inválido`,
      };
    }

    return {
      success: true,
      latency,
    };
  } catch (error) {
    // Tenta com no-cors se falhar
    if (error instanceof TypeError && error.message.includes('fetch')) {
      try {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testPayload),
        });

        const latency = Date.now() - startTime;

        return {
          success: true,
          latency,
        };
      } catch (noCorsError) {
        return {
          success: false,
          error: 'Erro de CORS: O webhook não permite requisições deste domínio',
        };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao testar webhook',
    };
  }
};
