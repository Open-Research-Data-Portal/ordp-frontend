import { useState, useEffect, useRef, useMemo } from "react";
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
  Check,
  Sparkles,
  ShieldCheck,
  ClipboardCheck,
  LayoutGrid,
  Shield,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import {
  getDisplayName,
  getMediaUrl,
  getProfilePicture,
  getAvailableRoles,
  getActiveRole,
  setActiveRole,
  isAdmin,
} from "../../utils/userRoles";
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [, setRoleTick] = useState(0);

  const bellRef = useRef(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleSync = () => setRoleTick((t) => t + 1);
    window.addEventListener("ordp:active-role-changed", handleSync);
    window.addEventListener("ordp:profile-updated", handleSync);
    return () => {
      window.removeEventListener("ordp:active-role-changed", handleSync);
      window.removeEventListener("ordp:profile-updated", handleSync);
    };
  }, []);

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

  // Close popovers on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setBellOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    if (bellOpen || profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [bellOpen, profileOpen]);

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

  const activeRole = getActiveRole(user);
  const availableRoles = getAvailableRoles(user);
  // Memoize avatarUrl so we don't re-read from localStorage on every render.
  // The profile-picture cache in userRoles.js handles the heavy lifting;
  // useMemo adds a React-level guard so even that cheap call is skipped.
  const avatarUrl = useMemo(() => getProfilePicture(user), [user, roleTick]);
  const displayName = getDisplayName(user);

  const handleSwitchRole = (role, path) => {
    setActiveRole(role);
    setProfileOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate("/login", { replace: true });
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

        <Link
          to="/support"
          aria-label="Help"
          title="Help & Support"
          className="p-2 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-navy cursor-pointer transition"
        >
          <HelpCircle className="w-5 h-5" />
        </Link>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className={`flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl transition cursor-pointer border ${
              profileOpen
                ? "bg-slate-100 border-gold/40 shadow-xs"
                : "border-transparent hover:bg-gray-50"
            }`}
            aria-label="Profile and role switcher"
          >
            <div className="w-8 h-8 rounded-full bg-gold-light ring-2 ring-gold/30 overflow-hidden flex items-center justify-center text-xs font-bold text-navy shrink-0 shadow-xs">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <span className="hidden sm:block text-sm font-semibold text-navy max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 hidden sm:block transition-transform duration-200 ${
                profileOpen ? "rotate-180 text-navy" : ""
              }`}
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden z-50 animate-[fadeSlideIn_0.18s_ease-out]">
              {/* Header Profile Summary */}
              <div className="p-4 bg-gradient-to-r from-navy via-navy-light to-navy text-white relative">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full ring-2 ring-gold/40 bg-gold-light overflow-hidden flex items-center justify-center text-sm font-bold text-navy shrink-0 shadow-inner">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{displayName}</p>
                    <p className="text-xs text-slate-300 truncate">{user?.email || ""}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30">
                      {activeRole === "admin"
                        ? "Administrator"
                        : activeRole === "reviewer"
                        ? "Reviewer"
                        : "Researcher"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role Switcher Section (if user has multiple roles) */}
              {availableRoles.length > 1 && (
                <div className="p-3 border-b border-slate-100 bg-[#FBF8F0]/80">
                  <p className="text-[11px] font-bold text-navy/70 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-gold-dark" />
                    Switch Role
                  </p>
                  <div className="space-y-1">
                    {availableRoles.map((role) => {
                      const isActive = activeRole === role;
                      const roleMeta = {
                        admin: {
                          label: "Administrator",
                          desc: "Console, user management, audit",
                          icon: ShieldCheck,
                          path: "/admin-dashboard",
                        },
                        reviewer: {
                          label: "Reviewer",
                          desc: "Peer reviews & moderation queue",
                          icon: ClipboardCheck,
                          path: "/reviewer-dashboard",
                        },
                        user: {
                          label: "Researcher",
                          desc: "My datasets, upload, exploration",
                          icon: LayoutGrid,
                          path: "/researcher-dashboard",
                        },
                      }[role] || {
                        label: role,
                        desc: "Personal dashboard",
                        icon: LayoutGrid,
                        path: "/researcher-dashboard",
                      };
                      const Icon = roleMeta.icon;

                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => handleSwitchRole(role, roleMeta.path)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                            isActive
                              ? "bg-white text-navy font-semibold shadow-xs border border-gold/50"
                              : "text-slate-600 hover:bg-white/80 hover:text-navy"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`p-1.5 rounded-lg shrink-0 ${
                                isActive
                                  ? "bg-gold/20 text-gold-dark"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold leading-tight truncate">
                                {roleMeta.label}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {roleMeta.desc}
                              </p>
                            </div>
                          </div>
                          {isActive && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation links */}
              <div className="p-2 space-y-1">
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-navy transition"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Profile Settings
                </Link>
                {isAdmin(user) && (
                  <Link
                    to="/admin/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-navy transition"
                  >
                    <Shield className="w-4 h-4 text-slate-400" />
                    Admin Settings
                  </Link>
                )}
                <Link
                  to="/support"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-navy transition"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  Help &amp; Support
                </Link>
              </div>

              {/* Logout */}
              <div className="p-2 border-t border-slate-100 bg-slate-50/60">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
