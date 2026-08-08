import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  AuthContextType,
  LoginCredentials,
  User,
  UserRole,
} from '@/types/auth';
import * as api from '@/lib/api';
import {
  getAuthState,
  saveUser,
  getUser,
  getToken,
  clearAllStorage,
} from '@/lib/storage';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize: restore state from localStorage
  useEffect(() => {
    const initAuth = () => {
      const authState = getAuthState();
      const storedUser = getUser();

      if (authState && authState.isAuthenticated && storedUser) {
        setUser(storedUser);
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Login (using Google OAuth, this function is a placeholder)
  const login = async (credentials: LoginCredentials) => {
    console.log('Login via Google OAuth, not using credentials:', credentials);
    throw new Error('Please use Google OAuth login instead');
  };

  // Logout
  const logout = () => {
    try {
      api.logout().catch(console.error);
      clearAllStorage();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Deprecated: use enterProject(projectId, asRole) via Hub
  const updateUserRole = async (_role: UserRole) => {
    throw new Error(
      'Direct role updates are disabled. Open /hub and Enter as Manager or Coder.'
    );
  };

  // Refresh user info from localStorage
  const refreshUser = () => {
    const storedUser = getUser();
    if (storedUser) {
      console.log('🔄 Refreshing user from localStorage:', storedUser);
      console.log('  📋 User project_id:', storedUser.project_id);
      console.log('  📋 Creating new user object to force re-render');
      // Force a new object reference to trigger React re-render
      setUser({ ...storedUser });
    } else {
      console.warn('⚠️ No user found in localStorage');
    }
  };

  const apiBase = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';

  const enterProject = async (projectId: string, asRole?: 'manager' | 'coder') => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(
      `${apiBase}/api/users/me/active-project?token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          as_role: asRole || null,
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const detail = err.detail || `Failed to enter project (${res.status})`;
      throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }
    const data = await res.json();
    const role: UserRole | null =
      data.role === 'manager' ? 'project-manager' :
      data.role === 'coder' ? 'coder' : null;
    const updatedUser: User = {
      ...(user as User),
      project_id: data.project_id,
      role,
    };
    saveUser(updatedUser);
    setUser(updatedUser);
  };

  const goToHub = async () => {
    const token = getToken();
    if (token) {
      try {
        await fetch(
          `${apiBase}/api/users/me/active-project?token=${encodeURIComponent(token)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: null }),
          }
        );
      } catch (e) {
        console.warn('Failed to clear active project on server:', e);
      }
    }
    if (user) {
      const updatedUser = { ...user, role: null, project_id: null };
      saveUser(updatedUser);
      setUser(updatedUser);
    }
    localStorage.removeItem('application_id');
    localStorage.removeItem('applied_project_id');
    window.location.href = '/hub';
  };

  // Clear active project and return to Hub
  const clearRole = () => {
    goToHub();
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUserRole,
    refreshUser,
    clearRole,
    enterProject,
    goToHub,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


