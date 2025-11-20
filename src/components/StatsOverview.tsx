import { useDispatch } from '@/contexts/DispatchContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, TrendingUp, CheckCircle2, Users } from 'lucide-react';

export const StatsOverview = () => {
  const { history, stats } = useDispatch();

  // Calculate stats from history as fallback
  const historyStats = {
    totalDispatches: history.length,
    successfulDispatches: history.filter(h => h.status === 'success').length,
    totalContactsSent: history.reduce((sum, h) => sum + h.contacts_count, 0),
  };

  const successRate = history.length > 0
    ? Math.round((historyStats.successfulDispatches / history.length) * 100)
    : 0;

  const totalContacts = stats.rows_total || historyStats.totalContactsSent;
  const todayDispatches = history.filter(h => {
    const today = new Date().toDateString();
    return new Date(h.timestamp).toDateString() === today;
  }).length;

  const statsData = [
    {
      title: 'Total de Contatos',
      value: totalContacts.toLocaleString('pt-BR'),
      subtitle: `${stats.uploads_total} uploads realizados`,
      icon: Users,
      gradient: 'from-primary/10 to-transparent',
      iconColor: 'text-primary',
      border: 'border-primary/20',
    },
    {
      title: 'Taxa de Sucesso',
      value: `${successRate}%`,
      subtitle: `${history.filter(h => h.status === 'success').length} de ${history.length} disparos`,
      icon: TrendingUp,
      gradient: 'from-success/10 to-transparent',
      iconColor: 'text-success',
      border: 'border-success/20',
    },
    {
      title: 'Disparos Hoje',
      value: todayDispatches.toString(),
      subtitle: `${stats.batches_sent} blocos enviados`,
      icon: Send,
      gradient: 'from-secondary/10 to-transparent',
      iconColor: 'text-secondary',
      border: 'border-secondary/20',
    },
    {
      title: 'Contatos Válidos',
      value: stats.rows_valid.toLocaleString('pt-BR'),
      subtitle: `${stats.rows_invalid} inválidos`,
      icon: CheckCircle2,
      gradient: 'from-accent/10 to-transparent',
      iconColor: 'text-accent',
      border: 'border-accent/20',
    },
  ];

  // Show empty state if no data
  if (stats.uploads_total === 0 && history.length === 0) {
    return (
      <div className="col-span-full text-center py-8 px-4 border-2 border-dashed rounded-lg bg-muted/20">
        <p className="text-muted-foreground text-sm">
          Nenhum disparo realizado ainda. Use as ações rápidas acima para começar! 🚀
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat, index) => (
        <Card
          key={index}
          className={`${stat.border} bg-gradient-to-br ${stat.gradient} animate-fade-in hover-scale transition-all duration-300`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
