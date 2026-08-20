import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import { DashboardFooter } from "./dashboardUi";
import "./dashboardAnimations.css";

export default function DashboardShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex bg-bg">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <DashboardHeader title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto px-6 lg:px-8 py-6">
          {children}
          <DashboardFooter />
        </main>
      </div>
    </div>
  );
}
