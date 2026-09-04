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
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import StatCard from "../../../components/dashboard/StatCard";
import { ProfileSavedNotice } from "../../../components/dashboard/dashboardUi";
import { useAuth } from "../../../context/useAuth";
import { getDisplayName, isProfileComplete as checkProfileComplete } from "../../../utils/userRoles";
import * as datasetsApi from "../hooks/datasetsApi";
import { getDiscoverFeed } from "../../../api/search";
import { getDatasetImage } from "../../../utils/datasetImage";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

export default function ResearcherDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [feed, setFeed] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [stats, setStats] = useState(null);
  const [totalDatasets, setTotalDatasets] = useState(0);
  const [pendingDatasets, setPendingDatasets] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingBookmarks, setLoadingBookmarks] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [datasetsError, setDatasetsError] = useState(null);

  const [discoverFeed, setDiscoverFeed] = useState([]);
  const [loadingDiscover, setLoadingDiscover] = useState(false);

  // Single source of truth — mirrors the backend's is_profile_complete() exactly.
  const profileComplete = checkProfileComplete(user);
  const [showProfileBanner, setShowProfileBanner] = useState(!profileComplete);

  // Came here bounced off the upload route (ProfileCompleteRoute) — show the
  // specific "you need this to upload" message instead of the generic one.
  const blockedFromUpload = searchParams.get("incomplete") === "1";

  useEffect(() => {
    setShowProfileBanner(!profileComplete);
  }, [profileComplete]);

  function handleNewDatasetClick() {
    if (!profileComplete) {
      setShowProfileBanner(true);
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
      setLoadingBookmarks(true);
      setStatsError(null);
      setDatasetsError(null);

      const [statsResult, datasetsResult, pendingResult, feedResult, bookmarksResult] = await Promise.allSettled([
        datasetsApi.getDashboardStats(),
        datasetsApi.getMyDatasets(),
        datasetsApi.getMyDatasets({ status: "pending" }),
        datasetsApi.getDashboardFeed(),
        datasetsApi.getMyBookmarks?.() ?? Promise.resolve([]),
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

      if (feedResult.status === "fulfilled") setFeed(normalizeList(feedResult.value));
      if (bookmarksResult.status === "fulfilled") setBookmarks(normalizeList(bookmarksResult.value));

      setLoadingStats(false);
      setLoadingDatasets(false);
      setLoadingFeed(false);
      setLoadingBookmarks(false);
    }
    load();
    return () => { active = false; };
  }, []);

  // Fallback: if there are no personalized recommendations, pull the
  // general discovery feed instead of showing a dead end.
  useEffect(() => {
    if (loadingFeed || feed.length > 0) return;
    let active = true;
    setLoadingDiscover(true);
    getDiscoverFeed()
      .then((items) => {
        if (active) setDiscoverFeed(Array.isArray(items) ? items : []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingDiscover(false);
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
              onClick={() => setShowProfileBanner(false)}
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

      <section className="mb-8 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-navy">Recommendations</h2>
            <p className="text-sm text-gray-500 mt-0.5">Discover trending research materials tailored to you.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/datasets")}
            className="flex items-center gap-1 text-sm font-medium text-gold hover:text-gold-dark"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loadingFeed ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : feed.length === 0 ? (
          loadingDiscover ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : discoverFeed.length === 0 ? (
            <div className="bg-white rounded-xl border border-border shadow-sm py-14 flex flex-col items-center text-center px-6">
              <p className="text-sm font-semibold text-navy">No recommendations yet</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                We don't have personalized picks for you yet — start exploring the full directory instead.
              </p>
              <button
                type="button"
                onClick={() => navigate("/datasets")}
                className="mt-4 border border-gold text-gold hover:bg-gold hover:text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                Explore Datasets
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">No personalized recommendations yet — here's what's trending.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {discoverFeed.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/datasets/${item.id}`)}
                    className="bg-white rounded-xl border border-border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="h-32 bg-gray-100 overflow-hidden">
                      {getDatasetImage(item) ? (
                        <img src={getDatasetImage(item)} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-navy/10 to-gold/10" />
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-semibold text-navy line-clamp-2">{item.title}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {(item.view_count || 0).toLocaleString()} Views
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" />
                          {(item.download_count || 0).toLocaleString()} Downloads
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {feed.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/datasets/${item.id}`)}
                className="bg-white rounded-xl border border-border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="h-32 bg-gray-100 overflow-hidden">
                  {getDatasetImage(item) ? (
                    <img src={getDatasetImage(item)} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-navy/10 to-gold/10" />
                  )}
                </div>
                <div className="p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {item.metadata?.category_name || item.category || "General"}
                  </span>
                  <p className="text-sm font-semibold text-navy mt-2 line-clamp-2">{item.title}</p>
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
        )}
      </section>

      <section className="mb-8 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
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
    </DashboardShell>
  );
}