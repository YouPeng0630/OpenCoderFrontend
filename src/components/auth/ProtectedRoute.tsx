import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: UserRole;
  /** Hub / create / apply: any authenticated user */
  requireAuthOnly?: boolean;
  /** @deprecated use Hub instead of permanent role selection */
  requireNoRole?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireRole,
  requireAuthOnly = false,
  requireNoRole = false,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Legacy role-selection → always send to Hub
  if (requireNoRole) {
    return <Navigate to="/hub" replace />;
  }

  // Hub / create / apply: authenticated is enough
  if (requireAuthOnly) {
    return <>{children}</>;
  }

  // Manager / Coder shells need an active project + matching role
  if (requireRole) {
    if (!user.role || !user.project_id) {
      return <Navigate to="/hub" replace />;
    }
    if (user.role !== requireRole) {
      const targetPath = user.role === 'project-manager' ? '/project-manager' : '/coder';
      return <Navigate to={targetPath} replace />;
    }
  }

  // Authenticated but no active project → Hub (unless already going somewhere auth-only)
  if (!requireRole && !user.role) {
    // Allow through only if no role required (shouldn't hit often)
  }

  return <>{children}</>;
};
