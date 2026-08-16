import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, FolderKanban, BarChart3, Settings, HelpCircle, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../context/useAuth";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutGrid, to: "/researcher-dashboard" },
  { label: "My Datasets", icon: FolderKanban, to: "/my-datasets" },
  { label: "Analytics", icon: BarChart3, to: "/analytics" },
  { label: "Settings", icon: Settings, to: "/profile" },
];

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={[
        "shrink-0 bg-navy text-slate-300 flex flex-col justify-between min-h-[calc(100vh-4rem)] transition-all duration-200",
        collapsed ? "w-20" : "w-64",
      ].join(" ")}
    >
      <div>
        <nav className="mt-4 px-3 space-y-1">
          {NAV_ITEMS.map(({ label, icon: Icon, to }, index) => {
            const active = location.pathname === to;
            const isFirst = index === 0;

            return (
              <div key={to} className="flex items-center gap-1">
                <Link
                  to={to}
                  title={collapsed ? label : undefined}
                  className={[
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition flex-1 min-w-0",
                    collapsed ? "justify-center" : "",
                    active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>

                {/* Collapse toggle sits beside the Dashboard row, same line as its text */}
                {isFirst && (
                  <button
                    type="button"
                    onClick={() => setCollapsed((v) => !v)}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className="shrink-0 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg p-1.5 transition"
                  >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </button>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="px-3 pb-6 space-y-1">
        <Link
          to="/support"
          title={collapsed ? "Support" : undefined}
          className={[
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white",
            collapsed ? "justify-center" : "",
          ].join(" ")}
        >
          <HelpCircle className="w-4 h-4 shrink-0" /> {!collapsed && "Support"}
        </Link>
        <button
          type="button"
          onClick={logout}
          title={collapsed ? "Sign Out" : undefined}
          className={[
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white",
            collapsed ? "justify-center" : "",
          ].join(" ")}
        >
          <LogOut className="w-4 h-4 shrink-0" /> {!collapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}