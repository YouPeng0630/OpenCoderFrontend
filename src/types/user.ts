export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole | null;
  createdAt?: string;
}

export type UserRole = 'project-manager' | 'coder';

export interface UserProfile extends User {
  avatar?: string;
  bio?: string;
}


