-- Drop existing update policy for regular users
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;

-- Allow only admins to update user settings (including webhook)
CREATE POLICY "Admins can update user settings"
ON public.user_settings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all user settings
CREATE POLICY "Admins can view all settings"
ON public.user_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));