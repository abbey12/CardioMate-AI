import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireFacility?: boolean;
};

export function ProtectedRoute({
  children,
  requireAdmin,
  requireFacility,
}: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isFacility } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/facility/dashboard" replace />;
  }

  if (requireFacility && !isFacility) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}

