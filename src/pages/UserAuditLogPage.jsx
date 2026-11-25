import DashboardShell from "../components/dashboard/DashboardShell";
import UserManagementAudit from "../components/UserManagementAudit";

export default function UserAuditLogPage() {
  return <DashboardShell><div className="mx-auto max-w-5xl space-y-5">
    <h1 className="text-2xl font-bold text-navy">Audit Log</h1>
    <UserManagementAudit />
  </div></DashboardShell>;
}
