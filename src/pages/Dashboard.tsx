import { StatsDashboard } from '@/components/StatsDashboard';
import { Layout } from '@/components/Layout';

const Dashboard = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Dashboard de Estatísticas
          </h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe métricas e desempenho dos seus disparos
          </p>
        </div>
        <StatsDashboard />
      </div>
    </Layout>
  );
};

export default Dashboard;
