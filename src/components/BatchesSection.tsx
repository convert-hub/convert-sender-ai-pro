import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useDispatch } from '@/contexts/DispatchContext';
import { BatchInfo } from '@/types/dispatch';
import { sendToWebhook } from '@/utils/webhook';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export const BatchesSection = () => {
  const navigate = useNavigate();
  const { batches, setBatches, columnMapping, sheetMeta, addToHistory, incrementStats, webhookUrl } = useDispatch();
  
  const [selectedBatch, setSelectedBatch] = useState<BatchInfo | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  if (!batches.length || !columnMapping || !sheetMeta) {
    navigate('/');
    return null;
  }

  const handleViewBatch = (batch: BatchInfo) => {
    setSelectedBatch(batch);
    setSelectedExtras(columnMapping.extras);
  };

  const handleSendBatch = async () => {
    if (!selectedBatch) return;

    setIsSending(true);

    // Update mapping to only include selected extras
    const mappingForSend = {
      ...columnMapping,
      extras: selectedExtras,
    };

    // Update contacts to only include selected extras
    const batchToSend = {
      ...selectedBatch,
      contacts: selectedBatch.contacts.map(contact => ({
        ...contact,
        extras: Object.keys(contact.extras)
          .filter(key => selectedExtras.includes(key))
          .reduce((acc, key) => {
            acc[key] = contact.extras[key];
            return acc;
          }, {} as Record<string, string>),
      })),
    };

    const result = await sendToWebhook(batchToSend, mappingForSend, sheetMeta, webhookUrl);

    if (result.success) {
      // Update batch status
      setBatches(
        batches.map(b =>
          b.block_number === selectedBatch.block_number
            ? { ...b, status: 'sent' }
            : b
        )
      );

      addToHistory({
        id: `${Date.now()}-${selectedBatch.block_number}`,
        timestamp: new Date().toISOString(),
        block_number: selectedBatch.block_number,
        contacts_count: selectedBatch.contacts.length,
        status: 'success',
        response_status: result.status,
      });

      incrementStats({
        batches_sent: 1,
      });

      toast({
        title: 'Disparo enviado!',
        description: `Bloco ${selectedBatch.block_number} enviado com sucesso`,
      });

      setSelectedBatch(null);
    } else {
      setBatches(
        batches.map(b =>
          b.block_number === selectedBatch.block_number
            ? { ...b, status: 'error' }
            : b
        )
      );

      addToHistory({
        id: `${Date.now()}-${selectedBatch.block_number}`,
        timestamp: new Date().toISOString(),
        block_number: selectedBatch.block_number,
        contacts_count: selectedBatch.contacts.length,
        status: 'error',
        response_status: result.status,
        error_message: result.error,
      });

      toast({
        title: 'Erro no envio',
        description: result.error || 'Erro desconhecido',
        variant: 'destructive',
      });
    }

    setIsSending(false);
  };

  const getStatusIcon = (status: BatchInfo['status']) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'sending':
        return <Clock className="h-5 w-5 text-warning animate-pulse" />;
      default:
        return <Send className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: BatchInfo['status']) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-success">Enviado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'sending':
        return <Badge className="bg-warning">Enviando...</Badge>;
      default:
        return <Badge variant="secondary">Pronto</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/map')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Mapeamento
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Blocos de Envio</h1>
            <p className="text-muted-foreground">
              {batches.length} blocos • {batches.reduce((sum, b) => sum + b.contacts.length, 0)} contatos totais
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/history')}>
            Ver Histórico
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.map(batch => (
          <Card
            key={batch.block_number}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => batch.status === 'ready' && handleViewBatch(batch)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Bloco {batch.block_number}
                </CardTitle>
                {getStatusIcon(batch.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contatos:</span>
                  <span className="font-medium">{batch.contacts.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Range:</span>
                  <span className="font-medium">
                    {batch.range.start}-{batch.range.end}
                  </span>
                </div>
                <div className="pt-2">
                  {getStatusBadge(batch.status)}
                </div>
                {batch.status === 'ready' && (
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewBatch(batch);
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Visualizar & Enviar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bloco {selectedBatch?.block_number}</DialogTitle>
            <DialogDescription>
              Pré-visualização de {selectedBatch?.contacts.length} contatos
            </DialogDescription>
          </DialogHeader>

          {selectedBatch && (
            <div className="space-y-6">
              {columnMapping.extras.length > 0 && (
                <div>
                  <Label className="mb-3 block">Campos extras a incluir:</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {columnMapping.extras.map(extra => (
                      <div key={extra} className="flex items-center space-x-2">
                        <Checkbox
                          id={`extra-send-${extra}`}
                          checked={selectedExtras.includes(extra)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedExtras([...selectedExtras, extra]);
                            } else {
                              setSelectedExtras(selectedExtras.filter(e => e !== extra));
                            }
                          }}
                        />
                        <label
                          htmlFor={`extra-send-${extra}`}
                          className="text-sm font-medium"
                        >
                          {extra}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {columnMapping.name && (
                          <th className="text-left p-3 font-medium">Nome</th>
                        )}
                        {columnMapping.email && (
                          <th className="text-left p-3 font-medium">Email</th>
                        )}
                        {columnMapping.phone && (
                          <th className="text-left p-3 font-medium">Telefone</th>
                        )}
                        {selectedExtras.map(extra => (
                          <th key={extra} className="text-left p-3 font-medium">
                            {extra}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBatch.contacts.slice(0, 10).map((contact, idx) => (
                        <tr key={idx} className="border-t">
                          {columnMapping.name && (
                            <td className="p-3">{contact.name || '-'}</td>
                          )}
                          {columnMapping.email && (
                            <td className="p-3">{contact.email || '-'}</td>
                          )}
                          {columnMapping.phone && (
                            <td className="p-3">{contact.phone || '-'}</td>
                          )}
                          {selectedExtras.map(extra => (
                            <td key={extra} className="p-3">
                              {contact.extras[extra] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedBatch.contacts.length > 10 && (
                  <div className="p-3 text-center text-sm text-muted-foreground bg-muted/50">
                    + {selectedBatch.contacts.length - 10} contatos adicionais
                  </div>
                )}
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total de contatos:</span>
                  <span className="font-medium">{selectedBatch.contacts.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Prontos para envio:</span>
                  <span className="font-medium text-success">{selectedBatch.contacts.length}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedBatch(null)}
              disabled={isSending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendBatch}
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Iniciar Disparo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
