import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  FolderKanban,
  Settings,
  HelpCircle,
  LogOut,
  ShieldCheck,
  ClipboardCheck,
  Users,
  Database,
  Bookmark,
  Plus,
  Shield,
  ScrollText,
  Bell,
  Archive,
  ChevronLeft,
  ChevronRight,
  X,
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
      { label: "Other Datasets", icon: Database, to: "/datasets" },
      { label: "Archived Datasets", icon: Archive, to: "/archived-datasets" },
      { label: "Bookmarks", icon: Bookmark, to: "/bookmarks" },
      { label: "Notifications", icon: Bell, to: "/notifications" },
      { label: "Settings", icon: Settings, to: "/profile" },
    ],
  },
  researcher: {
    title: "AASTU ORDP",
    subtitle: "Open Research Data",
    nav: [
      { label: "Dashboard", icon: LayoutGrid, to: "/researcher-dashboard" },
      { label: "My Datasets", icon: FolderKanban, to: "/my-datasets" },
      { label: "Archived Datasets", icon: Archive, to: "/archived-datasets" },
      { label: "Other Datasets", icon: Database, to: "/datasets" },
      { label: "Bookmarks", icon: Bookmark, to: "/bookmarks" },
      { label: "Notifications", icon: Bell, to: "/notifications" },
      { label: "Settings", icon: Settings, to: "/profile" },
    ],
  },
  reviewer: {
    title: "ORDP",
    subtitle: "Academic Intelligence",
    nav: [
      { label: "Dashboard", icon: LayoutGrid, to: "/reviewer-dashboard" },
      { label: "Datasets", icon: Database, to: "/datasets" },
      { label: "Review Datasets", icon: ClipboardCheck, to: "/reviewer/review-queue" },
      { label: "Archive Requests", icon: Archive, to: "/reviewer/archive-requests" },
      { label: "Notifications", icon: Bell, to: "/notifications" },
      { label: "Settings", icon: Settings, to: "/profile" },
    ],
  },
  admin: {
    title: "ORDP Admin",
    subtitle: "Research Portal",
    cta: { label: "System Audit", to: "/admin-dashboard?tab=audit", icon: Shield },
    nav: [
      { label: "Overview", icon: LayoutGrid, to: "/admin-dashboard" },
      { label: "Datasets", icon: Database, to: "/admin-dashboard?tab=datasets" },
      { label: "Audit Log", icon: ScrollText, to: "/admin/audit-log" },
      { label: "Archived Datasets", icon: Archive, to: "/admin/archived-datasets" },
      { label: "Users", icon: Users, to: "/admin-dashboard?tab=users" },
      { label: "Notifications", icon: Bell, to: "/notifications" },
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
  if (to === "/reviewer/review-queue" && pathname.startsWith("/reviewer/review")) return true;
  if (pathname !== path) return false;
  if (!query) return !search;
  return search === `?${query}`;
}

export default function DashboardSidebar({
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse: controlledOnToggleCollapse,
  isMobileOpen: controlledIsMobileOpen,
  onCloseMobile: controlledOnCloseMobile,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const roleKey = getRoleKey(user);
  const config = ROLE_CONFIG[roleKey];
  const dashboardPath = getDashboardPath(user);
  const { pathname, search } = location;

  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);

  const collapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalCollapsed;
  const mobileOpen = controlledIsMobileOpen !== undefined ? controlledIsMobileOpen : internalMobileOpen;

  const handleToggleCollapse = () => {
    if (controlledOnToggleCollapse) {
      controlledOnToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem("sidebar_collapsed", String(next));
        return next;
      });
    }
  };

  const handleCloseMobile = () => {
    if (controlledOnCloseMobile) {
      controlledOnCloseMobile();
    } else {
      setInternalMobileOpen(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileOpen) {
        handleCloseMobile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  async function handleSignOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      {/* Desktop Sidebar (Collapsible, Full Height) */}
      <aside
        className={`hidden lg:flex flex-col h-screen max-h-screen sticky top-0 bg-navy text-slate-300 shrink-0 border-r border-white/10 z-30 transition-[width] duration-300 ease-in-out select-none ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Header & Branding */}
        <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between min-h-[4.25rem]">
          <Link to={dashboardPath} className="flex items-center gap-3 overflow-hidden">
            <img src={logo} alt="AASTU" className="h-9 w-9 object-contain shrink-0" />
            {!collapsed && (
              <div className="min-w-0 transition-opacity duration-200">
                <p className="text-sm font-bold text-white leading-tight truncate">{config.title}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{config.subtitle}</p>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition shrink-0 ml-auto"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto min-h-0 custom-scrollbar">
          {config.nav.map(({ label, icon: Icon, to }) => {
            const active = isNavActive(to, pathname, search);
            return (
              <Link
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={[
                  "flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition group relative",
                  collapsed ? "justify-center px-0" : "px-3",
                  active
                    ? "bg-gold text-navy font-semibold shadow-xs"
                    : "text-slate-400 hover:bg-white/5 hover:text-white",
                ].join(" ")}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}

          {isReviewer(user) && roleKey !== "reviewer" && (
            <Link
              to="/reviewer/review-queue"
              title={collapsed ? "Review Queue" : undefined}
              className={[
                "flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition",
                collapsed ? "justify-center px-0" : "px-3",
              ].join(" ")}
            >
              <ClipboardCheck className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">Review Queue</span>}
            </Link>
          )}

          {isAdmin(user) && roleKey !== "admin" && (
            <Link
              to="/admin-dashboard"
              title={collapsed ? "Admin" : undefined}
              className={[
                "flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition",
                collapsed ? "justify-center px-0" : "px-3",
              ].join(" ")}
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">Admin</span>}
            </Link>
          )}
        </nav>

        {/* Footer Actions */}
        <div className="px-3 py-4 space-y-1 border-t border-white/10 shrink-0">
          <Link
            to="/support"
            title={collapsed ? "Support" : undefined}
            className={`flex items-center gap-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white transition ${
              collapsed ? "justify-center px-0" : "px-3"
            }`}
          >
            <HelpCircle className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Support</span>}
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            title={collapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center gap-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white transition ${
              collapsed ? "justify-center px-0" : "px-3"
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer (Responsive Slide-over) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            onClick={handleCloseMobile}
          />

          {/* Slide-out Sidebar Panel */}
          <aside className="relative flex flex-col w-72 max-w-[85vw] h-full bg-navy text-slate-300 shadow-2xl z-10 animate-in slide-in-from-left duration-300">
            {/* Mobile Header with Close Button */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between min-h-[4.25rem]">
              <Link to={dashboardPath} onClick={handleCloseMobile} className="flex items-center gap-3">
                <img src={logo} alt="AASTU" className="h-9 w-9 object-contain shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white leading-tight truncate">{config.title}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{config.subtitle}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={handleCloseMobile}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto min-h-0">
              {config.nav.map(({ label, icon: Icon, to }) => {
                const active = isNavActive(to, pathname, search);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={handleCloseMobile}
                    className={[
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                      active
                        ? "bg-gold text-navy font-semibold shadow-xs"
                        : "text-slate-400 hover:bg-white/5 hover:text-white",
                    ].join(" ")}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{label}</span>
                  </Link>
                );
              })}

              {isReviewer(user) && roleKey !== "reviewer" && (
                <Link
                  to="/reviewer/review-queue"
                  onClick={handleCloseMobile}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition"
                >
                  <ClipboardCheck className="w-5 h-5 shrink-0" />
                  <span>Review Queue</span>
                </Link>
              )}

              {isAdmin(user) && roleKey !== "admin" && (
                <Link
                  to="/admin-dashboard"
                  onClick={handleCloseMobile}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition"
                >
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>Admin</span>
                </Link>
              )}
            </nav>

            {/* Mobile Footer */}
            <div className="px-3 py-4 space-y-1 border-t border-white/10 shrink-0">
              <Link
                to="/support"
                onClick={handleCloseMobile}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white transition"
              >
                <HelpCircle className="w-5 h-5 shrink-0" />
                <span>Support</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  handleCloseMobile();
                  handleSignOut();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white transition"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
