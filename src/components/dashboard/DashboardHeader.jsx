import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  Menu,
  CheckCircle2,
  AlertCircle,
  Tag,
  Merge,
  Clock,
  ExternalLink,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { getDisplayName, getMediaUrl } from "../../utils/userRoles";
import {
  fetchBellNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../api/notifications";

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return "";
  }
}

function getBellIcon(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("approv")) return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  if (t.includes("reject")) return <AlertCircle className="w-4 h-4 text-red-600" />;
  if (t.includes("merge")) return <Merge className="w-4 h-4 text-gold" />;
  if (t.includes("category")) return <Tag className="w-4 h-4 text-teal-600" />;
  return <Bell className="w-4 h-4 text-navy" />;
}

export default function DashboardHeader({
  title,
  subtitle,
  onToggleMobileMenu,
  isCollapsed,
  onToggleCollapse,
}) {
  const [query, setQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellNotifications, setBellNotifications] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [bellLoading, setBellLoading] = useState(false);

  const bellRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const loadBell = async () => {
    if (!user) return;
    try {
      const res = await fetchBellNotifications(user);
      setUnreadCount(res.unreadCount || 0);
      setBellNotifications(res.notifications || []);
    } catch (e) {
      console.warn("Could not load bell notifications:", e);
    }
  };

  useEffect(() => {
    loadBell();
    window.addEventListener("ordp:notifications-updated", loadBell);
    const interval = setInterval(loadBell, 30000);

    return () => {
      window.removeEventListener("ordp:notifications-updated", loadBell);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setBellOpen(false);
      }
    }
    if (bellOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [bellOpen]);

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/datasets?q=${encodeURIComponent(query.trim())}`);
    }
  }

  const handleMarkAll = async (e) => {
    e.stopPropagation();
    try {
      await markAllNotificationsAsRead(user);
      setUnreadCount(0);
      setBellNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const handleItemClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await markNotificationAsRead(user, notif.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setBellNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch {}
    }
    setBellOpen(false);
    if (notif.link_path) {
      navigate(notif.link_path);
    } else {
      navigate("/notifications");
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-border px-4 sm:px-6 h-[4.25rem] flex items-center gap-3 lg:gap-6">
      {/* Mobile Menu Toggle Button */}
      {onToggleMobileMenu && (
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-navy hover:bg-gray-100 transition shrink-0 cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Desktop Sidebar Collapse Button */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex p-2 rounded-lg text-gray-500 hover:text-navy hover:bg-gray-100 transition shrink-0 cursor-pointer"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <div className="hidden xl:block shrink-0 min-w-[140px]">
        {title && (
          <>
            <h1 className="text-sm font-bold text-navy leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-[11px] text-gray-500 truncate">{subtitle}</p>}
          </>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex-1 min-w-0 max-w-none mx-2 sm:mx-4 lg:mx-6">
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
        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setBellOpen((prev) => !prev)}
            className={`relative p-2 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-navy transition cursor-pointer ${
              bellOpen ? "bg-gray-100 text-navy" : ""
            }`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[1.125rem] h-[1.125rem] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-xs animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Bell Popover Menu */}
          {bellOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden z-50 animate-[fadeSlideIn_0.2s_ease-out]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-[#FBF8F0]">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gold-dark" />
                  <span className="text-xs font-bold text-navy">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAll}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-navy hover:text-gold-dark cursor-pointer transition"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {bellNotifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    <p className="font-medium text-slate-700">All caught up!</p>
                    <p className="mt-1 text-slate-400">No new bell notifications at this time.</p>
                  </div>
                ) : (
                  bellNotifications.slice(0, 5).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleItemClick(notif)}
                      className={`p-3.5 hover:bg-slate-50 cursor-pointer transition flex items-start gap-3 ${
                        !notif.is_read ? "bg-amber-50/30" : ""
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        {getBellIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-xs truncate ${
                              !notif.is_read ? "font-bold text-navy" : "font-semibold text-slate-700"
                            }`}
                          >
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                          {notif.message}
                        </p>
                        {notif.type?.includes("category") && (
                          <span
                            className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              notif.type.includes("approv")
                                ? "bg-emerald-100 text-emerald-800"
                                : notif.type.includes("reject")
                                ? "bg-red-100 text-red-800"
                                : "bg-navy/10 text-navy"
                            }`}
                          >
                            {notif.type.includes("approv")
                              ? "Category Approved"
                              : notif.type.includes("reject")
                              ? "Category Rejected"
                              : "Category Decision"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-center">
                <Link
                  to="/notifications"
                  onClick={() => setBellOpen(false)}
                  className="text-xs font-semibold text-navy hover:text-gold-dark transition inline-flex items-center gap-1.5"
                >
                  View notification history <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label="Help"
          className="p-2 rounded-lg hover:bg-gray-50 text-gray-500 cursor-pointer"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gray-50 transition cursor-pointer"
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
