import TopBar from "../layouts/TopBar";
import DashboardShell from "../components/dashboard/DashboardShell";
import { useAuth } from "../context/useAuth";

/**
 * Wrapper component that conditionally renders content with either DashboardShell (for authenticated users)
 * or TopBar + flex container (for unauthenticated users).
 * 
 * This allows pages to work in both dashboard and standalone contexts.
 */
export default function DashboardAwareLayout({ children }) {
  const { isAuthenticated } = useAuth();

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
