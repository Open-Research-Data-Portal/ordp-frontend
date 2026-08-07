import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, FolderKanban, BarChart3, Settings, HelpCircle, LogOut, Plus } from "lucide-react";
import { useAuth } from "../context/useAuth";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutGrid, to: "/dashboard" },
  { label: "My Datasets", icon: FolderKanban, to: "/datasets" },
  { label: "Analytics", icon: BarChart3, to: "/analytics" },
  { label: "Settings", icon: Settings, to: "/profile" },
];

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <aside className="w-64 shrink-0 bg-navy text-slate-300 flex flex-col justify-between min-h-screen">
      <div>
        <div className="px-6 py-6">
          <h1 className="text-lg font-serif font-bold text-white tracking-wide">Research Hub</h1>
          <p className="text-xs text-slate-400 mt-1">AASTU Academic Portal</p>
        </div>

        <nav className="mt-2 px-3 space-y-1">
          {NAV_ITEMS.map(({ label, icon: Icon, to }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                  active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
                ].join(" ")}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 mt-6">
          <Link
            to="/submissions/new"
            className="flex items-center justify-center gap-2 bg-[#F5C453] text-navy font-semibold
                       text-sm rounded-xl py-3 hover:bg-[#e8b73f] transition"
          >
            <Plus className="w-4 h-4" /> New Submission
          </Link>
        </div>
      </div>

      <div className="px-3 pb-6 space-y-1">
        <Link to="/support" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white">
          <HelpCircle className="w-4 h-4" /> Support
        </Link>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
