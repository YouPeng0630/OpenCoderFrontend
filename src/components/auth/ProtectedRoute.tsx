import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: UserRole;
  requireNoRole?: boolean; // For role selection page (only accessible without a role)
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireRole,
  requireNoRole = false,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while loading
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

  // First layer: Check if logged in
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Second layer: Check if role selection is needed
  if (!requireNoRole && !user.role) {
    return <Navigate to="/role-selection" replace />;
  }

  // Special logic for role selection page: only accessible without a role
  if (requireNoRole && user.role) {
    // Already has role, redirect to corresponding page
    const targetPath = user.role === 'project-manager' ? '/project-manager' : '/coder';
    return <Navigate to={targetPath} replace />;
  }

  // Third layer: Check role permissions
  if (requireRole && user.role !== requireRole) {
    // Role mismatch, redirect to corresponding role's page
    const targetPath = user.role === 'project-manager' ? '/project-manager' : '/coder';
    return <Navigate to={targetPath} replace />;
  }

  // All checks passed, render children
  return <>{children}</>;
};


