import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to home if not logged in, but keep the attempted URL state
    // Note: In a real app, you might pop the login modal here via context
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    // If user exists but role is not allowed
    if (user.role === 'student') {
      return <Navigate to="/dashboard" replace />;
    }
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};