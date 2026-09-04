import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, HelpCircle, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { getDisplayName, getMediaUrl } from "../../utils/userRoles";

export default function DashboardHeader({ title, subtitle }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/datasets?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-border px-4 sm:px-6 h-[4.25rem] flex items-center gap-4 lg:gap-6">
      <div className="hidden xl:block shrink-0 w-[160px]">
        {title && (
          <>
            <h1 className="text-sm font-bold text-navy leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-[11px] text-gray-500 truncate">{subtitle}</p>}
          </>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex-1 min-w-0 max-w-none mx-4 lg:mx-8">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search datasets, researchers, keywords…"
            className="w-full bg-gray-50 border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-colors"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => navigate("/notifications")}
          className="relative p-2 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-navy transition"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <button type="button" aria-label="Help" className="p-2 rounded-lg hover:bg-gray-50 text-gray-500">
          <HelpCircle className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gray-50 transition"
        >
          <div className="w-8 h-8 rounded-full bg-gold-light overflow-hidden flex items-center justify-center text-xs font-bold text-navy">
            {user?.profile_picture || user?.profile?.profile_picture ? (
              <img
                src={getMediaUrl(user?.profile_picture || user?.profile?.profile_picture)}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              getDisplayName(user).charAt(0).toUpperCase()
            )}
          </div>
          <span className="hidden sm:block text-sm font-medium text-navy max-w-[120px] truncate">
            {getDisplayName(user)}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
        </button>
      </div>
    </header>
  );
}
