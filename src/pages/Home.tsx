import { Layout } from '@/components/Layout';
import { StatsOverview } from '@/components/StatsOverview';
import { QuickActions } from '@/components/QuickActions';
import { RecentHistory } from '@/components/RecentHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer, Legend } from 'recharts';
import { useDispatch } from '@/contexts/DispatchContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logo from '@/assets/logo.png';

const Home = () => {
  const { history } = useDispatch();

  // Process history for success rate over time
  const successRateData = history
    .slice()
    .reverse()
    .map((entry, index) => ({
      id: index,
      date: format(parseISO(entry.timestamp), 'dd/MM HH:mm', { locale: ptBR }),
      taxa: entry.status === 'success' ? 100 : 0,
      contatos: entry.contacts_count,
    }));

  // Calculate moving average for smoother line
  const movingAvg = successRateData.map((item, idx, arr) => {
    const window = 3;
    const start = Math.max(0, idx - window + 1);
    const slice = arr.slice(start, idx + 1);
    const avg = slice.reduce((sum, i) => sum + i.taxa, 0) / slice.length;
    return { ...item, taxa: Math.round(avg) };
  });

  // Distribution by status
  const statusData = [
    {
      name: 'Sucesso',
      value: history.filter(h => h.status === 'success').length,
      color: 'hsl(var(--success))',
    },
    {
      name: 'Erro',
      value: history.filter(h => h.status === 'error').length,
      color: 'hsl(var(--destructive))',
    },
  ].filter(item => item.value > 0);

  const chartConfig = {
    taxa: {
      label: "Taxa de Sucesso",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-6">
          <div className="flex justify-center animate-fade-in">
            <img src={logo} alt="Convert Sender A.I." className="h-16" />
          </div>
          <p className="text-muted-foreground text-lg animate-fade-in" style={{ animationDelay: '100ms' }}>
            Seu centro de controle para disparos em massa
          </p>
        </div>

        {/* Stats Overview */}
        <StatsOverview />

        {/* Quick Actions */}
        <QuickActions />

        {/* Charts Grid */}
        {history.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Success Rate Chart */}
            <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📈 Taxa de Sucesso ao Longo do Tempo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {movingAvg.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={movingAvg}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="date" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          domain={[0, 100]}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="taxa"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Dados insuficientes
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Distribution Chart */}
            <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🎯 Distribuição por Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent History */}
        <RecentHistory limit={5} />
      </div>
    </Layout>
  );
};

export default Home;
