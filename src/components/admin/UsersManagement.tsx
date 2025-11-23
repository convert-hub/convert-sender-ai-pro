import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, ShieldOff, Loader2, Check, X, Clock, Ban, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  account_status: AccountStatus;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'user';
}

interface UserWithRole extends UserProfile {
  roles: ('admin' | 'user')[];
  isAdmin: boolean;
  webhook_url?: string;
}

const UsersManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [editingWebhook, setEditingWebhook] = useState<{userId: string, currentUrl: string, userName: string} | null>(null);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch all user settings (webhooks)
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('user_id, webhook_url');

      if (settingsError) throw settingsError;

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRoles = (roles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role);
        
        const userSettings = (settings || []).find(s => s.user_id === profile.id);
        
        return {
          ...profile,
          roles: userRoles,
          isAdmin: userRoles.includes('admin'),
          webhook_url: userSettings?.webhook_url || 'Não configurado',
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePromoteToAdmin = async (userId: string) => {
    setProcessingUserId(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) throw error;

      toast.success('Usuário promovido a Admin');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error promoting user:', error);
      toast.error(error.message || 'Erro ao promover usuário');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    setProcessingUserId(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      toast.success('Privilégios de Admin removidos');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error removing admin:', error);
      toast.error(error.message || 'Erro ao remover admin');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleUpdateAccountStatus = async (userId: string, newStatus: AccountStatus) => {
    setProcessingUserId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      const statusMessages = {
        approved: 'Usuário aprovado com sucesso',
        rejected: 'Acesso do usuário rejeitado',
        suspended: 'Usuário suspenso',
        pending: 'Usuário colocado em análise',
      };

      toast.success(statusMessages[newStatus]);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error updating account status:', error);
      toast.error(error.message || 'Erro ao atualizar status');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleUpdateWebhook = async () => {
    if (!editingWebhook) return;
    
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ webhook_url: newWebhookUrl })
        .eq('user_id', editingWebhook.userId);

      if (error) throw error;

      toast.success('Webhook atualizado com sucesso');
      setEditingWebhook(null);
      setNewWebhookUrl('');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error updating webhook:', error);
      toast.error(error.message || 'Erro ao atualizar webhook');
    }
  };

  const getStatusBadge = (status: AccountStatus) => {
    const badges = {
      pending: <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>,
      approved: <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><Check className="h-3 w-3 mr-1" />Aprovado</Badge>,
      rejected: <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><X className="h-3 w-3 mr-1" />Rejeitado</Badge>,
      suspended: <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300"><Ban className="h-3 w-3 mr-1" />Suspenso</Badge>,
    };
    return badges[status];
  };

  const filteredUsers = statusFilter === 'all' 
    ? users 
    : users.filter(u => u.account_status === statusFilter);

  const pendingCount = users.filter(u => u.account_status === 'pending').length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciamento de Usuários</CardTitle>
        <CardDescription>
          Gerencie usuários, permissões e aprove novos acessos ao sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="space-y-4" onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Todos ({users.length})</TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              Pendentes ({pendingCount})
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
            <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
            <TabsTrigger value="suspended">Suspensos</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Webhook</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || 'Sem nome'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {getStatusBadge(user.account_status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {user.isAdmin && (
                          <Badge variant="default" className="bg-primary">
                            Admin
                          </Badge>
                        )}
                        <Badge variant="secondary">User</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {user.webhook_url && user.webhook_url.length > 30 
                          ? `${user.webhook_url.substring(0, 30)}...` 
                          : user.webhook_url}
                      </code>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end flex-wrap">
                        {/* Webhook Configuration */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingWebhook({ 
                              userId: user.id, 
                              currentUrl: user.webhook_url || '',
                              userName: user.full_name || user.email
                            });
                            setNewWebhookUrl(user.webhook_url || '');
                          }}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Webhook
                        </Button>

                        {/* Account Status Actions */}
                        {user.account_status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateAccountStatus(user.id, 'approved')}
                              disabled={processingUserId === user.id}
                              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                            >
                              {processingUserId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Aprovar
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateAccountStatus(user.id, 'rejected')}
                              disabled={processingUserId === user.id}
                              className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                            >
                              {processingUserId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <X className="h-4 w-4 mr-1" />
                                  Rejeitar
                                </>
                              )}
                            </Button>
                          </>
                        )}

                        {user.account_status === 'approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateAccountStatus(user.id, 'suspended')}
                            disabled={processingUserId === user.id}
                          >
                            {processingUserId === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Ban className="h-4 w-4 mr-1" />
                                Suspender
                              </>
                            )}
                          </Button>
                        )}

                        {(user.account_status === 'rejected' || user.account_status === 'suspended') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateAccountStatus(user.id, 'approved')}
                            disabled={processingUserId === user.id}
                            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                          >
                            {processingUserId === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Aprovar
                              </>
                            )}
                          </Button>
                        )}

                        {/* Admin Role Actions (only for approved users) */}
                        {user.account_status === 'approved' && (
                          user.isAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveAdmin(user.id)}
                              disabled={processingUserId === user.id}
                            >
                              {processingUserId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <ShieldOff className="h-4 w-4 mr-1" />
                                  Remover Admin
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePromoteToAdmin(user.id)}
                              disabled={processingUserId === user.id}
                            >
                              {processingUserId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Shield className="h-4 w-4 mr-1" />
                                  Promover Admin
                                </>
                              )}
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Webhook Edit Dialog */}
      <Dialog open={!!editingWebhook} onOpenChange={() => setEditingWebhook(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Configurando webhook para: <strong>{editingWebhook?.userName}</strong>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL do Webhook</Label>
              <Input
                id="webhook-url"
                type="url"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://n8n.example.com/webhook/..."
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Insira a URL completa do webhook do n8n
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingWebhook(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateWebhook}>
                Salvar Webhook
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UsersManagement;
