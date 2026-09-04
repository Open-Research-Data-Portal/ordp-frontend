import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Trash2,
  CheckCheck,
  Filter,
  Search,
  ShieldCheck,
  FileText,
  Info,
  AlertCircle,
} from "lucide-react";
import DashboardShell from "../components/dashboard/DashboardShell";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/ToastContext";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationItem,
} from "../api/notifications";

function getIconForType(type) {
  switch (String(type).toLowerCase()) {
    case "review":
    case "dataset_assigned_for_review":
      return <ShieldCheck className="w-5 h-5 text-violet-600" />;
    case "dataset_approved":
    case "approved":
      return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    case "rejected":
    case "dataset_rejected":
    case "revision_rejected":
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    case "dataset":
    case "upload":
      return <FileText className="w-5 h-5 text-blue-600" />;
    default:
      return <Info className="w-5 h-5 text-gold-dark" />;
  }
}

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
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return "";
  }
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const list = await fetchNotifications(user);
        if (active) setNotifications(list);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Tab filter
      if (activeTab === "unread" && n.is_read) return false;
      if (activeTab === "reviews" && !["review", "dataset_assigned_for_review"].includes(n.type))
        return false;
      if (activeTab === "system" && !["system", "info"].includes(n.type)) return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (n.title || "").toLowerCase().includes(q);
        const msgMatch = (n.message || "").toLowerCase().includes(q);
        if (!titleMatch && !msgMatch) return false;
      }
      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  async function handleMarkRead(id) {
    const updated = await markNotificationAsRead(user, id);
    setNotifications(updated);
  }

  async function handleMarkAllRead() {
    const updated = await markAllNotificationsAsRead(user);
    setNotifications(updated);
    addToast("All notifications marked as read", "success");
  }

  async function handleDelete(id) {
    const updated = await deleteNotificationItem(user, id);
    setNotifications(updated);
    addToast("Notification removed", "info");
  }

  function handleActionClick(notification) {
    if (!notification.is_read) {
      handleMarkRead(notification.id);
    }
    if (notification.link_path) {
      navigate(notification.link_path);
    }
  }

  return (
    <DashboardShell title="Notifications" subtitle="Stay informed with real-time updates and review alerts">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-light/40 flex items-center justify-center text-gold-dark">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-serif font-bold text-navy">Your Notifications</h1>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Reviews, dataset lifecycle notices, and administrative announcements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition"
              >
                <CheckCheck className="w-4 h-4 text-slate-600" />
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All" },
              { id: "unread", label: `Unread (${unreadCount})` },
              { id: "reviews", label: "Reviews & Moderation" },
              { id: "system", label: "System Notices" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-navy text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter notifications…"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-gold focus:bg-white transition"
            />
          </div>
        </div>

        {/* Notifications list */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-sm text-slate-500">
              Loading notifications…
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-navy">No notifications found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {activeTab === "unread"
                  ? "You are completely caught up! No unread notifications at this time."
                  : "Notifications for your account activity, dataset updates, and review tasks will appear here."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`group flex items-start gap-4 p-4.5 rounded-2xl border transition-all duration-200 ${
                  n.is_read
                    ? "bg-white border-slate-200/80 hover:border-slate-300"
                    : "bg-[#FDFBF7] border-gold/40 shadow-xs hover:border-gold"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  {getIconForType(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h2
                        className={`text-sm leading-snug font-semibold ${
                          n.is_read ? "text-navy" : "text-navy font-bold"
                        }`}
                      >
                        {n.title}
                      </h2>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-gold shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(n.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/80">
                    <div>
                      {n.link_path && (
                        <button
                          type="button"
                          onClick={() => handleActionClick(n)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:text-navy hover:underline transition"
                        >
                          View Details <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(n.id)}
                          className="text-[11px] text-slate-500 hover:text-navy px-2 py-1 rounded hover:bg-slate-100 transition"
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(n.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
