import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { getDisplayName, getDashboardPath } from "../utils/userRoles";
import logo from "../assets/aastulogo.png";

export default function TopBar() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/datasets?q=${encodeURIComponent(query.trim())}`);
    }
  }

  const displayName = getDisplayName(user);
  const initial = (displayName.charAt(0) || "U").toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4 lg:gap-6">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={logo} alt="AASTU" className="h-9 w-9 object-contain" />
          <span className="font-bold text-navy text-sm sm:text-base whitespace-nowrap hidden sm:inline">
            AASTU Research Portal
          </span>
        </Link>

        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0 max-w-4xl mx-auto">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search datasets by title, keyword, subject, or researcher…"
              className="w-full bg-gray-50 border border-border rounded-xl pl-11 pr-24 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                aria-label="Filters"
                className="p-1.5 rounded-lg text-gray-400 hover:text-navy hover:bg-white transition"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              <button
                type="submit"
                className="hidden sm:inline-flex items-center gap-1.5 bg-gold hover:bg-gold-dark text-white text-xs font-semibold rounded-lg px-3.5 py-1.5 transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        <div className="flex items-center gap-2 shrink-0">
          {isAuthenticated ? (
            <Link
              to={getDashboardPath(user)}
              className="flex items-center gap-2 text-sm font-semibold text-navy hover:bg-gray-50 rounded-xl px-3 py-1.5 border border-slate-200/80 shadow-xs transition"
            >
              <span className="w-8 h-8 rounded-full bg-gold-light flex items-center justify-center text-xs font-bold text-navy shrink-0">
                {initial}
              </span>
              <span className="inline max-w-[130px] sm:max-w-[160px] truncate text-xs sm:text-sm font-bold text-navy">
                {displayName}
              </span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-navy border border-border rounded-lg px-4 py-2 hover:bg-gray-50 transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium text-white bg-gold rounded-lg px-4 py-2 hover:bg-gold-dark transition"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
