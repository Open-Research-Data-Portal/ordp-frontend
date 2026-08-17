import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Download,
  Eye,
  Database,
  Sparkles,
  ArrowRight,
  Clock,
  UploadCloud,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";
import Sidebar from "../../../layouts/Sidebar";
import TopBar from "../../../layouts/TopBar";
import { useAuth } from "../../../context/useAuth";
import * as datasetsApi from "../hooks/datasetsApi";

function timeAgo(dateString) {
  if (!dateString) return "—";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ACTIVITY_STYLE = {
  download: { icon: Download, bg: "bg-blue-50", text: "text-blue-600" },
  upload: { icon: UploadCloud, bg: "bg-emerald-50", text: "text-emerald-600" },
  comment: { icon: MessageCircle, bg: "bg-amber-50", text: "text-amber-600" },
  approval: { icon: CheckCircle2, bg: "bg-violet-50", text: "text-violet-600" },
};

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

function StatCard({ label, value, icon: Icon, delay = 0 }) {
  return (
    <div
      className="bg-white rounded-xl p-5 shadow-sm border border-transparent hover:border-[#EADFC0] hover:shadow-md transition-all duration-300 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 tracking-wide font-medium">{label}</span>
        <span className="w-8 h-8 rounded-lg bg-[#FBF6E9] flex items-center justify-center text-[#A67A0D]">
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="text-2xl font-bold text-slate-900 mt-2">{value}</div>
    </div>
  );
}

export default function ResearcherDashboardPage() {
  const { user } = useAuth();
  const [datasets, setDatasets] = useState([]);
  const [feed, setFeed] = useState([]);
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const [datasetsData, feedData, activityData, statsData] = await Promise.allSettled([
          datasetsApi.getMyDatasets(),
          datasetsApi.getDashboardFeed(),
          datasetsApi.getDashboardRecentActivity(),
          datasetsApi.getDashboardStats(),
        ]);

        if (!isMounted) return;

        if (datasetsData.status === "fulfilled") {
          setDatasets(normalizeList(datasetsData.value));
        }
        if (feedData.status === "fulfilled") {
          setFeed(normalizeList(feedData.value));
        }
        if (activityData.status === "fulfilled") {
          setActivity(normalizeList(activityData.value));
        }
        if (statsData.status === "fulfilled") {
          setStats(statsData.value);
        }

        const failed = [datasetsData, feedData, activityData, statsData].filter((r) => r.status === "rejected");
        if (failed.length > 0) {
          setError("Some dashboard data failed to load.");
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.detail || "Failed to load your dashboard.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeDatasets = datasets.filter((d) => d.is_active !== false);
  const totalDownloads = stats?.total_downloads ?? datasets.reduce((sum, d) => sum + (d.download_count || 0), 0);
  const profileViews = stats?.profile_views ?? user?.profile_views;

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.45s ease-out both;
        }
      `}</style>

      {/* TopBar now spans full width, above everything */}
      <TopBar />

      {/* Sidebar + content sit in a row below the TopBar */}
      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-8 lg:p-10">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 animate-fade-in-up">
              <div>
                <h1 className="text-2xl font-serif font-bold text-slate-900">
                  Welcome back, {user?.title ? `${user.title} ` : ""}
                  {user?.name || "Researcher"}
                </h1>
                <p className="text-gray-500 mt-1">{today}</p>
              </div>
              <button
                onClick={() => navigate("/datasets/contribute")}
                className="flex items-center gap-2 bg-[#A67A0D] hover:bg-[#8f690b] text-white rounded-md px-5 py-2.5 text-sm font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                New Dataset
              </button>
            </div>

            {error && (
              <p role="alert" className="text-red-700 mb-4">
                {error}
              </p>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              <StatCard
                label="MY DATASETS"
                value={loading ? "…" : stats?.dataset_count ?? activeDatasets.length}
                icon={Database}
                delay={50}
              />
              <StatCard
                label="TOTAL DOWNLOADS"
                value={loading ? "…" : (totalDownloads ?? 0).toLocaleString()}
                icon={Download}
                delay={100}
              />
              <StatCard
                label="PROFILE VIEWS"
                value={loading ? "…" : profileViews ?? "—"}
                icon={Eye}
                delay={150}
              />
            </div>

            {/* Feed — datasets based on interest */}
            <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Recommended For You</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Datasets matched to your research interests</p>
                </div>
                <button
                  onClick={() => navigate("/datasets/explore")}
                  className="text-[#A67A0D] font-medium text-sm hover:underline shrink-0"
                >
                  View all
                </button>
              </div>

              {loading && <p className="text-gray-500">Loading feed…</p>}

              {!loading && feed.length === 0 && (
                <div className="bg-white rounded-xl p-10 text-center text-gray-500 border border-[#E3E1DA]">
                  No recommendations yet.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {feed.map((item, i) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/datasets/${item.id}`)}
                    role="button"
                    tabIndex={0}
                    className="group bg-white rounded-xl p-5 shadow-sm border border-transparent hover:border-[#EADFC0] hover:shadow-md cursor-pointer transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: `${250 + i * 40}ms` }}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          item.visibility === "public"
                            ? "bg-navy text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {item.visibility === "public" ? "PUBLIC" : "PRIVATE"}
                      </span>
                      {item.match_reason && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#A67A0D] bg-[#FBF6E9] px-2 py-0.5 rounded-full">
                          <Sparkles className="w-3 h-3" />
                          {item.match_reason}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 leading-snug group-hover:text-[#A67A0D] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{item.description}</p>

                    {item.owner_name && (
                      <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                        <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-600">
                          {item.owner_name.charAt(0)}
                        </span>
                        <span className="text-gray-600 font-medium">{item.owner_name}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {item.download_count ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(item.updated_at)}
                      </span>
                      <span className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center group-hover:bg-[#FBF6E9] group-hover:text-[#A67A0D] transition-colors">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div
              className="bg-white rounded-xl p-5 shadow-sm border border-transparent hover:border-[#EADFC0] transition-colors duration-300 animate-fade-in-up"
              style={{ animationDelay: "350ms" }}
            >
              <h2 className="text-base font-semibold text-slate-900 mb-5">Recent Activity</h2>

              {loading && <p className="text-gray-500">Loading activity…</p>}

              {!loading && activity.length === 0 && (
                <p className="text-gray-500">No recent activity.</p>
              )}

              <ol className="relative border-l-2 border-gray-100 ml-3">
                {activity.map((item, i) => {
                  const style = ACTIVITY_STYLE[item.type] ?? {
                    icon: Sparkles,
                    bg: "bg-gray-50",
                    text: "text-gray-600",
                  };
                  const Icon = style.icon;
                  return (
                    <li
                      key={item.id}
                      className="mb-6 last:mb-0 ml-6 animate-fade-in-up"
                      style={{ animationDelay: `${400 + i * 40}ms` }}
                    >
                      <span
                        className={`absolute -left-[19px] flex items-center justify-center w-9 h-9 rounded-full ring-4 ring-white ${style.bg} ${style.text}`}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="flex items-center justify-between gap-4 pt-1">
                        <p className="text-sm text-slate-800">{item.message}</p>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {timeAgo(item.timestamp)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}