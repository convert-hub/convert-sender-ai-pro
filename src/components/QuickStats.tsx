import { TrendingUp, Send } from 'lucide-react';
import { useHistory } from '@/hooks/useHistory';
import { useUserSettings } from '@/hooks/useUserSettings';

export const QuickStats = () => {
  const { history } = useHistory();
  const { settings } = useUserSettings();
  
  // Calculate success rate
  const successCount = history.filter(h => h.status === 'success').length;
  const totalCount = history.length;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;
  
  // Daily dispatches
  const dispatchesToday = settings?.dispatches_today || 0;
  const dailyLimit = settings?.daily_dispatch_limit || 50;
  const limitPercentage = Math.min((dispatchesToday / dailyLimit) * 100, 100);

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Success Rate */}
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">Taxa de Sucesso</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{successRate}%</span>
            {totalCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({successCount}/{totalCount})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Daily Dispatches */}
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
        <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
          <Send className="h-5 w-5 text-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">Disparos Hoje</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{dispatchesToday}</span>
            <span className="text-xs text-muted-foreground">
              / {dailyLimit}
            </span>
          </div>
          {/* Mini progress bar */}
          <div className="mt-1 h-1 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-secondary transition-all duration-300"
              style={{ width: `${limitPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};