-- Criar enum para status da conta
CREATE TYPE public.account_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Adicionar coluna account_status na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN account_status account_status NOT NULL DEFAULT 'pending';

-- Atualizar usuários existentes para 'approved' (para não bloquear contas já criadas)
UPDATE public.profiles SET account_status = 'approved';

-- Adicionar RLS policy para bloquear acesso de usuários não aprovados
CREATE POLICY "Only approved users can access their data"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = id AND account_status = 'approved') OR
  has_role(auth.uid(), 'admin')
);

-- Atualizar policy de update para permitir apenas usuários aprovados ou admins
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Approved users can update their own profile"
ON public.profiles
FOR UPDATE
USING (
  (auth.uid() = id AND account_status = 'approved') OR
  has_role(auth.uid(), 'admin')
);