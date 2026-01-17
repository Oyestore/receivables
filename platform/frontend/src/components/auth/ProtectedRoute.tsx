import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { canAccessRoute } from '../../config/navigation';
import { UserRole } from '../../types/auth.types';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRoles,
}) => {
    const { user, isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        // Redirect to login, save attempted location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRoles && user && !requiredRoles.includes(user.role)) {
        // User doesn't have required role, redirect to their default route
        return <Navigate to={`/${user.role}`} replace />;
    }

    if (user && !canAccessRoute(user.role as UserRole, location.pathname)) {
        // User trying to access unauthorized route
        return <Navigate to={`/${user.role}`} replace />;
    }

    return <>{children}</>;
};
