import { useState, useEffect, useRef } from 'react';

const SENDING_TIMEOUT_MIN = 10;
import { useBatches } from '@/hooks/useBatches';
import { useHistory } from '@/hooks/useHistory';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { 
  Send, 
  Grid3x3, 
  Users, 
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Home,
  Calendar as CalendarIcon,
  Trash2
} from 'lucide-react';
import { sendToWebhook } from '@/utils/webhook';
import { toast } from '@/hooks/use-toast';
import { ScheduleBatchDialog } from './ScheduleBatchDialog';
import { useScheduledBatches } from '@/hooks/useScheduledBatches';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BatchInfo } from '@/types/dispatch';

export const BatchesSection = () => {
  const { batches, updateBatch, deleteBatch, fetchError, refetch, loading } = useBatches();
  const { addHistoryItem } = useHistory();
  const { settings, incrementStats, checkDailyLimit, confirmDailyDispatch } = useUserSettings();
  const { campaigns } = useCampaigns();
  const navigate = useNavigate();
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<number | null>(null);
  const [selectedBatchContactsCount, setSelectedBatchContactsCount] = useState<number>(0);
  
  // Estados para controlar o popup de sucesso
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successBatchInfo, setSuccessBatchInfo] = useState<{
    blockNumber: number;
    contactsCount: number;
    remaining: number;
    limit: number;
  } | null>(null);

  // Estado para prevenir cliques múltiplos (usando UUID)
  const [sendingBatchIds, setSendingBatchIds] = useState<Set<string>>(new Set());
  
  // Estado para controlar diálogo de exclusão
  const [deletingBatch, setDeletingBatch] = useState<string | null>(null);
  
  // Hook para verificar e enviar batches agendados
  useScheduledBatches();

  if (!batches.length) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle>Nenhum bloco disponível</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Você ainda não criou blocos de envio. Importe uma planilha primeiro para começar.
            </p>
            <Button onClick={() => navigate('/')}>
              <Home className="mr-2 h-4 w-4" />
              Ir para Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSendBatch = async (batch: BatchInfo) => {
    // Proteção: Verificar se o batch já está sendo enviado (usando UUID)
    if (sendingBatchIds.has(batch.id)) {
      toast({
        title: 'Aguarde',
        description: 'Este bloco já está sendo enviado. Por favor, aguarde.',
        variant: 'default',
      });
      return;
    }

    // Proteção: Adicionar ao Set de batches sendo enviados (usando UUID)
    setSendingBatchIds(prev => new Set(prev).add(batch.id));

    try {
      // 1. Verificar limite diário (SEM incrementar)
      const limitCheck = await checkDailyLimit(batch.contacts.length);
      
      // Verificar se houve ERRO na verificação (diferente de limite atingido)
      if (limitCheck.error) {
        toast({
          title: 'Erro na verificação',
          description: 'Não foi possível verificar o limite diário. Tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      // Limite realmente atingido
      if (!limitCheck.allowed) {
        toast({
          title: 'Limite diário atingido',
          description: `Você tem ${limitCheck.remaining} disparos restantes, mas está tentando enviar ${batch.contacts.length} contatos.`,
          variant: 'destructive',
        });
        return;
      }

      // 2. Obter dados do batch (não do contexto)
      const batchSheetMeta = batch.sheet_meta;
      const batchMapping = batch.column_mapping;

      if (!batchSheetMeta || !batchMapping) {
        toast({
          title: 'Erro',
          description: 'Dados de mapeamento não encontrados neste batch',
          variant: 'destructive',
        });
        return;
      }

      const campaign = campaigns.find(c => c.id === batch.campaign_id);
      if (!campaign) {
        toast({
          title: 'Erro',
          description: batch.campaign_id
            ? 'Campanha não encontrada. Ela pode ter sido deletada.'
            : 'Batch sem campanha associada. Por favor, importe novamente.',
          variant: 'destructive',
        });
        return;
      }

      await updateBatch(batch.id, { status: 'sending' });

      try {
        // 3. Tentar enviar
        const result = await sendToWebhook(batch, batchMapping, batchSheetMeta, campaign, settings?.webhook_url || '');

        if (result.success) {
          // 4. SÓ CONFIRMA disparo se envio foi bem-sucedido
          await confirmDailyDispatch(batch.contacts.length);
          
          await updateBatch(batch.id, { status: 'sent' });

          await addHistoryItem({
            block_number: batch.block_number,
            contacts_count: batch.contacts.length,
            status: 'success',
            response_status: result.status,
          });

          await incrementStats('batches_sent', 1);

          // Abrir popup de sucesso ao invés de toast
          setSuccessBatchInfo({
            blockNumber: batch.block_number,
            contactsCount: batch.contacts.length,
            remaining: limitCheck.remaining - batch.contacts.length,
            limit: limitCheck.limit,
          });
          setSuccessDialogOpen(true);
        } else {
          await updateBatch(batch.id, { status: 'error' });

          await addHistoryItem({
            block_number: batch.block_number,
            contacts_count: batch.contacts.length,
            status: 'error',
            response_status: result.status,
            error_message: result.error,
          });

          toast({
            title: 'Erro no envio',
            description: result.error || 'Falha ao enviar disparo',
            variant: 'destructive',
          });
        }
      } catch (sendError) {
        // Falha inesperada após marcar como sending → reconciliar status
        const message = sendError instanceof Error ? sendError.message : 'Erro inesperado';
        console.error('Unexpected error during batch send:', sendError);
        try {
          await updateBatch(batch.id, { status: 'error' });
          await addHistoryItem({
            block_number: batch.block_number,
            contacts_count: batch.contacts.length,
            status: 'error',
            error_message: message,
          });
        } catch (recoveryError) {
          console.error('Failed to mark batch as error after send failure:', recoveryError);
        }
        toast({
          title: 'Erro inesperado',
          description: message,
          variant: 'destructive',
        });
      }
    } finally {
      // Proteção: Sempre remover do Set ao finalizar (sucesso ou erro) - usando UUID
      setSendingBatchIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(batch.id);
        return newSet;
      });
    }
  };

  // Recovery passivo: blocos travados em "sending" há mais de SENDING_TIMEOUT_MIN
  const recoveryDoneRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (loading) return;
    const cutoffMs = SENDING_TIMEOUT_MIN * 60 * 1000;
    const now = Date.now();

    batches.forEach(async (b) => {
      if (b.status !== 'sending') return;
      if (recoveryDoneRef.current.has(b.id)) return;
      const startedAt = b.sending_started_at ? new Date(b.sending_started_at).getTime() : null;
      if (!startedAt) return;
      if (now - startedAt < cutoffMs) return;

      recoveryDoneRef.current.add(b.id);
      try {
        await updateBatch(b.id, { status: 'error' });
        await addHistoryItem({
          block_number: b.block_number,
          contacts_count: b.contacts.length,
          status: 'error',
          error_message: `Envio interrompido: sem confirmação após ${SENDING_TIMEOUT_MIN} minutos`,
        });
      } catch (err) {
        console.error('Recovery failed for batch', b.id, err);
        recoveryDoneRef.current.delete(b.id);
      }
    });
  }, [batches, loading, updateBatch, addHistoryItem]);

  const handleScheduleBatch = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;
    setSelectedBatchId(batchId);
    setSelectedBatchNumber(batch.block_number);
    setSelectedBatchContactsCount(batch.contacts.length);
    setScheduleDialogOpen(true);
  };

  const handleConfirmSchedule = async (scheduledAt: string) => {
    if (!selectedBatchId) return;

    const batch = batches.find(b => b.id === selectedBatchId);
    if (!batch) return;

    await updateBatch(batch.id, {
      status: 'scheduled',
      scheduled_at: scheduledAt,
    });

    toast({
      title: 'Envio agendado',
      description: `Bloco #${batch.block_number} será enviado em ${format(new Date(scheduledAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    });

    setSelectedBatchId(null);
    setSelectedBatchNumber(null);
  };

  const handleCancelSchedule = async (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    await updateBatch(batch.id, {
      status: 'ready',
      scheduled_at: null,
    });

    toast({
      title: 'Agendamento cancelado',
      description: `Bloco #${batch.block_number} voltou para status pronto`,
    });
  };

  const handleDeleteBatch = async (id: string) => {
    try {
      await deleteBatch(id);
      const batch = batches.find(b => b.id === id);
      toast({
        title: 'Bloco excluído',
        description: `Bloco #${batch?.block_number} foi removido com sucesso`,
      });
      setDeletingBatch(null);
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o bloco',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: BatchInfo['status']) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'sending':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'scheduled':
        return <CalendarIcon className="h-5 w-5 text-orange-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: BatchInfo['status']) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500">Enviado</Badge>;
      case 'sending':
        return <Badge className="bg-blue-500">Enviando...</Badge>;
      case 'scheduled':
        return <Badge className="bg-orange-500">Agendado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Pronto</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Grid3x3 className="h-8 w-8" />
              Blocos de Envio
            </h1>
            <p className="text-muted-foreground">
              {batches.length} blocos • {batches.reduce((sum, b) => sum + b.contacts.length, 0)} contatos totais
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <Home className="mr-2 h-4 w-4" />
            Voltar para Home
          </Button>
        </div>

        {/* Status Summary */}
        <div className="flex flex-wrap gap-3">
          <Badge variant="secondary" className="text-sm py-1.5">
            Total: {batches.length}
          </Badge>
          <Badge className="bg-green-500 text-sm py-1.5">
            Enviados: {batches.filter(b => b.status === 'sent').length}
          </Badge>
          <Badge variant="outline" className="text-sm py-1.5">
            Pendentes: {batches.filter(b => b.status === 'ready').length}
          </Badge>
          {batches.filter(b => b.status === 'scheduled').length > 0 && (
            <Badge className="bg-orange-500 text-sm py-1.5">
              Agendados: {batches.filter(b => b.status === 'scheduled').length}
            </Badge>
          )}
          {batches.filter(b => b.status === 'error').length > 0 && (
            <Badge variant="destructive" className="text-sm py-1.5">
              Erros: {batches.filter(b => b.status === 'error').length}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {batches.map(batch => (
            <Card key={batch.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Grid3x3 className="h-5 w-5" />
                    Bloco #{batch.block_number}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(batch.status)}
                    {getStatusBadge(batch.status)}
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Intervalo:</span>
                    <p className="font-medium">
                      Linhas {batch.range.start} - {batch.range.end}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contatos:</span>
                    <p className="font-medium flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {batch.contacts.length}
                    </p>
                  </div>
                </div>

                {!batch.sheet_meta && (
                  <Alert className="mt-4 border-yellow-500/50 bg-yellow-500/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      ⚠️ Este bloco foi criado antes da atualização e não possui dados de mapeamento. Por favor, reimporte a planilha.
                    </AlertDescription>
                  </Alert>
                )}

                {batch.status === 'scheduled' && batch.scheduled_at && (
                  <Alert className="mt-4 border-orange-500/50 bg-orange-500/10">
                    <CalendarIcon className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Agendado para:</strong><br />
                      {format(new Date(batch.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="mt-4 flex gap-2">
                  {batch.status !== 'sending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingBatch(batch.id)}
                      className="text-destructive hover:text-destructive"
                      title="Excluir bloco"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {batch.status === 'scheduled' ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleCancelSchedule(batch.id)}
                        className="flex-1"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => handleSendBatch(batch)}
                        disabled={sendingBatchIds.has(batch.id)}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {sendingBatchIds.has(batch.id) ? 'Enviando...' : 'Enviar Agora'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleSendBatch(batch)}
                        disabled={
                          batch.status === 'sending' || 
                          batch.status === 'sent' || 
                          sendingBatchIds.has(batch.id)
                        }
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {batch.status === 'sent' 
                          ? 'Enviado' 
                          : (batch.status === 'sending' || sendingBatchIds.has(batch.id))
                            ? 'Enviando...' 
                            : 'Enviar'}
                      </Button>
                      {batch.status === 'ready' && (
                        <Button
                          variant="outline"
                          onClick={() => handleScheduleBatch(batch.id)}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Agendar
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Success Dialog */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="relative mx-auto mb-4">
              {/* Animação de pulso ao fundo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-ping h-20 w-20 rounded-full bg-green-500/30"></div>
              </div>
              {/* Ícone principal */}
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-2xl font-bold">
              🚀 Disparo Iniciado!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4 pt-2">
              <p className="text-lg font-semibold text-foreground">
                Bloco #{successBatchInfo?.blockNumber} enviado com sucesso
              </p>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-left space-y-1">
                  <p className="text-muted-foreground">Contatos enviados</p>
                  <p className="font-bold text-2xl text-green-600">
                    {successBatchInfo?.contactsCount}
                  </p>
                </div>
                <div className="text-left space-y-1">
                  <p className="text-muted-foreground">Restantes hoje</p>
                  <p className="font-bold text-2xl text-blue-600">
                    {successBatchInfo?.remaining}
                  </p>
                </div>
              </div>
              <Alert className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm text-muted-foreground">
                  Os disparos estão sendo processados. Você pode acompanhar o progresso no histórico.
                </AlertDescription>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction 
              onClick={() => setSuccessDialogOpen(false)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 font-semibold"
            >
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScheduleBatchDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSchedule={handleConfirmSchedule}
        batchNumber={selectedBatchNumber || 0}
        batchContactsCount={selectedBatchContactsCount}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingBatch !== null} onOpenChange={(open) => !open && setDeletingBatch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este bloco? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingBatch && handleDeleteBatch(deletingBatch)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
