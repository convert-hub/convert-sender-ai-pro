-- Part 1: Update RLS policies for campaign_templates (Admin-Only)

-- Drop existing policies that allow users to create/edit/delete templates
DROP POLICY IF EXISTS "Users can create their own templates" ON campaign_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON campaign_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON campaign_templates;

-- New policy: Only admins can create templates
CREATE POLICY "Only admins can create templates"
ON campaign_templates
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- New policy: Only admins can update templates
CREATE POLICY "Only admins can update templates"
ON campaign_templates
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- New policy: Only admins can delete templates
CREATE POLICY "Only admins can delete templates"
ON campaign_templates
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Keep existing SELECT policy (all users can view their templates + global templates)
-- "Users can view their own templates and global templates" already exists

-- Part 2: Add daily dispatch limit columns to user_settings

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS daily_dispatch_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS dispatches_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_dispatch_date DATE DEFAULT CURRENT_DATE;

-- Part 3: Create function to check and update daily dispatch limit

CREATE OR REPLACE FUNCTION check_and_update_daily_limit(
  _user_id UUID,
  _contacts_to_send INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _settings RECORD;
  _result JSONB;
BEGIN
  -- Fetch user settings
  SELECT * INTO _settings
  FROM user_settings
  WHERE user_id = _user_id;
  
  -- If no settings found, return error
  IF _settings IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'User settings not found',
      'remaining', 0,
      'limit', 0,
      'used_today', 0
    );
  END IF;
  
  -- Reset counter if it's a new day
  IF _settings.last_dispatch_date < CURRENT_DATE THEN
    UPDATE user_settings
    SET dispatches_today = 0,
        last_dispatch_date = CURRENT_DATE
    WHERE user_id = _user_id;
    
    _settings.dispatches_today := 0;
  END IF;
  
  -- Check if exceeds limit
  IF (_settings.dispatches_today + _contacts_to_send) > _settings.daily_dispatch_limit THEN
    _result := jsonb_build_object(
      'allowed', false,
      'remaining', _settings.daily_dispatch_limit - _settings.dispatches_today,
      'limit', _settings.daily_dispatch_limit,
      'used_today', _settings.dispatches_today
    );
  ELSE
    -- Increment counter
    UPDATE user_settings
    SET dispatches_today = dispatches_today + _contacts_to_send
    WHERE user_id = _user_id;
    
    _result := jsonb_build_object(
      'allowed', true,
      'remaining', _settings.daily_dispatch_limit - _settings.dispatches_today - _contacts_to_send,
      'limit', _settings.daily_dispatch_limit,
      'used_today', _settings.dispatches_today + _contacts_to_send
    );
  END IF;
  
  RETURN _result;
END;
$$;