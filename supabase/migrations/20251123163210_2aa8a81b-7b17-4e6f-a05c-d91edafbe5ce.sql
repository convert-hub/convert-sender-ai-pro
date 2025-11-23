-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT,
  description TEXT,
  ai_instructions JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
CREATE POLICY "Users can view their own campaigns"
  ON public.campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
  ON public.campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
  ON public.campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- Create campaign_templates table
CREATE TABLE public.campaign_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ai_instructions JSONB NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT true,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_templates
CREATE POLICY "Users can view their own templates and global templates"
  ON public.campaign_templates FOR SELECT
  USING (auth.uid() = user_id OR is_global = true);

CREATE POLICY "Users can create their own templates"
  ON public.campaign_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_global = false);

CREATE POLICY "Users can update their own templates"
  ON public.campaign_templates FOR UPDATE
  USING (auth.uid() = user_id AND is_global = false);

CREATE POLICY "Users can delete their own templates"
  ON public.campaign_templates FOR DELETE
  USING (auth.uid() = user_id AND is_global = false);

-- Create batches table
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  block_number INTEGER NOT NULL,
  block_size INTEGER NOT NULL,
  range_start INTEGER NOT NULL,
  range_end INTEGER NOT NULL,
  contacts JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'sending', 'sent', 'error', 'scheduled')),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for batches
CREATE POLICY "Users can view their own batches"
  ON public.batches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own batches"
  ON public.batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batches"
  ON public.batches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own batches"
  ON public.batches FOR DELETE
  USING (auth.uid() = user_id);

-- Create dispatch_history table
CREATE TABLE public.dispatch_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  block_number INTEGER NOT NULL,
  contacts_count INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  response_status INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dispatch_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dispatch_history
CREATE POLICY "Users can view their own history"
  ON public.dispatch_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own history"
  ON public.dispatch_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create user_settings table
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  webhook_url TEXT,
  stats JSONB DEFAULT '{
    "uploads_total": 0,
    "rows_total": 0,
    "rows_valid": 0,
    "rows_invalid": 0,
    "batches_total": 0,
    "batches_sent": 0
  }',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  
  -- Insert default user settings
  INSERT INTO public.user_settings (user_id, webhook_url)
  VALUES (
    NEW.id,
    'https://n8n.converthub.com.br/webhook/disparos-precatorizei'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile and settings on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert default global templates
INSERT INTO public.campaign_templates (user_id, name, description, ai_instructions, is_custom, is_global) VALUES
  (
    NULL,
    'Captação de Clientes',
    'Template para primeiros contatos de captação',
    '{"identidade": "Representante comercial da empresa", "objetivo": "Apresentar serviços e identificar interesse", "tom_estilo": "Profissional e consultivo", "cta": "Agendar uma conversa", "restricoes": "Não fazer promessas de resultados, não ser invasivo"}',
    false,
    true
  ),
  (
    NULL,
    'Relacionamento com Clientes',
    'Template para clientes já existentes',
    '{"identidade": "Gerente de relacionamento", "objetivo": "Manter contato e identificar novas oportunidades", "tom_estilo": "Amigável e próximo", "cta": "Conversar sobre como podemos ajudar", "restricoes": "Não ser repetitivo, não forçar venda"}',
    false,
    true
  ),
  (
    NULL,
    'Reativação de Leads',
    'Template para reativar contatos inativos',
    '{"identidade": "Consultor da empresa", "objetivo": "Reengajar leads que não responderam anteriormente", "tom_estilo": "Educado e interessado", "cta": "Descobrir se ainda há interesse", "restricoes": "Não ser insistente, respeitar desinteresse"}',
    false,
    true
  );