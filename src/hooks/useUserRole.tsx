import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'user' | null;

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .order('role', { ascending: false }) // 'admin' vem antes de 'user'
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        const userRole = data?.role as UserRole;
        setRole(userRole);
        setIsAdmin(userRole === 'admin');
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('user'); // Default para user em caso de erro
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();

    // Real-time subscription para mudanças de role
    const subscription = supabase
      .channel('user_role_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchRole();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return { role, isAdmin, loading };
};
