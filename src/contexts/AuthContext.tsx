import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/hooks/useUserRole';

type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole;
  isAdmin: boolean;
  accountStatus: AccountStatus | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user role and account status when user changes
  useEffect(() => {
    if (!user) {
      setRole(null);
      setIsAdmin(false);
      setAccountStatus(null);
      return;
    }

    const fetchUserData = async () => {
      try {
        // Fetch profile with account status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('account_status')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        
        setAccountStatus(profile?.account_status || 'pending');

        // Fetch user role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (roleError) throw roleError;

        const userRole = roleData?.role as UserRole;
        setRole(userRole || 'user');
        setIsAdmin(!!roleData);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setRole('user');
        setIsAdmin(false);
        setAccountStatus('pending');
      }
    };

    fetchUserData();

    // Real-time subscriptions for role and profile changes
    const roleSubscription = supabase
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
          fetchUserData();
        }
      )
      .subscribe();

    const profileSubscription = supabase
      .channel('user_profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          fetchUserData();
        }
      )
      .subscribe();

    return () => {
      roleSubscription.unsubscribe();
      profileSubscription.unsubscribe();
    };
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        role,
        isAdmin,
        accountStatus,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
