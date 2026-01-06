-- Add UAZAPI fields to user_settings table for WhatsApp connection management
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS uazapi_instance_name TEXT,
ADD COLUMN IF NOT EXISTS uazapi_instance_token TEXT,
ADD COLUMN IF NOT EXISTS uazapi_connection_status TEXT DEFAULT 'disconnected',
ADD COLUMN IF NOT EXISTS uazapi_connected_phone TEXT,
ADD COLUMN IF NOT EXISTS uazapi_last_checked TIMESTAMPTZ;

-- Add constraint for valid connection status values
ALTER TABLE user_settings 
ADD CONSTRAINT uazapi_connection_status_check 
CHECK (uazapi_connection_status IS NULL OR uazapi_connection_status IN ('disconnected', 'connecting', 'connected'));

-- Add comments for documentation
COMMENT ON COLUMN user_settings.uazapi_instance_name IS 'Nome da instância UAZAPI (ex: wpp_empresa)';
COMMENT ON COLUMN user_settings.uazapi_instance_token IS 'Token da instância para operações com UAZAPI';
COMMENT ON COLUMN user_settings.uazapi_connection_status IS 'Status: disconnected, connecting, connected';
COMMENT ON COLUMN user_settings.uazapi_connected_phone IS 'Número de telefone conectado ao WhatsApp';
COMMENT ON COLUMN user_settings.uazapi_last_checked IS 'Última verificação de status da conexão';