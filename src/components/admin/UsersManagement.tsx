import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, ShieldOff, Loader2 } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'user';
}

interface UserWithRole extends UserProfile {
  roles: ('admin' | 'user')[];
  isAdmin: boolean;
}

const UsersManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

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

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRoles = (roles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role);
        
        return {
          ...profile,
          roles: userRoles,
          isAdmin: userRoles.includes('admin'),
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
          Gerencie usuários e suas permissões no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Data de Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.full_name || 'Sem nome'}
                </TableCell>
                <TableCell>{user.email}</TableCell>
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
                  {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="text-right">
                  {user.isAdmin ? (
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
                          <ShieldOff className="h-4 w-4 mr-2" />
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
                          <Shield className="h-4 w-4 mr-2" />
                          Promover a Admin
                        </>
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default UsersManagement;
