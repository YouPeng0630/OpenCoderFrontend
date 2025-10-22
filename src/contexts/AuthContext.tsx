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

  // Update user role
  const updateUserRole = async (role: UserRole) => {
    try {
      const updatedUser = await api.updateUserRole(role);
      saveUser(updatedUser);
      setUser(updatedUser);
    } catch (error) {
      console.error('Update role failed:', error);
      throw error;
    }
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

  // Clear user role (for role switching)
  const clearRole = () => {
    if (user) {
      const updatedUser = {
        ...user,
        role: null,
        project_id: null,  // Also clear project_id
      };
      saveUser(updatedUser);
      setUser(updatedUser);
      
      // Clear application-related localStorage
      localStorage.removeItem('application_id');
      localStorage.removeItem('applied_project_id');
      
      console.log('🔄 Role cleared, user can now select a new role');
      console.log('🔄 Redirecting to role selection...');
      
      // Force page reload to ensure state is fully updated
      setTimeout(() => {
        window.location.href = '/role-selection';
      }, 100);
    }
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


