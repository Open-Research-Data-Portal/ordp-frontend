import { Link, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  FolderKanban,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  ShieldCheck,
  ClipboardCheck,
  Users,
  FileText,
  Database,
  Bookmark,
  Plus,
  Shield,
  Trash2,
  ScrollText,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { getDashboardPath, isAdmin, isReviewer, isResearcher } from "../../utils/userRoles";
import logo from "../../assets/aastulogo.png";

const ROLE_CONFIG = {
  user: {
    title: "Research Hub",
    subtitle: "AASTU Academic Portal",
    cta: { label: "New Submission", to: "/datasets/contribute", icon: Plus },
    nav: [
      { label: "Dashboard", icon: LayoutGrid, to: "/user-dashboard" },
      { label: "My Projects", icon: FolderKanban, to: "/my-datasets" },
      { label: "Analytics", icon: BarChart3, to: "/analytics" },
      { label: "Settings", icon: Settings, to: "/profile" },
    ],
  },
  researcher: {
    title: "AASTU ORDP",
    subtitle: "Open Research Data",
    cta: { label: "Submit Manuscript", to: "/datasets/contribute", icon: Plus },
    nav: [
      { label: "Dashboard", icon: LayoutGrid, to: "/researcher-dashboard" },
      { label: "My Projects", icon: FolderKanban, to: "/my-datasets" },
      { label: "Datasets", icon: Database, to: "/datasets" },
      { label: "Bookmarks", icon: Bookmark, to: "/datasets?tab=bookmarks" },
      { label: "Settings", icon: Settings, to: "/profile" },
    ],
  },
  reviewer: {
    title: "ORDP",
    subtitle: "Academic Intelligence",
    cta: { label: "Submit Dataset", to: "/datasets/contribute", icon: Plus },
    nav: [
      { label: "Dashboard", icon: LayoutGrid, to: "/reviewer-dashboard" },
      { label: "Research Data", icon: Database, to: "/reviewer-dashboard" },
      { label: "Analytics", icon: BarChart3, to: "/analytics" },
      { label: "Publications", icon: FileText, to: "/datasets" },
      { label: "Team", icon: Users, to: "/profile" },
    ],
  },
  admin: {
    title: "ORDP Admin",
    subtitle: "Research Portal",
    cta: { label: "System Audit", to: "/admin-dashboard?tab=audit", icon: Shield },
    nav: [
      { label: "Overview", icon: LayoutGrid, to: "/admin-dashboard" },
      { label: "Audit Log", icon: ScrollText, to: "/admin-dashboard?tab=audit" },
      { label: "Users", icon: Users, to: "/admin-dashboard?tab=users" },
      { label: "Deletion Requests", icon: Trash2, to: "/admin-dashboard?tab=deletions" },
    ],
  },
};

function getRoleKey(user) {
  if (isAdmin(user)) return "admin";
  if (isReviewer(user)) return "reviewer";
  if (isResearcher(user)) return "researcher";
  return "user";
}

function isNavActive(to, pathname, search) {
  const [path, query] = to.split("?");
  if (pathname !== path) return false;
  if (!query) return !search;
  return search === `?${query}`;
}

export default function DashboardSidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const roleKey = getRoleKey(user);
  const config = ROLE_CONFIG[roleKey];
  const dashboardPath = getDashboardPath(user);
  const { pathname, search } = location;

  return (
    <aside className="w-64 shrink-0 bg-navy text-slate-300 flex flex-col min-h-screen">
      {/* Logo + branding */}
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <Link to={dashboardPath} className="flex items-center gap-3">
          <img src={logo} alt="AASTU" className="h-10 w-10 object-contain shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight truncate">{config.title}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{config.subtitle}</p>
          </div>
        </Link>
      </div>

      {/* Primary CTA */}
      <div className="px-4 py-4">
        <Link
          to={config.cta.to}
          className="flex items-center justify-center gap-2 w-full bg-gold hover:bg-gold-dark text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          <config.cta.icon className="w-4 h-4" />
          {config.cta.label}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {config.nav.map(({ label, icon: Icon, to }) => {
          const active = isNavActive(to, pathname, search);
          return (
            <Link
              key={to}
              to={to}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                active
                  ? "bg-gold text-navy"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}

        {isReviewer(user) && roleKey !== "reviewer" && (
          <Link
            to="/reviewer-dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition"
          >
            <ClipboardCheck className="w-4 h-4" />
            Review Queue
          </Link>
        )}

        {isAdmin(user) && roleKey !== "admin" && (
          <Link
            to="/admin-dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition"
          >
            <ShieldCheck className="w-4 h-4" />
            Admin
          </Link>
        )}
      </nav>

      {/* Bottom links */}
      <div className="px-3 pb-6 space-y-0.5 border-t border-white/10 pt-4 mt-auto">
        <Link
          to="/support"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white transition"
        >
          <HelpCircle className="w-4 h-4" /> Support
        </Link>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white transition"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
