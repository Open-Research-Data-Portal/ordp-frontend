import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Trash2,
  CheckCheck,
  Search,
  ShieldCheck,
  FileText,
  Info,
  AlertCircle,
  Download,
  Archive,
  Tag,
  Merge,
  Edit3,
} from "lucide-react";
import DashboardShell from "../components/dashboard/DashboardShell";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/ToastContext";
import {
  fetchNotificationHistory,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationItem,
} from "../api/notifications";

function getIconForType(type) {
  const t = String(type || "").toLowerCase();
  switch (true) {
    case t.includes("category_approv") || (t.includes("category") && t.includes("approv")):
      return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    case t.includes("category_reject") || (t.includes("category") && t.includes("reject")):
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    case t.includes("category_merge") || (t.includes("category") && t.includes("merge")):
      return <Merge className="w-5 h-5 text-gold" />;
    case t.includes("category"):
      return <Tag className="w-5 h-5 text-teal-600" />;
    case t.includes("download"):
      return <Download className="w-5 h-5 text-sky-600" />;
    case t.includes("archive"):
      return <Archive className="w-5 h-5 text-amber-600" />;
    case t.includes("modif") || t.includes("revision") || t.includes("edit"):
      return <Edit3 className="w-5 h-5 text-indigo-600" />;
    case t.includes("review") || t.includes("assign"):
      return <ShieldCheck className="w-5 h-5 text-violet-600" />;
    case t.includes("approved") || t === "success":
      return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
    case t.includes("reject") || t.includes("danger") || t.includes("error"):
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    case t.includes("dataset") || t.includes("upload"):
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

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await fetchNotificationHistory(user);
      setNotifications(list);
    } catch (err) {
      console.error("Failed to load notifications history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    window.addEventListener("ordp:notifications-updated", loadNotifications);
    return () => {
      window.removeEventListener("ordp:notifications-updated", loadNotifications);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gold-light/40 flex items-center justify-center text-gold-dark shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-navy">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Category decisions, peer reviews, dataset lifecycle notices, and administrative announcements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-2 text-sm font-semibold text-navy bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 text-slate-600" />
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Notifications list */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-14 text-center text-base text-slate-500">
              Loading notification history…
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-14 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Bell className="w-7 h-7" />
              </div>
              <p className="text-lg font-semibold text-navy">No notifications found</p>
              <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
                Notifications for your account activity, dataset updates, category decisions, and review tasks will appear here.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const isCategory =
                n.type?.includes("category") ||
                n.title?.toLowerCase().includes("category") ||
                n.message?.toLowerCase().includes("category");

              return (
                <div
                  key={n.id}
                  className={`group flex items-start gap-4 sm:gap-5 p-5 sm:p-6 rounded-2xl border transition-all duration-200 ${
                    n.is_read
                      ? "bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs"
                      : "bg-[#FDFBF7] border-gold/40 shadow-xs hover:border-gold"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {getIconForType(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2
                          className={`text-base sm:text-lg leading-snug font-bold ${
                            n.is_read ? "text-navy" : "text-navy"
                          }`}
                        >
                          {n.title}
                        </h2>
                        {isCategory && (
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                              n.type.includes("approv")
                                ? "bg-emerald-100 text-emerald-800"
                                : n.type.includes("reject")
                                ? "bg-red-100 text-red-800"
                                : n.type.includes("merge")
                                ? "bg-amber-100 text-amber-800"
                                : "bg-teal-100 text-teal-800"
                            }`}
                          >
                            {n.type.includes("approv")
                              ? "Approved"
                              : n.type.includes("reject")
                              ? "Rejected"
                              : n.type.includes("merge")
                              ? "Merged"
                              : "Category Update"}
                          </span>
                        )}
                        {!n.is_read && (
                          <span className="w-2.5 h-2.5 rounded-full bg-gold shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-mono shrink-0 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>

                    <p className="text-sm sm:text-base text-slate-700 mt-2 leading-relaxed">
                      {n.message}
                    </p>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100/90">
                      <div>
                        {n.link_path && (
                          <button
                            type="button"
                            onClick={() => handleActionClick(n)}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-dark hover:text-navy hover:underline transition cursor-pointer"
                          >
                            View Details <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!n.is_read && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(n.id)}
                            className="text-xs font-semibold text-slate-600 hover:text-navy bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(n.id)}
                          className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
