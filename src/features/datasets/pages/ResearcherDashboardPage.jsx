import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Eye,
  Download,
  FolderOpen,
  Plus,
  Bookmark,
  User,
  X,
  ArrowRight,
  Clock,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import StatCard from "../../../components/dashboard/StatCard";
import { ProfileSavedNotice } from "../../../components/dashboard/dashboardUi";
import { useAuth } from "../../../context/useAuth";
import { getDisplayName, isProfileComplete as checkProfileComplete } from "../../../utils/userRoles";
import * as datasetsApi from "../hooks/datasetsApi";
import { getDiscoverFeed, searchDatasets } from "../../../api/search";
import { getDatasetImage } from "../../../utils/datasetImage";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
function isWithinLastMonth(d) {
  const dateVal = d?.created_at || d?.createdAt || d?.uploaded_at || d?.date || d?.updated_at;
  if (!dateVal) return false;
  const time = new Date(dateVal).getTime();
  return !Number.isNaN(time) ? (Date.now() - time) <= THIRTY_DAYS_MS : false;
}

function formatRelativeTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < 2 * day) return "Yesterday";
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function activityBadgeClass(action) {
  const normalized = String(action || "").toLowerCase();
  if (normalized.includes("download")) return "bg-slate-100 text-slate-700";
  if (normalized.includes("request") || normalized.includes("share")) return "bg-blue-50 text-blue-700";
  if (normalized.includes("modify") || normalized.includes("update")) return "bg-amber-50 text-amber-700";
  if (normalized.includes("upload")) return "bg-emerald-50 text-emerald-700";
  return "bg-gray-100 text-gray-700";
}

function formatAction(action) {
  return String(action || "activity").replace(/_/g, " ").toUpperCase();
}

export default function ResearcherDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [feed, setFeed] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [recentDatasets, setRecentDatasets] = useState([]);
  const [stats, setStats] = useState(null);
  const [totalDatasets, setTotalDatasets] = useState(0);
  const [pendingDatasets, setPendingDatasets] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingRecentDatasets, setLoadingRecentDatasets] = useState(true);
  const [loadingBookmarks, setLoadingBookmarks] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [datasetsError, setDatasetsError] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [activityError, setActivityError] = useState(null);

  const [discoverFeed, setDiscoverFeed] = useState(null);
  const [showAllFeed, setShowAllFeed] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);

  // Single source of truth — mirrors the backend's is_profile_complete() exactly.
  const profileComplete = checkProfileComplete(user);
  const [profileBannerDismissed, setProfileBannerDismissed] = useState(false);

  // Came here bounced off the upload route (ProfileCompleteRoute) — show the
  // specific "you need this to upload" message instead of the generic one.
  const blockedFromUpload = searchParams.get("incomplete") === "1";
  const showProfileBanner = !profileComplete && (!profileBannerDismissed || blockedFromUpload);

  function handleNewDatasetClick() {
    if (!profileComplete) {
      setProfileBannerDismissed(false);
      setSearchParams({ incomplete: "1" }, { replace: true });
      return;
    }
    navigate("/datasets/contribute?new=1");
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingStats(true);
      setLoadingDatasets(true);
      setLoadingFeed(true);
      setLoadingRecentDatasets(true);
      setLoadingBookmarks(true);
      setLoadingActivity(true);
      setStatsError(null);
      setDatasetsError(null);
      setActivityError(null);

      const [statsResult, datasetsResult, pendingResult, feedResult, bookmarksResult, activityResult, recentResult] = await Promise.allSettled([
        datasetsApi.getDashboardStats(),
        datasetsApi.getMyDatasets(),
        datasetsApi.getMyDatasets({ status: "pending" }),
        datasetsApi.getDashboardFeed(),
        datasetsApi.getMyBookmarks?.() ?? Promise.resolve([]),
        datasetsApi.getDashboardRecentActivity(),
        searchDatasets({ order_by: "newest" }),
      ]);

      if (!active) return;

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value);
      } else {
        setStatsError("Failed to load dashboard stats.");
      }

      if (datasetsResult.status === "fulfilled") {
        const list = normalizeList(datasetsResult.value);
        setTotalDatasets(list.length);
      } else {
        setDatasetsError("Failed to load your datasets.");
      }

      if (pendingResult.status === "fulfilled") {
        const pendingList = normalizeList(pendingResult.value);
        setPendingDatasets(pendingList.length);
      }

      if (feedResult.status === "fulfilled") {
        const rawFeed = normalizeList(feedResult.value);
        // Rank recommendations by high views and downloads (engagement)
        const sortedFeed = [...rawFeed].sort((a, b) => {
          const aViews = Number(a.view_count ?? a.views ?? 0);
          const aDownloads = Number(a.download_count ?? a.downloads ?? 0);
          const bViews = Number(b.view_count ?? b.views ?? 0);
          const bDownloads = Number(b.download_count ?? b.downloads ?? 0);
          return (bViews + bDownloads) - (aViews + aDownloads);
        });
        setFeed(sortedFeed);
      }
      if (bookmarksResult.status === "fulfilled") setBookmarks(normalizeList(bookmarksResult.value));
      if (activityResult.status === "fulfilled") {
        setRecentActivity(normalizeList(activityResult.value));
      } else {
        setActivityError("Failed to load recent activity.");
      }

      if (recentResult.status === "fulfilled") {
        const rawRecent = normalizeList(recentResult.value);
        const filteredRecent = rawRecent.filter(isWithinLastMonth);
        // Strictly only show datasets from the last 30 days. If none exist, show empty state.
        setRecentDatasets(filteredRecent);
      } else {
        setRecentDatasets([]);
      }

      setLoadingStats(false);
      setLoadingDatasets(false);
      setLoadingFeed(false);
      setLoadingRecentDatasets(false);
      setLoadingBookmarks(false);
      setLoadingActivity(false);
    }
    load();
    return () => { active = false; };
  }, []);

  // Fallback: if there are no personalized recommendations, pull the
  // general discovery feed instead of showing a dead end.
  useEffect(() => {
    if (loadingFeed || feed.length > 0) return;
    let active = true;
    getDiscoverFeed()
      .then((items) => {
        if (active) setDiscoverFeed(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (active) setDiscoverFeed([]);
      });
    return () => { active = false; };
  }, [loadingFeed, feed.length]);

  return (
    <DashboardShell title="Researcher Dashboard" subtitle="Manage your datasets and track engagement">
      <ProfileSavedNotice />
      {showProfileBanner && (
        <div className="flex items-center justify-between gap-4 bg-gold-light border border-gold/30 rounded-xl px-5 py-4 mb-8 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-gold-dark" />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy">
                {blockedFromUpload ? "Complete your profile to upload datasets" : "Complete your profile"}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {blockedFromUpload
                  ? "You need a complete academic profile before you can upload a dataset. It only takes a minute."
                  : "Enhance your research visibility. Complete your academic profile to unlock personalized recommendations."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="bg-navy hover:bg-navy-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Go to Profile
            </button>
            <button
              type="button"
              onClick={() => setProfileBannerDismissed(true)}
              aria-label="Dismiss"
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy">
            Welcome back, {getDisplayName(user)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track views, downloads, and activity on your research data.</p>
        </div>
        <button
          type="button"
          onClick={handleNewDatasetClick}
          className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-white rounded-lg px-5 py-2.5 text-sm font-semibold transition-all hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          New Dataset
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          label="TOTAL DATASETS"
          value={loadingDatasets ? "…" : totalDatasets.toLocaleString()}
          icon={FolderOpen}
          delay={50}
        />
        <StatCard
          label="PENDING DATASETS"
          value={loadingDatasets ? "…" : pendingDatasets.toLocaleString()}
          icon={Eye}
          delay={100}
        />
        <StatCard
          label="DOWNLOADS RECEIVED"
          value={loadingStats ? "…" : (stats?.total_downloads_received ?? 0).toLocaleString()}
          icon={Download}
          trend="+5% this month"
          delay={150}
        />
        <StatCard
          label="DOWNLOADS MADE"
          value={loadingStats ? "…" : (stats?.downloads_i_made ?? 0)}
          icon={FolderOpen}
          hint="Across all datasets"
          delay={200}
        />
      </div>

      {statsError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {statsError}
        </div>
      )}
      {datasetsError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {datasetsError}
        </div>
      )}

      {/* ── Recent Datasets (uploaded in the last 30 days) ── */}
      <section className="mb-8 animate-fade-in-up" style={{ animationDelay: "225ms" }}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-serif font-bold text-navy">Recent Datasets</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/15 text-gold-dark border border-gold/30">
                Last 30 Days
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Newly published datasets across the portal within the last 30 days.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/datasets?sort=newest")}
            className="flex items-center gap-1 text-sm font-medium text-gold hover:text-gold-dark cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loadingRecentDatasets ? (
          <div className="bg-white rounded-xl border border-border shadow-xs p-8 flex items-center justify-center">
            <p className="text-sm text-gray-500">Loading recent datasets…</p>
          </div>
        ) : recentDatasets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-10 text-center flex flex-col items-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-serif font-bold text-navy">
              No Datasets Published in the Last 30 Days
            </h3>
            <p className="text-xs text-slate-500 max-w-md mt-1.5 leading-relaxed">
              There have been no new datasets published across the portal within the past 30 days. Be the first to publish fresh research data!
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/datasets")}
                className="inline-flex items-center gap-2 bg-navy hover:bg-navy-dark text-white text-xs font-semibold rounded-xl px-4 py-2.5 transition-colors cursor-pointer shadow-xs"
              >
                <FolderOpen className="w-3.5 h-3.5 text-gold" />
                <span>Browse All Datasets</span>
              </button>
              <button
                type="button"
                onClick={handleNewDatasetClick}
                className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-white text-xs font-semibold rounded-xl px-4 py-2.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Contribute Dataset</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {recentDatasets.slice(0, showAllRecent ? 20 : 6).map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/datasets/${item.id}`)}
                  className="bg-white rounded-xl border border-border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                >
                  <div className="h-32 bg-gray-100 overflow-hidden">
                    {getDatasetImage(item) ? (
                      <img
                        src={getDatasetImage(item)}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-navy/10 to-gold/10" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded truncate">
                        {item.metadata?.category_name || item.category || "Research"}
                      </span>
                      {(item.created_at || item.uploaded_at || item.date) && (
                        <span className="text-[10px] text-gray-400 font-mono shrink-0">
                          {formatRelativeTime(item.created_at || item.uploaded_at || item.date)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-navy mt-2 line-clamp-2 group-hover:text-gold transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {item.metadata?.description || item.description || ""}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {((item.view_count ?? item.views) || 0).toLocaleString()} Views
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" />
                        {((item.download_count ?? item.downloads) || 0).toLocaleString()} Downloads
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {recentDatasets.length > 6 && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllRecent((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-dark hover:text-navy px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer"
                >
                  <span>{showAllRecent ? "Show Less" : `View All (${recentDatasets.length} Recent)`}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Recommendations (Based on research interests & high views/downloads) ── */}
      <section className="mb-8 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-serif font-bold text-navy">Recommendations</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Personalized
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Curated research materials tailored to your interests, ranked by views and downloads.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/datasets")}
            className="flex items-center gap-1 text-sm font-medium text-gold hover:text-gold-dark cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loadingFeed ? (
          <div className="bg-white rounded-xl border border-border shadow-xs p-8 flex items-center justify-center">
            <p className="text-sm text-gray-500">Loading recommendations…</p>
          </div>
        ) : feed.length === 0 ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-10 text-center flex flex-col items-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center mb-3">
                <Bookmark className="w-6 h-6 text-gold" />
              </div>
              <h3 className="text-base font-serif font-bold text-navy">
                No Recommendations Matching Your Interests Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mt-1.5 leading-relaxed">
                Recommendations are personalized based on your research interests and trending community engagement. Explore all datasets or configure your academic focus.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/datasets")}
                  className="inline-flex items-center gap-2 bg-navy hover:bg-navy-dark text-white text-xs font-semibold rounded-xl px-4 py-2.5 transition-colors cursor-pointer shadow-xs"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-gold" />
                  <span>Browse All Datasets</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-white text-xs font-semibold rounded-xl px-4 py-2.5 transition-colors cursor-pointer shadow-xs"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Update Research Interests</span>
                </button>
              </div>
            </div>

            {discoverFeed && discoverFeed.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Popular Across ORDP (High Views & Downloads)
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {discoverFeed.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/datasets/${item.id}`)}
                      className="bg-white rounded-xl border border-border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                    >
                      <div className="h-32 bg-gray-100 overflow-hidden">
                        {getDatasetImage(item) ? (
                          <img src={getDatasetImage(item)} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-navy/10 to-gold/10" />
                        )}
                      </div>
                      <div className="p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {item.metadata?.category_name || item.category || "General"}
                        </span>
                        <p className="text-sm font-semibold text-navy mt-2 line-clamp-2 group-hover:text-gold transition-colors">{item.title}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {((item.view_count ?? item.views) || 0).toLocaleString()} Views
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3.5 h-3.5" />
                            {((item.download_count ?? item.downloads) || 0).toLocaleString()} Downloads
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {feed.slice(0, showAllFeed ? 20 : 6).map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/datasets/${item.id}`)}
                  className="bg-white rounded-xl border border-border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                >
                  <div className="h-32 bg-gray-100 overflow-hidden">
                    {getDatasetImage(item) ? (
                      <img src={getDatasetImage(item)} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-navy/10 to-gold/10" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded truncate">
                        {item.metadata?.category_name || item.category || "General"}
                      </span>
                      {item.created_at && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-navy mt-2 line-clamp-2 group-hover:text-gold transition-colors">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.metadata?.description || item.description || ""}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {((item.view_count ?? item.views) || 0).toLocaleString()} Views
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" />
                        {((item.download_count ?? item.downloads) || 0).toLocaleString()} Downloads
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {feed.length > 6 && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllFeed((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-dark hover:text-navy px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer"
                >
                  <span>{showAllFeed ? "Show Less" : `View All (${feed.length} Recommendations)`}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mb-8 animate-fade-in-up" style={{ animationDelay: "275ms" }}>
        <h2 className="text-lg font-serif font-bold text-navy mb-4">My Bookmarks</h2>

        {loadingBookmarks ? (
          <p className="text-sm text-gray-500">Loading bookmarks…</p>
        ) : bookmarks.length === 0 ? (
          <div className="bg-white rounded-xl border border-border shadow-sm py-14 flex flex-col items-center text-center px-6">
            <span className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Bookmark className="w-5 h-5 text-gray-400" />
            </span>
            <p className="text-sm font-semibold text-navy">No bookmarks yet</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              Explore the directory to save datasets and research papers for quick access later.
            </p>
            <button
              type="button"
              onClick={() => navigate("/datasets")}
              className="mt-4 border border-gold text-gold hover:bg-gold hover:text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Browse Directory
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarks.slice(0, 6).map((b) => (
              <div
                key={b.id}
                onClick={() => navigate(`/datasets/${b.id}`)}
                className="bg-white rounded-xl p-4 border border-border hover:border-gold/30 cursor-pointer transition-colors"
              >
                <p className="text-sm font-semibold text-navy">{b.title}</p>
                <p className="text-xs text-gray-500 mt-1">{b.metadata?.category_name || "Unknown"}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Activity Log — placed last so content sections get priority */}
      <section className="mb-8 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-lg font-serif font-bold text-navy">Recent Activity</h2>
            <p className="text-sm text-gray-500 mt-0.5">Live activity from datasets you own or co-own.</p>
          </div>

          {loadingActivity ? (
            <p className="px-5 py-6 text-sm text-gray-500">Loading recent activity...</p>
          ) : activityError ? (
            <p className="px-5 py-6 text-sm text-red-600">{activityError}</p>
          ) : recentActivity.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500">No recent activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Action</th>
                    <th className="px-5 py-3 font-semibold">Dataset</th>
                    <th className="px-5 py-3 font-semibold">User</th>
                    <th className="px-5 py-3 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.slice(0, 8).map((item, index) => {
                    const datasetId = item.dataset_id || item.dataset;
                    const title = item.dataset_title || item.title || "Untitled dataset";
                    return (
                      <tr key={`${item.action}-${datasetId || title}-${item.timestamp || index}`} className="border-t border-border">
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${activityBadgeClass(item.action)}`}>
                            {formatAction(item.action)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {datasetId ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/my-datasets/${datasetId}`)}
                              className="font-semibold text-navy hover:text-gold text-left"
                            >
                              {title}
                            </button>
                          ) : (
                            <span className="font-semibold text-navy">{title}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-600">{item.user || "Unknown"}</td>
                        <td className="px-5 py-3 text-gray-500">{formatRelativeTime(item.timestamp)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
