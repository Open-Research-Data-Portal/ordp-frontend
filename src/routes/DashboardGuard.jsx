import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getDashboardPath } from "../utils/userRoles";

/**
 * Wrapper for dashboard pages to ensure users are redirected to the correct
 * dashboard based on their profile completion status.
 * 
 * If a user tries to access /user-dashboard but their profile is complete,
 * or tries to access /researcher-dashboard but their profile is incomplete,
 * they'll be redirected to the correct dashboard.
 * 
 * @param {React.ReactNode} children - The dashboard page component
 * @param {string} expectedDashboard - The dashboard that should be accessed (e.g., '/user-dashboard')
 */
export default function DashboardGuard({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F3] text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Get the dashboard path the user should be on
  const correctDashboardPath = getDashboardPath(user);

  // If user is not on the correct dashboard, redirect them
  if (location.pathname !== correctDashboardPath) {
    return <Navigate to={correctDashboardPath} replace />;
  }

  return children;
}
