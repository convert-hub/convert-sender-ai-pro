import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'create-instance' | 'get-qrcode' | 'check-status' | 'disconnect' | 'delete-instance';
  instanceName?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const uazapiBaseUrl = Deno.env.get('UAZAPI_BASE_URL')!;
    const uazapiAdminToken = Deno.env.get('UAZAPI_ADMIN_TOKEN')!;

    // Validate required env vars
    if (!uazapiBaseUrl || !uazapiAdminToken) {
      console.error('Missing UAZAPI environment variables');
      return new Response(
        JSON.stringify({ error: 'UAZAPI não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    const { action } = body;

    console.log(`[uazapi-manager] Action: ${action}, User: ${user.id}`);

    // Get user settings
    const { data: userSettings, error: settingsError } = await supabaseClient
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (settingsError) {
      console.error('Settings error:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Configurações não encontradas' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'create-instance': {
        const { instanceName } = body;
        
        if (!instanceName) {
          return new Response(
            JSON.stringify({ error: 'Nome da instância é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate instance name
        if (!/^[a-zA-Z0-9_-]{3,50}$/.test(instanceName)) {
          return new Response(
            JSON.stringify({ error: 'Nome inválido. Use apenas letras, números, - e _ (3-50 caracteres)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if user already has an instance
        if (userSettings.uazapi_instance_name) {
          return new Response(
            JSON.stringify({ error: 'Você já possui uma instância criada' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[uazapi-manager] Creating instance: ${instanceName}`);

        // Create instance via UAZAPI
        const createResponse = await fetch(`${uazapiBaseUrl}/instance/init`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'token': uazapiAdminToken,
          },
          body: JSON.stringify({
            name: instanceName,
            systemName: 'convert-sender',
            adminField01: user.id,
            adminField02: user.email || '',
            fingerprintProfile: 'chrome',
            browser: 'chrome',
          }),
        });

        const createData = await createResponse.json();
        console.log('[uazapi-manager] Create response:', JSON.stringify(createData));

        if (!createResponse.ok) {
          return new Response(
            JSON.stringify({ error: createData.message || 'Erro ao criar instância' }),
            { status: createResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Extract token from response (adjust based on actual UAZAPI response format)
        const instanceToken = createData.token || createData.instance?.token || createData.apikey;

        if (!instanceToken) {
          console.error('[uazapi-manager] No token in response:', createData);
          return new Response(
            JSON.stringify({ error: 'Token não retornado pela UAZAPI' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Save instance info to user settings
        const { error: updateError } = await supabaseClient
          .from('user_settings')
          .update({
            uazapi_instance_name: instanceName,
            uazapi_instance_token: instanceToken,
            uazapi_connection_status: 'disconnected',
            uazapi_last_checked: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('[uazapi-manager] Update error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Erro ao salvar configurações' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            instanceName,
            message: 'Instância criada com sucesso' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-qrcode': {
        const instanceToken = userSettings.uazapi_instance_token;
        
        if (!instanceToken || !userSettings.uazapi_instance_name) {
          return new Response(
            JSON.stringify({ error: 'Instância não configurada' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[uazapi-manager] Getting QR code for: ${userSettings.uazapi_instance_name}`);

        // Request QR code (without phone field to generate QR)
        const qrResponse = await fetch(`${uazapiBaseUrl}/instance/connect`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify({}),
        });

        const qrData = await qrResponse.json();
        console.log('[uazapi-manager] QR response status:', qrResponse.status);

        if (!qrResponse.ok) {
          return new Response(
            JSON.stringify({ error: qrData.message || 'Erro ao gerar QR Code' }),
            { status: qrResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update status to connecting
        await supabaseClient
          .from('user_settings')
          .update({
            uazapi_connection_status: 'connecting',
            uazapi_last_checked: new Date().toISOString(),
          })
          .eq('user_id', user.id);

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
          return new Response(
            JSON.stringify({ 
              status: 'no-instance',
              connected: false,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[uazapi-manager] Checking status for: ${userSettings.uazapi_instance_name}`);

        const statusResponse = await fetch(`${uazapiBaseUrl}/instance/status`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'token': instanceToken,
          },
        });

        const statusData = await statusResponse.json();
        console.log('[uazapi-manager] Status response:', JSON.stringify(statusData));

        // Determine connection status based on UAZAPI response
        const isConnected = statusData.connected === true || 
                           statusData.status === 'connected' || 
                           statusData.state === 'open' ||
                           statusData.state === 'connected';
        
        const connectedPhone = statusData.phone || statusData.me?.id || statusData.jid || null;
        const newStatus = isConnected ? 'connected' : 'disconnected';

        // Update user settings with current status
        await supabaseClient
          .from('user_settings')
          .update({
            uazapi_connection_status: newStatus,
            uazapi_connected_phone: isConnected ? connectedPhone : null,
            uazapi_last_checked: new Date().toISOString(),
          })
          .eq('user_id', user.id);

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
          return new Response(
            JSON.stringify({ error: 'Instância não configurada' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[uazapi-manager] Disconnecting: ${userSettings.uazapi_instance_name}`);

        const disconnectResponse = await fetch(`${uazapiBaseUrl}/instance/disconnect`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'token': instanceToken,
          },
        });

        const disconnectData = await disconnectResponse.json();
        console.log('[uazapi-manager] Disconnect response:', JSON.stringify(disconnectData));

        // Update status
        await supabaseClient
          .from('user_settings')
          .update({
            uazapi_connection_status: 'disconnected',
            uazapi_connected_phone: null,
            uazapi_last_checked: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Desconectado com sucesso',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-instance': {
        const instanceToken = userSettings.uazapi_instance_token;
        
        if (!instanceToken) {
          return new Response(
            JSON.stringify({ error: 'Instância não configurada' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[uazapi-manager] Deleting: ${userSettings.uazapi_instance_name}`);

        const deleteResponse = await fetch(`${uazapiBaseUrl}/instance`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'token': instanceToken,
          },
        });

        const deleteData = await deleteResponse.json();
        console.log('[uazapi-manager] Delete response:', JSON.stringify(deleteData));

        // Clear all UAZAPI fields
        await supabaseClient
          .from('user_settings')
          .update({
            uazapi_instance_name: null,
            uazapi_instance_token: null,
            uazapi_connection_status: 'disconnected',
            uazapi_connected_phone: null,
            uazapi_last_checked: null,
          })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Instância deletada com sucesso',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[uazapi-manager] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
