import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Legacy page — role selection is replaced by Project Hub.
 * Always redirect to /hub.
 */
export const RoleSelection: React.FC = () => {
  useEffect(() => {
    // no-op; Navigate handles redirect
  }, []);

  return <Navigate to="/hub" replace />;
};
