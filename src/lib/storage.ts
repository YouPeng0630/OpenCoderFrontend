import { AuthState, User } from '@/types/auth';

// Storage keys
const STORAGE_KEYS = {
  AUTH: 'auth_state',
  USER: 'user_info',
} as const;

// ==================== Auth Storage ====================

export const saveAuthState = (state: AuthState): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save auth state:', error);
  }
};

export const getAuthState = (): AuthState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (!stored) return null;

    const state: AuthState = JSON.parse(stored);
    
    // Check if token is expired
    if (state.expiresAt && Date.now() > state.expiresAt) {
      clearAuthState();
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to get auth state:', error);
    return null;
  }
};

export const clearAuthState = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  } catch (error) {
    console.error('Failed to clear auth state:', error);
  }
};

// ==================== User Storage ====================

export const saveUser = (user: User): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to save user:', error);
  }
};

export const getUser = (): User | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
};

export const clearUser = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER);
  } catch (error) {
    console.error('Failed to clear user:', error);
  }
};

// ==================== Clear All ====================

export const clearAllStorage = (): void => {
  clearAuthState();
  clearUser();
};

// ==================== Token Helpers ====================

export const isTokenExpired = (): boolean => {
  const authState = getAuthState();
  if (!authState || !authState.expiresAt) return true;
  return Date.now() > authState.expiresAt;
};

export const getToken = (): string | null => {
  const authState = getAuthState();
  return authState?.token || null;
};


