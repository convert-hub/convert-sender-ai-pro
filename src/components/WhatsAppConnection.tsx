import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  WifiOff,
  Link
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

type ConnectionState = 'no-instance' | 'loading' | 'awaiting-qr' | 'connected' | 'error';

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
  // Remove any non-numeric characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Format as +55 11 99999-9999
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
  const [instanceName, setInstanceName] = useState('wpp_');
  const [instanceToken, setInstanceToken] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UazapiSettings | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'link'>('create');
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
        setConnectionState('no-instance');
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

  // Create instance
  const handleCreateInstance = async () => {
    const validation = validateInstanceName(instanceName);
    if (!validation.valid) {
      setNameError(validation.error || 'Nome inválido');
      return;
    }

    setActionLoading('create');
    setNameError(null);

    try {
      const result = await callUazapiManager('create-instance', { instanceName });
      
      if (result.success) {
        toast.success('Instância criada com sucesso!');
        await fetchSettings();
        // Automatically request QR code
        await handleGetQrCode();
      } else {
        throw new Error(result.error || 'Erro ao criar instância');
      }
    } catch (error) {
      console.error('Error creating instance:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar instância');
    } finally {
      setActionLoading(null);
    }
  };

  // Link existing instance
  const handleLinkInstance = async () => {
    const nameValidation = validateInstanceName(instanceName);
    if (!nameValidation.valid) {
      setNameError(nameValidation.error || 'Nome inválido');
      return;
    }

    if (!instanceToken.trim()) {
      setTokenError('Token é obrigatório');
      return;
    }

    setActionLoading('link');
    setNameError(null);
    setTokenError(null);

    try {
      const result = await callUazapiManager('link-instance', { 
        instanceName, 
        instanceToken: instanceToken.trim() 
      });
      
      if (result.success) {
        toast.success('Instância vinculada com sucesso!');
        await fetchSettings();
        
        if (result.connected) {
          setConnectionState('connected');
        } else {
          // Instance exists but not connected, get QR code
          await handleGetQrCode();
        }
      } else {
        throw new Error(result.error || 'Erro ao vincular instância');
      }
    } catch (error) {
      console.error('Error linking instance:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao vincular instância');
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
      setConnectionState('no-instance');
    } finally {
      setActionLoading(null);
    }
  };

  // Start polling for connection status
  const startPolling = () => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingStartRef.current = Date.now();
    const POLLING_INTERVAL = 3000; // 3 seconds
    const POLLING_TIMEOUT = 120000; // 2 minutes

    pollingRef.current = setInterval(async () => {
      // Check timeout
      if (pollingStartRef.current && Date.now() - pollingStartRef.current > POLLING_TIMEOUT) {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
        toast.warning('QR Code expirado. Gere um novo.');
        setQrCode(null);
        setConnectionState('no-instance');
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
        setConnectionState('no-instance');
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
      // Stop polling if active
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      const result = await callUazapiManager('delete-instance');
      
      if (result.success) {
        toast.success('Instância deletada');
        setQrCode(null);
        setInstanceName('wpp_');
        setInstanceToken('');
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

  const handleTokenChange = (value: string) => {
    setInstanceToken(value);
    setTokenError(null);
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
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'create' | 'link')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Nova Instância
              </TabsTrigger>
              <TabsTrigger value="link" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Vincular Existente
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="instance-name">Nome da Instância</Label>
                <Input
                  id="instance-name"
                  placeholder="wpp_minha_empresa"
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
                  Use apenas letras, números, - e _. Exemplo: wpp_minha_empresa
                </p>
              </div>

              <Button 
                onClick={handleCreateInstance}
                disabled={actionLoading === 'create' || !instanceName}
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
                    Criar Instância
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="link" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="link-instance-name">Nome da Instância</Label>
                <Input
                  id="link-instance-name"
                  placeholder="nome_da_instancia"
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="instance-token">Token da Instância</Label>
                <Input
                  id="instance-token"
                  type="password"
                  placeholder="Token obtido no painel UAZAPI"
                  value={instanceToken}
                  onChange={(e) => handleTokenChange(e.target.value)}
                  className={tokenError ? 'border-destructive' : ''}
                />
                {tokenError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {tokenError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Obtenha o token no painel da UAZAPI para a instância existente
                </p>
              </div>

              <Button 
                onClick={handleLinkInstance}
                disabled={actionLoading === 'link' || !instanceName || !instanceToken}
                className="w-full"
              >
                {actionLoading === 'link' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    <Link className="mr-2 h-4 w-4" />
                    Vincular Instância
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  // Render awaiting QR state
  if (connectionState === 'awaiting-qr' || qrCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-yellow-500" />
            Conexão WhatsApp
            <Badge variant="outline" className="ml-auto text-yellow-600 border-yellow-300">
              Aguardando
            </Badge>
          </CardTitle>
          <CardDescription>
            Escaneie o QR Code com seu WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {qrCode ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-inner">
                {qrCode.startsWith('data:') ? (
                  <img 
                    src={qrCode} 
                    alt="QR Code" 
                    className="w-48 h-48 object-contain"
                  />
                ) : (
                  <img 
                    src={`data:image/png;base64,${qrCode}`} 
                    alt="QR Code" 
                    className="w-48 h-48 object-contain"
                  />
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando conexão...
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Instância: <strong>{settings?.uazapi_instance_name}</strong>
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
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
              Novo QR
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
  if (connectionState === 'connected' || settings?.uazapi_connection_status === 'connected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Conexão WhatsApp
            <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
              Conectado
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Wifi className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium">{settings?.uazapi_instance_name}</p>
              {settings?.uazapi_connected_phone && (
                <p className="text-sm text-muted-foreground">
                  {formatPhoneNumber(settings.uazapi_connected_phone)}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
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
                <Button variant="outline" size="sm">
                  <WifiOff className="mr-2 h-4 w-4" />
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
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
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

          {settings?.uazapi_last_checked && (
            <p className="text-xs text-muted-foreground">
              Última verificação: {new Date(settings.uazapi_last_checked).toLocaleString('pt-BR')}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render disconnected state with instance
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-500" />
          Conexão WhatsApp
          <Badge variant="outline" className="ml-auto text-red-600 border-red-300">
            Desconectado
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <WifiOff className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="font-medium">{settings?.uazapi_instance_name}</p>
            <p className="text-sm text-muted-foreground">Não conectado</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleGetQrCode}
            disabled={actionLoading === 'qrcode'}
            className="flex-1"
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
};
