import { useUserSettings } from '@/hooks/useUserSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

export const DailyLimitIndicator = () => {
  const { settings } = useUserSettings();

  if (!settings?.stats) return null;

  const stats = settings.stats as any;
  const limit = stats.daily_dispatch_limit || 50;
  const usedToday = stats.dispatches_today || 0;
  const remaining = limit - usedToday;
  const percentage = (usedToday / limit) * 100;

  const getStatusColor = () => {
    if (percentage >= 100) return 'text-destructive';
    if (percentage >= 80) return 'text-orange-500';
    return 'text-primary';
  };

  const getStatusIcon = () => {
    if (percentage >= 100) return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (percentage >= 80) return <Clock className="h-4 w-4 text-orange-500" />;
    return <CheckCircle2 className="h-4 w-4 text-primary" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {getStatusIcon()}
          Limite de Envios Diário
        </CardTitle>
        <CardDescription>
          Seu limite reseta automaticamente à meia-noite
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Enviados hoje</span>
            <span className={`font-bold ${getStatusColor()}`}>
              {usedToday} / {limit}
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Restantes</p>
            <p className="text-2xl font-bold text-primary">{remaining}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Limite Total</p>
            <p className="text-2xl font-bold">{limit}</p>
          </div>
        </div>

        {percentage >= 100 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você atingiu o limite diário de envios. Aguarde até amanhã para enviar mais.
            </AlertDescription>
          </Alert>
        )}

        {percentage >= 80 && percentage < 100 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Você está próximo do limite diário ({Math.round(percentage)}% utilizado).
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
