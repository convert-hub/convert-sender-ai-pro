import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UsersManagement from '@/components/admin/UsersManagement';
import SystemStats from '@/components/admin/SystemStats';
import RolesManagement from '@/components/admin/RolesManagement';
import { Users, BarChart3, Shield } from 'lucide-react';

const Admin = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground">
            Gerencie usuários, visualize estatísticas e controle permissões do sistema
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Estatísticas
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <UsersManagement />
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <SystemStats />
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <RolesManagement />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
