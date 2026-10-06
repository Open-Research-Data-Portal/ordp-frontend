import TopBar from "../layouts/TopBar";
import DashboardShell from "../components/dashboard/DashboardShell";
import { useAuth } from "../context/useAuth";

/**
 * Wrapper component that conditionally renders content with either DashboardShell (for authenticated users)
 * or TopBar + flex container (for unauthenticated users).
 *
 * Waits for auth loading to complete before choosing the layout, so that
 * page refreshes or direct URL visits don't briefly flash the wrong layout.
 */
export default function DashboardAwareLayout({ children }) {
  const { isAuthenticated, loading } = useAuth();

  // While auth is being checked (token refresh on reload), render a neutral
  // shell so we don't flash between authenticated and unauthenticated layouts.
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
        <div className="h-16 bg-white border-b border-border" />
        <div className="w-full px-6 lg:px-10 py-10 flex-1">{children}</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <DashboardShell>
        {children}
      </DashboardShell>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      <TopBar />
      <div className="w-full px-6 lg:px-10 py-10 flex-1">
        {children}
      </div>
    </div>
  );
}
