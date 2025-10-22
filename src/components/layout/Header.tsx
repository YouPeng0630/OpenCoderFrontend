import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, FileText, LayoutDashboard } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Avatar from '@radix-ui/react-avatar';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const getRoleIcon = () => {
    if (user?.role === 'project-manager') {
      return <LayoutDashboard className="h-6 w-6 text-primary" />;
    }
    return <FileText className="h-6 w-6 text-primary" />;
  };

  const getRoleText = () => {
    if (!user?.role) return 'No Role';
    return user.role === 'project-manager' ? 'Manager' : 'Coder';
  };

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {user?.role && (
            <>
              {getRoleIcon()}
              <span className="text-xl font-bold text-gray-900">{getRoleText()}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity outline-none">
                <Avatar.Root className="inline-flex h-9 w-9 select-none items-center justify-center overflow-hidden rounded-full bg-primary/20">
                  <Avatar.Fallback className="text-sm font-medium text-primary">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </Avatar.Fallback>
                </Avatar.Root>
                <span className="text-sm font-medium text-foreground hidden sm:inline">
                  {user?.username}
                </span>
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[220px] bg-background rounded-md p-2 shadow-lg border border-border"
                sideOffset={5}
              >
                <DropdownMenu.Item
                  className="px-3 py-2 text-sm outline-none cursor-default rounded select-none"
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User size={16} />
                    <div>
                      <div className="font-medium text-foreground">{user?.username}</div>
                      <div className="text-xs">{user?.email}</div>
                    </div>
                  </div>
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="h-px bg-border my-1" />

                <DropdownMenu.Item
                  className="px-3 py-2 text-sm outline-none cursor-pointer hover:bg-accent rounded flex items-center gap-2"
                  onSelect={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
};


