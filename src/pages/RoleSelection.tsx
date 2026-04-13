import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { Briefcase, Code2, Check, ArrowRight, LogOut } from 'lucide-react';

export const RoleSelection: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { updateUserRole, user, logout } = useAuth();
  const navigate = useNavigate();

  const roles = [
    {
      value: 'project-manager' as UserRole,
      title: 'Project Manager',
      description: 'Manage projects, teams, and tasks with analytics',
      icon: Briefcase,
      features: ['Task Management', 'Team Collaboration', 'Project Overview', 'Data Analytics'],
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      value: 'coder' as UserRole,
      title: 'Coder',
      description: 'Apply to join projects and annotate data',
      icon: Code2,
      features: ['Apply to Join Projects', 'Code Sentences', 'Track Your Progress', 'Resolve Consensus'],
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
  ];

  const handleSubmit = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    try {
      await updateUserRole(selectedRole);
      
      // Navigate to corresponding page based on role
      const targetPath = selectedRole === 'project-manager' ? '/project-manager' : '/coder';
      navigate(targetPath, { replace: true });
    } catch (error) {
      alert('Failed to set role, please try again');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 px-4 py-12">
      <div className="w-full max-w-4xl">
        {/* Logout button in top right corner */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
        
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Welcome, {user?.username}!
          </h1>
          <p className="text-lg text-muted-foreground">
            Please select your role to continue
          </p>
        </div>

        <RadioGroup.Root
          value={selectedRole || ''}
          onValueChange={(value) => setSelectedRole(value as UserRole)}
          className="grid md:grid-cols-2 gap-6 mb-8"
        >
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.value;

            return (
              <RadioGroup.Item
                key={role.value}
                value={role.value}
                className={`relative bg-background rounded-xl p-6 border-2 transition-all cursor-pointer hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  isSelected
                    ? `${role.borderColor} shadow-md`
                    : 'border-border hover:border-accent'
                }`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-lg ${role.bgColor}`}>
                    <Icon className={`w-6 h-6 ${role.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                      {role.title}
                      {isSelected && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground mb-2">Features:</p>
                  <ul className="space-y-1">
                    {role.features.map((feature) => (
                      <li key={feature} className="text-sm text-muted-foreground flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <RadioGroup.Indicator className="absolute inset-0 pointer-events-none" />
              </RadioGroup.Item>
            );
          })}
        </RadioGroup.Root>

        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!selectedRole || isLoading}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-lg"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                Setting Up...
              </>
            ) : (
              <>
                Confirm Selection
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          ⚠️ Role selection cannot be changed later, please choose carefully
        </p>
      </div>
    </div>
  );
};


