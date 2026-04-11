export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  expiresAt: number | null;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateUserRole: (role: UserRole) => Promise<void>;
  refreshUser: () => void;
  clearRole: () => void;  // Clear user role
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole | null;
  avatar?: string;
  avatar_url?: string;
  project_id?: string | null;
}

export type UserRole = 'project-manager' | 'coder';


