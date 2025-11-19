import { useDispatch } from '@/contexts/DispatchContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Users, Send, CheckCircle2, XCircle, BarChart3 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const StatsDashboard = () => {
  const { history, stats } = useDispatch();

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

  // Rows statistics
  const rowsData = [
    { name: 'Válidas', value: stats.rows_valid, fill: 'hsl(var(--success))' },
    { name: 'Inválidas', value: stats.rows_invalid, fill: 'hsl(var(--warning))' },
  ];

  // Batches statistics
  const batchesData = [
    { name: 'Enviados', value: stats.batches_sent, fill: 'hsl(var(--primary))' },
    { name: 'Pendentes', value: stats.batches_total - stats.batches_sent, fill: 'hsl(var(--muted))' },
  ];

  const successRate = history.length > 0
    ? Math.round((history.filter(h => h.status === 'success').length / history.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Disparos</CardTitle>
            <Send className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{history.length}</div>
            <p className="text-xs text-muted-foreground">
              {stats.batches_total} blocos processados
            </p>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-gradient-to-br from-success/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {history.filter(h => h.status === 'success').length} de {history.length} disparos
            </p>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-gradient-to-br from-accent/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contatos Válidos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rows_valid}</div>
            <p className="text-xs text-muted-foreground">
              {stats.rows_total > 0 
                ? Math.round((stats.rows_valid / stats.rows_total) * 100)
                : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="border-secondary/20 bg-gradient-to-br from-secondary/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Processado</CardTitle>
            <Users className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rows_total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.uploads_total} uploads realizados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Success Rate Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Taxa de Sucesso ao Longo do Tempo
            </CardTitle>
            <CardDescription>
              Histórico de sucesso dos disparos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {movingAvg.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
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
                  <ChartTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Data</span>
                                <span className="font-bold">{payload[0].payload.date}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Taxa</span>
                                <span className="font-bold text-primary">{payload[0].value}%</span>
                              </div>
                              <div className="flex flex-col col-span-2">
                                <span className="text-xs text-muted-foreground">Contatos</span>
                                <span className="font-bold">{payload[0].payload.contatos}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="taxa" 
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Nenhum disparo realizado ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-secondary" />
              Distribuição por Status
            </CardTitle>
            <CardDescription>
              Proporção de sucessos e erros
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-bold">{payload[0].name}</span>
                              <span className="text-xs text-muted-foreground">
                                {payload[0].value} disparos
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Nenhum disparo realizado ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rows Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Estatísticas de Contatos
            </CardTitle>
            <CardDescription>
              Contatos válidos vs inválidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.rows_total > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rowsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-bold">{payload[0].payload.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {payload[0].value} contatos
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Nenhum contato processado ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Batches Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Estatísticas de Blocos
            </CardTitle>
            <CardDescription>
              Blocos enviados vs pendentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.batches_total > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={batchesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-bold">{payload[0].payload.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {payload[0].value} blocos
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Nenhum bloco processado ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
