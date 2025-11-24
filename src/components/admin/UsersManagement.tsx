import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, ShieldOff, Loader2, Check, X, Clock, Ban, Settings, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

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
  daily_dispatch_limit?: number;
}

const getLimitBadgeVariant = (limit: number): "default" | "secondary" | "outline" => {
  if (limit === 50) return "secondary"; // Padrão
  if (limit < 50) return "outline"; // Reduzido
  return "default"; // Aumentado
};

const UsersManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [editingWebhook, setEditingWebhook] = useState<{userId: string, currentUrl: string, userName: string} | null>(null);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [editingLimit, setEditingLimit] = useState<{userId: string, currentLimit: number, userName: string} | null>(null);
  const [newLimit, setNewLimit] = useState<number>(50);
  const [deletingUser, setDeletingUser] = useState<{userId: string, userName: string, email: string} | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

      // Fetch user settings (webhook + daily limit)
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('user_id, webhook_url, daily_dispatch_limit');

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
          daily_dispatch_limit: userSettings?.daily_dispatch_limit || 50,
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
    
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
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

  const handleUpdateLimit = async () => {
    if (!editingLimit) return;

    // Validação
    if (newLimit < 1 || newLimit > 1000) {
      toast.error('O limite deve estar entre 1 e 1000 envios por dia');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ daily_dispatch_limit: newLimit })
        .eq('user_id', editingLimit.userId);

      if (error) throw error;

      toast.success(`Limite diário atualizado para ${newLimit} envios/dia`);
      setEditingLimit(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating limit:', error);
      toast.error('Erro ao atualizar limite');
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

  const handleDeleteUser = async (userId: string) => {
    if (!deletingUser) return;

    setProcessingUserId(userId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      // Call Edge Function to delete user
      const response = await fetch(
        `https://gdcnyznabtjplewtdylp.supabase.co/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir usuário');
      }

      // Update local state
      setUsers(prev => prev.filter(u => u.id !== userId));

      toast.success('Conta excluída com sucesso', {
        description: `A conta de ${deletingUser.userName || deletingUser.email} foi permanentemente removida.`,
      });

      setDeletingUser(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir conta', {
        description: error.message || 'Ocorreu um erro ao tentar excluir a conta',
      });
    } finally {
      setProcessingUserId(null);
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
                  <TableHead>Limite Diário</TableHead>
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
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={getLimitBadgeVariant(user.daily_dispatch_limit || 50)}
                          className="font-mono"
                        >
                          {user.daily_dispatch_limit || 50}/dia
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingLimit({
                              userId: user.id,
                              currentLimit: user.daily_dispatch_limit || 50,
                              userName: user.full_name || user.email
                            });
                            setNewLimit(user.daily_dispatch_limit || 50);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
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

                        {/* Delete Account Button */}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeletingUser({
                            userId: user.id,
                            userName: user.full_name || 'Usuário',
                            email: user.email
                          })}
                          disabled={processingUserId === user.id || user.id === currentUserId}
                          className="opacity-70 hover:opacity-100"
                        >
                          {processingUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Excluir Conta
                            </>
                          )}
                        </Button>
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

      {/* Daily Limit Edit Dialog */}
      <Dialog open={!!editingLimit} onOpenChange={() => setEditingLimit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Limite Diário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Configurando limite diário para: <strong>{editingLimit?.userName}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Limite atual: <strong>{editingLimit?.currentLimit} envios/dia</strong>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="daily-limit">Novo Limite Diário</Label>
              <Input
                id="daily-limit"
                type="number"
                min="1"
                max="1000"
                value={newLimit}
                onChange={(e) => setNewLimit(parseInt(e.target.value))}
                placeholder="50"
              />
              <p className="text-xs text-muted-foreground">
                Número máximo de contatos que o usuário pode enviar por dia (1-1000)
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingLimit(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateLimit}>
                Salvar Limite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl">
              ⚠️ Excluir Conta Permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              <p className="font-semibold text-lg text-foreground">
                {deletingUser?.userName || 'Usuário desconhecido'}
              </p>
              <p className="text-sm text-muted-foreground">
                {deletingUser?.email}
              </p>
              
              <Separator className="my-4" />
              
              <Alert variant="destructive" className="text-left">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Esta ação é irreversível!</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p>Os seguintes dados serão <strong>permanentemente excluídos</strong>:</p>
                  <ul className="list-disc list-inside text-xs space-y-1 ml-2">
                    <li>Perfil e informações pessoais</li>
                    <li>Todas as campanhas criadas</li>
                    <li>Todos os blocos de contatos</li>
                    <li>Histórico de disparos</li>
                    <li>Configurações e estatísticas</li>
                    <li>Permissões e roles</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <p className="text-sm font-medium text-muted-foreground">
                Tem certeza que deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel 
              onClick={() => setDeletingUser(null)}
              disabled={processingUserId === deletingUser?.userId}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUser && handleDeleteUser(deletingUser.userId)}
              disabled={processingUserId === deletingUser?.userId}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {processingUserId === deletingUser?.userId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Sim, Excluir Permanentemente
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default UsersManagement;
