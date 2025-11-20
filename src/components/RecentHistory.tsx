import { useNavigate } from 'react-router-dom';
import { useDispatch } from '@/contexts/DispatchContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ArrowRight, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecentHistoryProps {
  limit?: number;
}

export const RecentHistory = ({ limit = 5 }: RecentHistoryProps) => {
  const navigate = useNavigate();
  const { history, clearHistory } = useDispatch();

  const recentEntries = history.slice(0, limit);

  if (history.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Nenhum disparo realizado ainda</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Comece importando sua primeira base de contatos usando as ações rápidas acima
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <span className="text-2xl">🕐</span>
          Últimos Disparos
        </h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
                clearHistory();
              }
            }}
            className="text-destructive hover:text-destructive"
          >
            Limpar Histórico
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/history')}
            className="group"
          >
            Ver Histórico Completo
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Registros Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentEntries.map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3 flex-1">
                  {entry.status === 'success' ? (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-destructive" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      <span>Bloco {entry.block_number}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">
                        {entry.contacts_count} contatos
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(entry.timestamp), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </div>
                  </div>
                </div>
                <Badge variant={entry.status === 'success' ? 'default' : 'destructive'}>
                  {entry.status === 'success' ? 'Sucesso' : 'Erro'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
