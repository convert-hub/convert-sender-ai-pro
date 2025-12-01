-- Drop função antiga
DROP FUNCTION IF EXISTS check_and_update_daily_limit(uuid, integer);

-- Função 1: APENAS VERIFICA (não incrementa)
CREATE OR REPLACE FUNCTION check_daily_limit(_user_id uuid, _contacts_to_send integer)
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _settings RECORD;
BEGIN
  -- Buscar configurações do usuário
  SELECT * INTO _settings FROM user_settings WHERE user_id = _user_id;
  
  IF _settings IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'User settings not found',
      'remaining', 0,
      'limit', 0,
      'used_today', 0
    );
  END IF;
  
  -- Reset se for novo dia
  IF _settings.last_dispatch_date < CURRENT_DATE THEN
    UPDATE user_settings 
    SET dispatches_today = 0, 
        last_dispatch_date = CURRENT_DATE
    WHERE user_id = _user_id;
    _settings.dispatches_today := 0;
  END IF;
  
  -- APENAS RETORNA o status, sem incrementar
  RETURN jsonb_build_object(
    'allowed', (_settings.dispatches_today + _contacts_to_send) <= _settings.daily_dispatch_limit,
    'remaining', _settings.daily_dispatch_limit - _settings.dispatches_today,
    'limit', _settings.daily_dispatch_limit,
    'used_today', _settings.dispatches_today
  );
END;
$$;

-- Função 2: CONFIRMA o disparo (incrementa após sucesso)
CREATE OR REPLACE FUNCTION confirm_daily_dispatch(_user_id uuid, _contacts_sent integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE user_settings 
  SET dispatches_today = dispatches_today + _contacts_sent
  WHERE user_id = _user_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Adicionar colunas na tabela batches para persistir dados de mapeamento
ALTER TABLE batches ADD COLUMN IF NOT EXISTS sheet_meta jsonb;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS column_mapping jsonb;

-- Resetar contador do usuário afetado
UPDATE user_settings 
SET dispatches_today = 0 
WHERE user_id = '5e9fe915-761e-46d9-8ca8-4f22ba217b44';