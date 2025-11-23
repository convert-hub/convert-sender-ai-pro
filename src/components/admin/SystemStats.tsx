import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Megaphone, Package, History, Loader2 } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalAdmins: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalBatches: number;
  readyBatches: number;
  sentBatches: number;
  totalDispatches: number;
  successDispatches: number;
  totalContacts: number;
}

const SystemStats = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Count users
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Count admins
        const { count: totalAdmins } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin');

        // Count campaigns
        const { count: totalCampaigns } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true });

        const { count: activeCampaigns } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // Count batches
        const { count: totalBatches } = await supabase
          .from('batches')
          .select('*', { count: 'exact', head: true });

        const { count: readyBatches } = await supabase
          .from('batches')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ready');

        const { count: sentBatches } = await supabase
          .from('batches')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'sent');

        // Dispatch history stats
        const { count: totalDispatches } = await supabase
          .from('dispatch_history')
          .select('*', { count: 'exact', head: true });

        const { count: successDispatches } = await supabase
          .from('dispatch_history')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'success');

        const { data: contactsData } = await supabase
          .from('dispatch_history')
          .select('contacts_count');

        const totalContacts = contactsData?.reduce((sum, d) => sum + (d.contacts_count || 0), 0) || 0;

        setStats({
          totalUsers: totalUsers || 0,
          totalAdmins: totalAdmins || 0,
          totalCampaigns: totalCampaigns || 0,
          activeCampaigns: activeCampaigns || 0,
          totalBatches: totalBatches || 0,
          readyBatches: readyBatches || 0,
          sentBatches: sentBatches || 0,
          totalDispatches: totalDispatches || 0,
          successDispatches: successDispatches || 0,
          totalContacts,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const successRate = stats.totalDispatches > 0
    ? Math.round((stats.successDispatches / stats.totalDispatches) * 100)
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalAdmins} administradores
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Campanhas</CardTitle>
          <Megaphone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
          <p className="text-xs text-muted-foreground">
            {stats.activeCampaigns} ativas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Batches</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalBatches}</div>
          <p className="text-xs text-muted-foreground">
            {stats.readyBatches} prontos • {stats.sentBatches} enviados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Disparos Realizados</CardTitle>
          <History className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalDispatches}</div>
          <p className="text-xs text-muted-foreground">
            Taxa de sucesso: {successRate}%
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contatos Processados</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalContacts.toLocaleString('pt-BR')}</div>
          <p className="text-xs text-muted-foreground">
            Total de contatos enviados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Média por Usuário</CardTitle>
          <Megaphone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.totalUsers > 0
              ? Math.round(stats.totalCampaigns / stats.totalUsers)
              : 0}
          </div>
          <p className="text-xs text-muted-foreground">
            Campanhas por usuário
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemStats;
