import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  QrCode, 
  RefreshCw, 
  Check,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface UazapiSettings {
  uazapi_instance_name: string | null;
  uazapi_connection_status: string | null;
  uazapi_connected_phone: string | null;
  uazapi_last_checked: string | null;
}

type ConnectionState = 'loading' | 'no-instance' | 'disconnected' | 'awaiting-qr' | 'connected';

const validateInstanceName = (name: string): string | null => {
  if (!name) return 'Nome é obrigatório';
  if (name.length < 3) return 'Mínimo 3 caracteres';
  if (name.length > 24) return 'Máximo 24 caracteres';
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) return 'Apenas letras, números, _ e -';
  return null;
};

const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    const ddd = cleaned.slice(2, 4);
    const part1 = cleaned.slice(4, 9);
    const part2 = cleaned.slice(9, 13);
    return `+55 ${ddd} ${part1}-${part2}`;
  }
  return phone;
};

export const HomeWhatsAppStatus = () => {
  const { user } = useAuth();
  const [instanceName, setInstanceName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UazapiSettings | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartRef = useRef<number | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('uazapi_instance_name, uazapi_connection_status, uazapi_connected_phone, uazapi_last_checked')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data);
        
        if (!data.uazapi_instance_name) {
          setConnectionState('no-instance');
        } else if (data.uazapi_connection_status === 'connected') {
          setConnectionState('connected');
          setQrCode(null);
        } else {
          setConnectionState('disconnected');
        }
      } else {
        setConnectionState('no-instance');
      }
    } catch (error) {
      console.error('Error fetching UAZAPI settings:', error);
      setConnectionState('no-instance');
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchSettings]);

  const callUazapiManager = async (action: string, data?: Record<string, unknown>) => {
    const { data: response, error } = await supabase.functions.invoke('uazapi-manager', {
      body: { action, ...data },
    });

    if (error) throw error;
    return response;
  };

  const handleCreateInstance = async () => {
    const error = validateInstanceName(instanceName);
    if (error) {
      setNameError(error);
      return;
    }

    setActionLoading('create');
    try {
      await callUazapiManager('create-instance', { instanceName });
      
      toast({
        title: 'Instância criada!',
        description: 'Agora conecte seu WhatsApp',
      });
      
      await fetchSettings();
      handleGetQrCode();
    } catch (error) {
      console.error('Error creating instance:', error);
      toast({
        title: 'Erro ao criar instância',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleGetQrCode = async () => {
    setActionLoading('qr');
    try {
      const response = await callUazapiManager('get-qrcode');
      
      if (response.qrcode) {
        setQrCode(response.qrcode);
        setConnectionState('awaiting-qr');
        startPolling();
      } else if (response.status === 'connected') {
        setConnectionState('connected');
        await fetchSettings();
      }
    } catch (error) {
      console.error('Error getting QR code:', error);
      toast({
        title: 'Erro ao obter QR Code',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    pollingStartRef.current = Date.now();
    
    pollingRef.current = setInterval(async () => {
      const elapsed = Date.now() - (pollingStartRef.current || 0);
      if (elapsed > 120000) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        toast({
          title: 'Tempo esgotado',
          description: 'O QR Code expirou. Gere um novo.',
          variant: 'destructive',
        });
        setQrCode(null);
        setConnectionState('disconnected');
        return;
      }

      try {
        const response = await callUazapiManager('check-status');
        
        if (response.status === 'connected') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setQrCode(null);
          setConnectionState('connected');
          await fetchSettings();
          
          toast({
            title: 'WhatsApp conectado!',
            description: 'Seu número foi vinculado com sucesso',
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);
  };

  const handleNameChange = (value: string) => {
    setInstanceName(value);
    if (value) {
      setNameError(validateInstanceName(value));
    } else {
      setNameError(null);
    }
  };

  if (connectionState === 'loading') {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Not connected - prominent warning
  if (connectionState === 'no-instance' || connectionState === 'disconnected') {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-destructive">
            <WifiOff className="h-5 w-5" />
            WhatsApp Desconectado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Conecte seu número para começar a enviar mensagens
          </p>
          
          {connectionState === 'no-instance' ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Input
                  placeholder="Nome da instância (ex: minha-empresa)"
                  value={instanceName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={actionLoading === 'create'}
                />
                {nameError && (
                  <p className="text-xs text-destructive">{nameError}</p>
                )}
              </div>
              <Button 
                onClick={handleCreateInstance}
                disabled={!!nameError || !instanceName || actionLoading === 'create'}
                className="w-full"
              >
                {actionLoading === 'create' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Criar e Conectar
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleGetQrCode}
              disabled={actionLoading === 'qr'}
              className="w-full"
            >
              {actionLoading === 'qr' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando QR Code...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Conectar WhatsApp
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Awaiting QR scan
  if (connectionState === 'awaiting-qr' && qrCode) {
    return (
      <Card className="border-warning/50 bg-warning/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Escaneie o QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-lg">
              <img 
                src={qrCode} 
                alt="QR Code WhatsApp" 
                className="w-48 h-48"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Abra o WhatsApp no seu celular e escaneie o código
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Aguardando conexão...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Connected - subtle success state
  return (
    <Card className="border-success/30 bg-success/5">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
              <Wifi className="h-5 w-5 text-success" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">WhatsApp Conectado</span>
                <Badge variant="outline" className="text-success border-success/30">
                  <Check className="mr-1 h-3 w-3" />
                  Online
                </Badge>
              </div>
              {settings?.uazapi_connected_phone && (
                <p className="text-sm text-muted-foreground">
                  {formatPhoneNumber(settings.uazapi_connected_phone)}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = '/settings'}
          >
            Gerenciar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};