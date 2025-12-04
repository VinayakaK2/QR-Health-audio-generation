import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, loading, user } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check for role-based access
    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        // Redirect based on role
        if (user?.role === 'PATIENT') {
            return <Navigate to="/patient/dashboard" replace />;
        } else if (user?.role === 'SUPER_ADMIN') {
            return <Navigate to="/owner/hospitals" replace />;
        } else {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
