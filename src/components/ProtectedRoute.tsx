import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, accountStatus, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Admins bypass account status checks
  if (!isAdmin) {
    if (accountStatus === 'pending') {
      return <Navigate to="/pending-approval" replace />;
    }

    if (accountStatus === 'rejected' || accountStatus === 'suspended') {
      return <Navigate to="/account-blocked" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
