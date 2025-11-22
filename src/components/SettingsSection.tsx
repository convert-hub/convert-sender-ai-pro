import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings as SettingsIcon, TestTube, Save, RotateCcw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { useDispatch } from '@/contexts/DispatchContext';
import { validateWebhookUrl } from '@/utils/validation';
import { testWebhook } from '@/utils/webhook';

const DEFAULT_WEBHOOK_URL = 'https://n8n.converthub.com.br/webhook/disparos-precatorizei';

export const SettingsSection = () => {
  const navigate = useNavigate();
  const { webhookUrl, setWebhookUrl, batches, reset } = useDispatch();
  
  const [inputUrl, setInputUrl] = useState(webhookUrl || DEFAULT_WEBHOOK_URL);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latency?: number;
    error?: string;
  } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(inputUrl !== webhookUrl);
  }, [inputUrl, webhookUrl]);

  const handleTest = async () => {
    const validation = validateWebhookUrl(inputUrl);
    
    if (!validation.valid) {
      toast({
        title: 'URL inválida',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const result = await testWebhook(inputUrl);
    setTestResult(result);

    if (result.success) {
      toast({
        title: 'Webhook testado com sucesso!',
        description: `Latência: ${result.latency}ms`,
      });
    } else {
      toast({
        title: 'Falha no teste',
        description: result.error,
        variant: 'destructive',
      });
    }

    setIsTesting(false);
  };

  const handleSave = () => {
    const validation = validateWebhookUrl(inputUrl);
    
    if (!validation.valid) {
      toast({
        title: 'URL inválida',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    setWebhookUrl(inputUrl);
    setHasChanges(false);

    toast({
      title: 'Configuração salva!',
      description: 'URL do webhook atualizada com sucesso',
    });
  };

  const handleRestoreDefault = () => {
    setInputUrl(DEFAULT_WEBHOOK_URL);
    setTestResult(null);
  };

  const isUsingDefault = inputUrl === DEFAULT_WEBHOOK_URL;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <SettingsIcon className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Configurações</h1>
                <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook Configuration Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Webhook de Disparos
                  {!isUsingDefault && (
                    <Badge variant="secondary">Customizado</Badge>
                  )}
                  {isUsingDefault && (
                    <Badge variant="outline">Padrão</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Configure a URL do webhook do n8n para envio de disparos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* URL Input */}
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL do Webhook</Label>
              <Input
                id="webhook-url"
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://n8n.example.com/webhook/..."
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Insira a URL completa do webhook do n8n que receberá os disparos
              </p>
            </div>

            {/* Test Result */}
            {testResult && (
              <Alert variant={testResult.success ? 'default' : 'destructive'}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {testResult.success ? (
                      <>
                        Webhook respondeu com sucesso! 
                        {testResult.latency && (
                          <span className="ml-2 font-semibold">
                            Latência: {testResult.latency}ms
                          </span>
                        )}
                      </>
                    ) : (
                      testResult.error
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* Warning for custom URL */}
            {!isUsingDefault && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Você está usando uma URL customizada. Certifique-se de que ela está configurada corretamente no n8n.
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleTest}
                variant="outline"
                disabled={isTesting || !inputUrl}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Testar Webhook
                  </>
                )}
              </Button>

              <Button
                onClick={handleSave}
                disabled={!hasChanges || !inputUrl}
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </Button>

              {!isUsingDefault && (
                <Button
                  onClick={handleRestoreDefault}
                  variant="ghost"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restaurar Padrão
                </Button>
              )}
            </div>

            {/* Current Active URL */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">URL ativa:</span>
                <code className="px-2 py-1 bg-muted rounded text-xs break-all">
                  {webhookUrl}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manage Batches Card */}
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Blocos</CardTitle>
            <CardDescription>
              Gerencie os blocos de envio salvos no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {batches.length > 0 ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total de blocos:</span>
                    <Badge variant="secondary">{batches.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Blocos pendentes:</span>
                    <Badge variant="outline">{batches.filter(b => b.status === 'ready').length}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total de contatos:</span>
                    <Badge variant="secondary">
                      {batches.reduce((sum, b) => sum + b.contacts.length, 0)}
                    </Badge>
                  </div>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Limpar os blocos irá remover todos os dados salvos e você precisará importar uma nova planilha.
                  </AlertDescription>
                </Alert>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    if (confirm('Tem certeza que deseja limpar todos os blocos? Esta ação não pode ser desfeita.')) {
                      reset();
                      toast({
                        title: 'Blocos limpos com sucesso',
                        description: 'Todos os blocos foram removidos do sistema',
                      });
                    }
                  }}
                >
                  Limpar Todos os Blocos
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum bloco salvo no momento.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sobre o Webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              O webhook é o endpoint do n8n que receberá os dados dos disparos. 
              Cada vez que você enviar um bloco de contatos, os dados serão enviados para esta URL.
            </p>
            <p>
              <strong>Importante:</strong> O webhook do n8n precisa estar configurado para aceitar 
              requisições POST com dados em JSON. Certifique-se de que o CORS está habilitado 
              para o domínio do Lovable.
            </p>
            <p>
              Use o botão "Testar Webhook" para verificar se a conexão está funcionando 
              corretamente antes de fazer disparos reais.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
