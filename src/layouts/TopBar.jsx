import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, User } from "lucide-react";
import { useAuth } from "../context/useAuth";

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

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="max-w-full px-6 h-16 flex items-center gap-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          {/* Place the AASTU logo file at ordp-frontend/public/aastu-logo.png */}
          <img src="/aastu-logo.png" alt="AASTU logo" className="h-9 w-9 object-contain" />
          <span className="font-bold text-[#0B1526] text-sm sm:text-base whitespace-nowrap">
            AASTU Research Portal
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            to="/datasets"
            className="text-[#8B6F1F] font-semibold border-b-2 border-[#8B6F1F] pb-5 -mb-5"
          >
            Datasets
          </Link>
        </nav>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl mx-auto">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search datasets..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-9 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B6F1F]/30 focus:border-[#8B6F1F]"
            />
            <button
              type="button"
              aria-label="Filters"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Auth area */}
        <div className="flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-sm font-medium text-[#0B1526] hover:bg-gray-50 rounded-lg px-3 py-2 transition"
            >
              <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500" />
              </span>
              <span className="hidden sm:inline">{user?.name || "Dashboard"}</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-[#0B1526] border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium text-white bg-[#8B6F1F] rounded-lg px-4 py-2 hover:bg-[#75601a] transition"
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