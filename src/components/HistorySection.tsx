import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDispatch } from '@/contexts/DispatchContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const HistorySection = () => {
  const navigate = useNavigate();
  const { history, stats } = useDispatch();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/batches')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar aos Blocos
        </Button>
        <h1 className="text-3xl font-bold mb-2">Histórico de Disparos</h1>
        <p className="text-muted-foreground">
          Registro de todos os envios realizados
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Uploads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uploads_total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contatos Válidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.rows_valid}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Blocos Criados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.batches_total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Blocos Enviados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.batches_sent}</div>
          </CardContent>
        </Card>
      </div>

      {history.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum disparo realizado ainda</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Registros de Envio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {history.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {entry.status === 'success' ? (
                      <CheckCircle2 className="h-8 w-8 text-success" />
                    ) : (
                      <XCircle className="h-8 w-8 text-destructive" />
                    )}
                    <div>
                      <div className="font-medium">
                        Bloco {entry.block_number} • {entry.contacts_count} contatos
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(entry.timestamp), "dd 'de' MMMM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </div>
                      {entry.error_message && (
                        <div className="text-sm text-destructive mt-1">
                          {entry.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.response_status && (
                      <Badge variant="outline">
                        HTTP {entry.response_status}
                      </Badge>
                    )}
                    {entry.status === 'success' ? (
                      <Badge className="bg-success">Sucesso</Badge>
                    ) : (
                      <Badge variant="destructive">Erro</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
