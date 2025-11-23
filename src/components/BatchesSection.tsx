import { useState } from 'react';
import { useDispatch } from '@/contexts/DispatchContext';
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
  Send, 
  Grid3x3, 
  Users, 
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Home,
  Calendar as CalendarIcon
} from 'lucide-react';
import { sendToWebhook } from '@/utils/webhook';
import { toast } from '@/hooks/use-toast';
import { ScheduleBatchDialog } from './ScheduleBatchDialog';
import { useScheduledBatches } from '@/hooks/useScheduledBatches';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BatchInfo } from '@/types/dispatch';

export const BatchesSection = () => {
  const { columnMapping, sheetMeta } = useDispatch();
  const { batches, updateBatch } = useBatches();
  const { addHistoryItem } = useHistory();
  const { settings, incrementStats } = useUserSettings();
  const { campaigns } = useCampaigns();
  const navigate = useNavigate();
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<number | null>(null);
  const [selectedBatchContactsCount, setSelectedBatchContactsCount] = useState<number>(0);
  
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

  if (!columnMapping || !sheetMeta) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle>Dados incompletos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Alguns dados necessários estão faltando. Por favor, importe uma nova planilha.
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

    await updateBatch(batch.block_number, { status: 'sending' });

    const result = await sendToWebhook(batch, columnMapping, sheetMeta, campaign, settings?.webhook_url || '');

    if (result.success) {
      await updateBatch(batch.block_number, { status: 'sent' });

      await addHistoryItem({
        block_number: batch.block_number,
        contacts_count: batch.contacts.length,
        status: 'success',
        response_status: result.status,
      });

      await incrementStats('batches_sent', 1);

      toast({
        title: 'Disparo enviado!',
        description: `Bloco #${batch.block_number} enviado com sucesso`,
      });
    } else {
      await updateBatch(batch.block_number, { status: 'error' });

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
  };

  const handleScheduleBatch = (batchNumber: number) => {
    const batch = batches.find(b => b.block_number === batchNumber);
    setSelectedBatchNumber(batchNumber);
    setSelectedBatchContactsCount(batch?.contacts.length || 0);
    setScheduleDialogOpen(true);
  };

  const handleConfirmSchedule = async (scheduledAt: string) => {
    if (selectedBatchNumber === null) return;

    await updateBatch(selectedBatchNumber, {
      status: 'scheduled',
      scheduled_at: scheduledAt,
    });

    toast({
      title: 'Envio agendado',
      description: `Bloco #${selectedBatchNumber} será enviado em ${format(new Date(scheduledAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    });

    setSelectedBatchNumber(null);
  };

  const handleCancelSchedule = async (batchNumber: number) => {
    await updateBatch(batchNumber, {
      status: 'ready',
      scheduled_at: null,
    });

    toast({
      title: 'Agendamento cancelado',
      description: `Bloco #${batchNumber} voltou para status pronto`,
    });
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
            <Card key={batch.block_number} className="hover:shadow-lg transition-shadow">
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
                  {batch.status === 'scheduled' ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleCancelSchedule(batch.block_number)}
                        className="flex-1"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => handleSendBatch(batch)}
                        className="flex-1"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Enviar Agora
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleSendBatch(batch)}
                        disabled={batch.status === 'sending' || batch.status === 'sent'}
                        className="flex-1"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {batch.status === 'sent' ? 'Enviado' : batch.status === 'sending' ? 'Enviando...' : 'Enviar'}
                      </Button>
                      {batch.status === 'ready' && (
                        <Button
                          variant="outline"
                          onClick={() => handleScheduleBatch(batch.block_number)}
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

      <ScheduleBatchDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSchedule={handleConfirmSchedule}
        batchNumber={selectedBatchNumber || 0}
        batchContactsCount={selectedBatchContactsCount}
      />
    </div>
  );
};
