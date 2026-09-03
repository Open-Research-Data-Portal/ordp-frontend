import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { getDashboardPath } from "../../utils/userRoles";

export default function DashboardRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-sm text-gray-500">
        Loading dashboard…
      </div>
    );
  }

  const redirectPath = getDashboardPath(user);
  console.log("📍 DashboardRouter redirecting to:", redirectPath);
  return <Navigate to={redirectPath} replace />;
}
