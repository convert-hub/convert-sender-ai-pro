import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Smartphone, 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Trash2, 
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UazapiSettings {
  uazapi_instance_name: string | null;
  uazapi_connection_status: 'disconnected' | 'connecting' | 'connected';
  uazapi_connected_phone: string | null;
  uazapi_last_checked: string | null;
}

type ConnectionState = 'no-instance' | 'loading' | 'awaiting-qr' | 'connected' | 'disconnected' | 'error';

const validateInstanceName = (name: string): { valid: boolean; error?: string } => {
  if (!name) return { valid: false, error: 'Nome é obrigatório' };
  if (name.length < 3) return { valid: false, error: 'Mínimo 3 caracteres' };
  if (name.length > 50) return { valid: false, error: 'Máximo 50 caracteres' };
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) return { valid: false, error: 'Apenas letras, números, - e _' };
  if (name.includes(' ')) return { valid: false, error: 'Espaços não são permitidos' };
  return { valid: true };
};

const formatPhoneNumber = (phone: string | null): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    const ddd = cleaned.slice(2, 4);
    const part1 = cleaned.slice(4, 9);
    const part2 = cleaned.slice(9, 13);
    return `+55 ${ddd} ${part1}-${part2}`;
  }
  return cleaned;
};

export const WhatsAppConnection = () => {
  const { user } = useAuth();
  const [instanceName, setInstanceName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UazapiSettings | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartRef = useRef<number | null>(null);

  // Fetch initial settings
  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('uazapi_instance_name, uazapi_connection_status, uazapi_connected_phone, uazapi_last_checked')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const uazapiSettings: UazapiSettings = {
        uazapi_instance_name: data.uazapi_instance_name,
        uazapi_connection_status: (data.uazapi_connection_status as UazapiSettings['uazapi_connection_status']) || 'disconnected',
        uazapi_connected_phone: data.uazapi_connected_phone,
        uazapi_last_checked: data.uazapi_last_checked,
      };

      setSettings(uazapiSettings);

      // Determine connection state
      if (!uazapiSettings.uazapi_instance_name) {
        setConnectionState('no-instance');
      } else if (uazapiSettings.uazapi_connection_status === 'connected') {
        setConnectionState('connected');
      } else if (uazapiSettings.uazapi_connection_status === 'connecting') {
        setConnectionState('awaiting-qr');
      } else {
        setConnectionState('disconnected');
      }
    } catch (error) {
      console.error('Error fetching UAZAPI settings:', error);
      setConnectionState('error');
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Call edge function
  const callUazapiManager = async (action: string, extraData?: Record<string, unknown>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      throw new Error('Não autenticado');
    }

    const response = await supabase.functions.invoke('uazapi-manager', {
      body: { action, ...extraData },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Erro na operação');
    }

    return response.data;
  };

  // Connect (create or link automatically)
  const handleConnect = async () => {
    const validation = validateInstanceName(instanceName);
    if (!validation.valid) {
      setNameError(validation.error || 'Nome inválido');
      return;
    }

    setActionLoading('connect');
    setNameError(null);

    try {
      const result = await callUazapiManager('connect-or-create', { instanceName });
      
      if (result.success) {
        toast.success(result.isNew ? 'Instância criada!' : 'Instância vinculada!', {
          description: result.connected ? 'WhatsApp já está conectado' : 'Agora conecte seu WhatsApp',
        });
        await fetchSettings();
        
        // Se já está conectado, não precisa de QR
        if (!result.connected) {
          await handleGetQrCode();
        }
      } else {
        throw new Error(result.error || 'Erro ao conectar');
      }
    } catch (error) {
      console.error('Error connecting:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao conectar');
    } finally {
      setActionLoading(null);
    }
  };

  // Get QR Code
  const handleGetQrCode = async () => {
    setActionLoading('qrcode');
    setConnectionState('awaiting-qr');

    try {
      const result = await callUazapiManager('get-qrcode');
      
      if (result.success && result.qrcode) {
        setQrCode(result.qrcode);
        startPolling();
        toast.success('QR Code gerado! Escaneie com seu WhatsApp.');
      } else {
        throw new Error(result.error || 'Erro ao gerar QR Code');
      }
    } catch (error) {
      console.error('Error getting QR code:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar QR Code');
      setConnectionState('disconnected');
    } finally {
      setActionLoading(null);
    }
  };

  // Start polling for connection status
  const startPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingStartRef.current = Date.now();
    const POLLING_INTERVAL = 3000;
    const POLLING_TIMEOUT = 120000;

    pollingRef.current = setInterval(async () => {
      if (pollingStartRef.current && Date.now() - pollingStartRef.current > POLLING_TIMEOUT) {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
        toast.warning('QR Code expirado. Gere um novo.');
        setQrCode(null);
        setConnectionState('disconnected');
        await fetchSettings();
        return;
      }

      try {
        const result = await callUazapiManager('check-status');
        
        if (result.connected) {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setQrCode(null);
          setConnectionState('connected');
          toast.success('WhatsApp conectado com sucesso!');
          await fetchSettings();
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, POLLING_INTERVAL);
  };

  // Check status manually
  const handleCheckStatus = async () => {
    setActionLoading('status');

    try {
      const result = await callUazapiManager('check-status');
      await fetchSettings();
      
      if (result.connected) {
        toast.success('WhatsApp está conectado');
      } else {
        toast.info('WhatsApp não está conectado');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('Erro ao verificar status');
    } finally {
      setActionLoading(null);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    setActionLoading('disconnect');

    try {
      const result = await callUazapiManager('disconnect');
      
      if (result.success) {
        toast.success('WhatsApp desconectado');
        await fetchSettings();
        setConnectionState('disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Erro ao desconectar');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete instance
  const handleDeleteInstance = async () => {
    setActionLoading('delete');

    try {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      const result = await callUazapiManager('delete-instance');
      
      if (result.success) {
        toast.success('Instância deletada');
        setQrCode(null);
        setInstanceName('');
        setConnectionState('no-instance');
        await fetchSettings();
      }
    } catch (error) {
      console.error('Error deleting instance:', error);
      toast.error('Erro ao deletar instância');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle input change with validation
  const handleNameChange = (value: string) => {
    setInstanceName(value);
    if (value) {
      const validation = validateInstanceName(value);
      setNameError(validation.valid ? null : validation.error || null);
    } else {
      setNameError(null);
    }
  };

  // Render loading state
  if (connectionState === 'loading' && !settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Conexão WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render no instance state
  if (connectionState === 'no-instance' && !settings?.uazapi_instance_name) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Conexão WhatsApp
          </CardTitle>
          <CardDescription>
            Conecte seu número de WhatsApp para enviar mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instance-name">Nome da Instância</Label>
            <Input
              id="instance-name"
              placeholder="minha-empresa"
              value={instanceName}
              onChange={(e) => handleNameChange(e.target.value)}
              className={nameError ? 'border-destructive' : ''}
            />
            {nameError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {nameError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Use apenas letras, números, - e _. Se a instância já existir, será vinculada automaticamente.
            </p>
          </div>

          <Button 
            onClick={handleConnect}
            disabled={actionLoading === 'connect' || !instanceName}
            className="w-full"
          >
            {actionLoading === 'connect' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Smartphone className="mr-2 h-4 w-4" />
                Conectar
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Render awaiting QR state
  if (connectionState === 'awaiting-qr') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Escaneie o QR Code
          </CardTitle>
          <CardDescription>
            Abra o WhatsApp no seu celular e escaneie o código
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {qrCode ? (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <img 
                  src={qrCode} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aguardando conexão...
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGetQrCode}
              disabled={actionLoading === 'qrcode'}
              className="flex-1"
            >
              {actionLoading === 'qrcode' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Novo QR Code
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deletar instância?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. A instância será removida permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteInstance}>
                    Deletar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render connected state
  if (connectionState === 'connected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-success" />
            WhatsApp Conectado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <div>
              <p className="font-medium">Conexão ativa</p>
              {settings?.uazapi_connected_phone && (
                <p className="text-sm text-muted-foreground">
                  {formatPhoneNumber(settings.uazapi_connected_phone)}
                </p>
              )}
              {settings?.uazapi_instance_name && (
                <Badge variant="outline" className="mt-1">
                  {settings.uazapi_instance_name}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleCheckStatus}
              disabled={actionLoading === 'status'}
            >
              {actionLoading === 'status' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Verificar Status
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={actionLoading === 'disconnect'}>
                  {actionLoading === 'disconnect' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Desconectar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você precisará escanear o QR Code novamente para reconectar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDisconnect}>
                    Desconectar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={actionLoading === 'delete'}>
                  {actionLoading === 'delete' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Deletar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deletar instância?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. A instância será removida permanentemente do servidor.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteInstance}>
                    Deletar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render disconnected state (has instance but not connected)
  if (connectionState === 'disconnected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WifiOff className="h-5 w-5 text-destructive" />
            WhatsApp Desconectado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
            <XCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-medium">Conexão inativa</p>
              {settings?.uazapi_instance_name && (
                <Badge variant="outline" className="mt-1">
                  {settings.uazapi_instance_name}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleGetQrCode}
              disabled={actionLoading === 'qrcode'}
            >
              {actionLoading === 'qrcode' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="mr-2 h-4 w-4" />
              )}
              Conectar
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={actionLoading === 'delete'}>
                  {actionLoading === 'delete' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Deletar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deletar instância?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. A instância será removida permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteInstance}>
                    Deletar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Erro ao carregar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={fetchSettings} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
};