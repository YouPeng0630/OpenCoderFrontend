import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Login } from '@/pages/Login';
import { AuthCallback } from '@/pages/AuthCallback';
import { RoleSelection } from '@/pages/RoleSelection';
import { ManagerLayout } from '@/pages/manager/ManagerLayout';
import { ManagerDashboard } from '@/pages/manager/Dashboard';
import { CreateProject } from '@/pages/manager/CreateProject';
import { ManagerTags } from '@/pages/manager/Tags';
import { ManagerApplicants } from '@/pages/manager/Applicants';
import { ManagerTasks } from '@/pages/manager/Tasks';
import { ManagerAssignment } from '@/pages/manager/Assignment';
import { ManagerDatabase } from '@/pages/manager/Database';
import { ConsensusResolution } from '@/pages/manager/ConsensusResolution';
import { Coder } from '@/pages/Coder';
import { CoderLayout } from '@/pages/coder/CoderLayout';
import { CoderProgress } from '@/pages/coder/CoderProgress';
import { CoderConsensus } from '@/pages/coder/CoderConsensus';
import { ApplyProject } from '@/pages/coder/ApplyProject';
import { ApplicationPending } from '@/pages/coder/ApplicationPending';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Role selection (authenticated but no role) */}
          <Route
            path="/role-selection"
            element={
              <ProtectedRoute requireNoRole>
                <RoleSelection />
              </ProtectedRoute>
            }
          />

          {/* Create Project - standalone page (no layout) */}
          <Route
            path="/project-manager/create-project"
            element={
              <ProtectedRoute requireRole="project-manager">
                <CreateProject />
              </ProtectedRoute>
            }
          />

          {/* Project Manager routes - nested routing with layout */}
          <Route
            path="/project-manager"
            element={
              <ProtectedRoute requireRole="project-manager">
                <ManagerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="dashboard/:projectId" element={<ManagerDashboard />} />
            <Route path="tags" element={<ManagerTags />} />
            <Route path="applicants" element={<ManagerApplicants />} />
            <Route path="tasks" element={<ManagerTasks />} />
            <Route path="assignment" element={<ManagerAssignment />} />
            <Route path="database" element={<ManagerDatabase />} />
          </Route>

          {/* Coder routes - standalone pages (no layout) */}
          <Route
            path="/coder/apply"
            element={
              <ProtectedRoute requireRole="coder">
                <ApplyProject />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coder/pending"
            element={
              <ProtectedRoute requireRole="coder">
                <ApplicationPending />
              </ProtectedRoute>
            }
          />

          {/* Coder routes - nested routing with layout */}
          <Route
            path="/coder"
            element={
              <ProtectedRoute requireRole="coder">
                <CoderLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="tasks" replace />} />
            <Route path="tasks" element={<Coder noLayout={true} />} />
            <Route path="progress" element={<CoderProgress />} />
            <Route path="consensus" element={<CoderConsensus />} />
            <Route path="consensus/:taskId" element={<ConsensusResolution />} />
          </Route>

          {/* Default route: redirect to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 404 route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;


