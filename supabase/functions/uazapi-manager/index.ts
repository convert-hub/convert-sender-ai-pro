import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'create-instance' | 'get-qrcode' | 'check-status' | 'disconnect' | 'delete-instance';
  instanceName?: string;
}

// Headers para endpoints ADMINISTRATIVOS (create instance, delete global)
const buildAdminHeaders = (adminToken: string, withJson = false) => ({
  Accept: 'application/json',
  ...(withJson ? { 'Content-Type': 'application/json' } : {}),
  admintoken: adminToken,
});

// Headers para endpoints REGULARES da instância (connect, status, disconnect)
const buildInstanceHeaders = (instanceToken: string, withJson = false) => ({
  Accept: 'application/json',
  ...(withJson ? { 'Content-Type': 'application/json' } : {}),
  token: instanceToken,
});

const readJsonSafe = async (resp: Response): Promise<any> => {
  const text = await resp.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const pickUazapiError = (payload: any) =>
  payload?.message || payload?.error || payload?.msg || payload?.detail || payload?.raw || null;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const uazapiBaseUrl = Deno.env.get('UAZAPI_BASE_URL')!;
    const uazapiAdminToken = Deno.env.get('UAZAPI_ADMIN_TOKEN')!;

    if (!uazapiBaseUrl || !uazapiAdminToken) {
      console.error('[uazapi-manager] Missing UAZAPI env vars');
      return new Response(JSON.stringify({ error: 'UAZAPI não configurado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate JWT using signing-keys compatible method
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const jwt = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(jwt);

    if (claimsError || !claimsData?.claims?.sub) {
      console.error('[uazapi-manager] Claims error:', claimsError);
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims as any)?.email || '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { action } = body;

    console.log(`[uazapi-manager] Action: ${action}, User: ${userId}`);

    const { data: userSettings, error: settingsError } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settingsError) {
      console.error('[uazapi-manager] Settings error:', settingsError);
      return new Response(JSON.stringify({ error: 'Configurações não encontradas' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'create-instance': {
        const { instanceName } = body;

        if (!instanceName) {
          return new Response(JSON.stringify({ error: 'Nome da instância é obrigatório' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!/^[a-zA-Z0-9_-]{3,50}$/.test(instanceName)) {
          return new Response(
            JSON.stringify({ error: 'Nome inválido. Use apenas letras, números, - e _ (3-50 caracteres)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (userSettings.uazapi_instance_name) {
          return new Response(JSON.stringify({ error: 'Você já possui uma instância criada' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`[uazapi-manager] Creating instance: ${instanceName}`);

        const createResponse = await fetch(`${uazapiBaseUrl}/instance/init`, {
          method: 'POST',
          headers: buildAdminHeaders(uazapiAdminToken, true),
          body: JSON.stringify({
            name: instanceName,
            systemName: 'convert-sender',
            adminField01: userId,
            adminField02: userEmail,
            fingerprintProfile: 'chrome',
            browser: 'chrome',
          }),
        });

        const createData = await readJsonSafe(createResponse);
        console.log('[uazapi-manager] Create status:', createResponse.status);
        console.log('[uazapi-manager] Create response:', JSON.stringify(createData));

        if (!createResponse.ok) {
          const msg = pickUazapiError(createData) || 'Erro ao criar instância';
          return new Response(
            JSON.stringify({
              error: msg,
              uazapi_status: createResponse.status,
            }),
            {
              status: createResponse.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const instanceToken = createData?.token || createData?.instance?.token || createData?.apikey;

        if (!instanceToken) {
          console.error('[uazapi-manager] No token in response:', createData);
          return new Response(JSON.stringify({ error: 'Token não retornado pela UAZAPI' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error: updateError } = await supabaseAdmin
          .from('user_settings')
          .update({
            uazapi_instance_name: instanceName,
            uazapi_instance_token: instanceToken,
            uazapi_connection_status: 'disconnected',
            uazapi_last_checked: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('[uazapi-manager] Update error:', updateError);
          return new Response(JSON.stringify({ error: 'Erro ao salvar configurações' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            instanceName,
            message: 'Instância criada com sucesso',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-qrcode': {
        const instanceToken = userSettings.uazapi_instance_token;

        if (!instanceToken || !userSettings.uazapi_instance_name) {
          return new Response(JSON.stringify({ error: 'Instância não configurada' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`[uazapi-manager] Getting QR code for: ${userSettings.uazapi_instance_name}`);

        const qrResponse = await fetch(`${uazapiBaseUrl}/instance/connect`, {
          method: 'POST',
          headers: buildInstanceHeaders(instanceToken, true),
          body: JSON.stringify({}),
        });

        const qrData = await readJsonSafe(qrResponse);
        console.log('[uazapi-manager] QR status:', qrResponse.status);

        if (!qrResponse.ok) {
          const msg = pickUazapiError(qrData) || 'Erro ao gerar QR Code';
          return new Response(JSON.stringify({ error: msg, uazapi_status: qrResponse.status }), {
            status: qrResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await supabaseAdmin
          .from('user_settings')
          .update({
            uazapi_connection_status: 'connecting',
            uazapi_last_checked: new Date().toISOString(),
          })
          .eq('user_id', userId);

        return new Response(
          JSON.stringify({
            success: true,
            qrcode: qrData.qrcode || qrData.base64 || qrData.qr || qrData,
            instanceName: userSettings.uazapi_instance_name,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'check-status': {
        const instanceToken = userSettings.uazapi_instance_token;

        if (!instanceToken) {
          return new Response(JSON.stringify({ status: 'no-instance', connected: false }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`[uazapi-manager] Checking status for: ${userSettings.uazapi_instance_name}`);

        const statusResponse = await fetch(`${uazapiBaseUrl}/instance/status`, {
          method: 'GET',
          headers: buildInstanceHeaders(instanceToken),
        });

        const statusData = await readJsonSafe(statusResponse);
        console.log('[uazapi-manager] Status response:', JSON.stringify(statusData));

        const isConnected =
          statusData.connected === true ||
          statusData.status === 'connected' ||
          statusData.state === 'open' ||
          statusData.state === 'connected';

        const connectedPhone = statusData.phone || statusData.me?.id || statusData.jid || null;
        const newStatus = isConnected ? 'connected' : 'disconnected';

        await supabaseAdmin
          .from('user_settings')
          .update({
            uazapi_connection_status: newStatus,
            uazapi_connected_phone: isConnected ? connectedPhone : null,
            uazapi_last_checked: new Date().toISOString(),
          })
          .eq('user_id', userId);

        return new Response(
          JSON.stringify({
            success: true,
            status: newStatus,
            connected: isConnected,
            phone: connectedPhone,
            instanceName: userSettings.uazapi_instance_name,
            raw: statusData,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'disconnect': {
        const instanceToken = userSettings.uazapi_instance_token;

        if (!instanceToken) {
          return new Response(JSON.stringify({ error: 'Instância não configurada' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`[uazapi-manager] Disconnecting: ${userSettings.uazapi_instance_name}`);

        const disconnectResponse = await fetch(`${uazapiBaseUrl}/instance/disconnect`, {
          method: 'POST',
          headers: buildInstanceHeaders(instanceToken),
        });

        const disconnectData = await readJsonSafe(disconnectResponse);
        console.log('[uazapi-manager] Disconnect status:', disconnectResponse.status);
        console.log('[uazapi-manager] Disconnect response:', JSON.stringify(disconnectData));

        await supabaseAdmin
          .from('user_settings')
          .update({
            uazapi_connection_status: 'disconnected',
            uazapi_connected_phone: null,
            uazapi_last_checked: new Date().toISOString(),
          })
          .eq('user_id', userId);

        return new Response(JSON.stringify({ success: true, message: 'Desconectado com sucesso' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete-instance': {
        const instanceToken = userSettings.uazapi_instance_token;

        if (!instanceToken) {
          return new Response(JSON.stringify({ error: 'Instância não configurada' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`[uazapi-manager] Deleting: ${userSettings.uazapi_instance_name}`);

        const deleteResponse = await fetch(`${uazapiBaseUrl}/instance`, {
          method: 'DELETE',
          headers: buildInstanceHeaders(instanceToken),
        });

        const deleteData = await readJsonSafe(deleteResponse);
        console.log('[uazapi-manager] Delete status:', deleteResponse.status);
        console.log('[uazapi-manager] Delete response:', JSON.stringify(deleteData));

        await supabaseAdmin
          .from('user_settings')
          .update({
            uazapi_instance_name: null,
            uazapi_instance_token: null,
            uazapi_connection_status: 'disconnected',
            uazapi_connected_phone: null,
            uazapi_last_checked: null,
          })
          .eq('user_id', userId);

        return new Response(JSON.stringify({ success: true, message: 'Instância deletada com sucesso' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[uazapi-manager] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
