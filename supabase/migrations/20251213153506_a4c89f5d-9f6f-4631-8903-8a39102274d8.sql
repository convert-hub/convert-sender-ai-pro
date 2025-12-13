-- Atualizar policy de system_settings para exigir autenticação
DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;
CREATE POLICY "Authenticated users can view system settings" 
ON public.system_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Atualizar policy de campaign_templates para exigir autenticação
DROP POLICY IF EXISTS "Users can view their own templates and global templates" ON public.campaign_templates;
CREATE POLICY "Authenticated users can view their own templates and global templates" 
ON public.campaign_templates
FOR SELECT
USING (auth.uid() IS NOT NULL AND ((auth.uid() = user_id) OR (is_global = true)));