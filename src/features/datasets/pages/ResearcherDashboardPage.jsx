import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Download,
  FolderOpen,
  Plus,
  MoreVertical,
  Bookmark,
  User,
  X,
  ArrowRight,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import StatCard from "../../../components/dashboard/StatCard";
import { StatusBadge, EmptyState } from "../../../components/dashboard/dashboardUi";
import { useAuth } from "../../../context/useAuth";
import { getDisplayName } from "../../../utils/userRoles";
import * as datasetsApi from "../hooks/datasetsApi";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Placeholder recommendations shown until the backend feed endpoint
// returns real personalized results.
const MOCK_RECOMMENDATIONS = [
  {
    id: "mock-1",
    title: "Structural Integrity Analysis of High-Rise Concrete Frames",
    description: "Comprehensive dataset detailing stress test results over a 10-year simulation period.",
    category: "Civil Engineering",
    views: 2400,
    downloads: 450,
    thumbnail_url: null,
  },
  {
    id: "mock-2",
    title: "Ethiopian Language Processing Model Corpus",
    description: "A curated collection of text data aimed at training LLMs for Amharic, Oromo, and Tigrinya.",
    category: "Machine Learning",
    views: 5100,
    downloads: 1200,
    thumbnail_url: null,
  },
  {
    id: "mock-3",
    title: "Genomic Sequencing Variations in Indigenous Flora",
    description: "Raw sequencing data mapped against climate change indicators over the last decade.",
    category: "Bio-Informatics",
    views: 890,
    downloads: 120,
    thumbnail_url: null,
  },
];

export default function ResearcherDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [datasets, setDatasets] = useState([]);
  const [feed, setFeed] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile completion banner: reappears every time the dashboard loads
  // until the user's profile is actually marked complete.
  const isProfileComplete = Boolean(user?.profile_complete);
  const [showProfileBanner, setShowProfileBanner] = useState(!isProfileComplete);

  useEffect(() => {
    setShowProfileBanner(!isProfileComplete);
  }, [isProfileComplete]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const results = await Promise.allSettled([
        datasetsApi.getMyDatasets(),
        datasetsApi.getDashboardStats(),
        datasetsApi.getDashboardFeed(),
        datasetsApi.getMyBookmarks?.() ?? Promise.resolve([]),
      ]);
      if (!active) return;
      if (results[0].status === "fulfilled") setDatasets(normalizeList(results[0].value));
      if (results[1].status === "fulfilled") setStats(results[1].value);
      if (results[2].status === "fulfilled") setFeed(normalizeList(results[2].value));
      if (results[3].status === "fulfilled") setBookmarks(normalizeList(results[3].value));
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardShell title="Researcher Dashboard" subtitle="Manage your datasets and track engagement">
      {/* Profile completion banner — reappears on every dashboard load until complete */}
      {showProfileBanner && (
        <div className="flex items-center justify-between gap-4 bg-gold-light border border-gold/30 rounded-xl px-5 py-4 mb-8 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-gold-dark" />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy">Complete your profile</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Enhance your research visibility. Complete your academic profile to unlock personalized recommendations.
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
          onClick={() => navigate("/datasets/contribute")}
          className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-white rounded-lg px-5 py-2.5 text-sm font-semibold transition-all hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          New Dataset
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard label="VIEWS RECEIVED" value={loading ? "…" : (stats?.total_views_received ?? 0).toLocaleString()} icon={Eye} trend="+12% this month" delay={50} />
        <StatCard label="DOWNLOADS RECEIVED" value={loading ? "…" : (stats?.total_downloads_received ?? 0).toLocaleString()} icon={Download} trend="+5% this month" delay={100} />
        <StatCard label="DOWNLOADS I MADE" value={loading ? "…" : (stats?.downloads_i_made ?? 0)} icon={FolderOpen} hint="Across all datasets" delay={150} />
        <StatCard label="MOST VIEWED" value={loading ? "…" : (stats?.most_viewed_dataset?.title ?? "None")} icon={Eye} hint={stats?.most_viewed_dataset ? `${stats.most_viewed_dataset.view_count} views` : ""} delay={200} />
      </div>

      {/* Recommendations */}
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

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(feed.length > 0 ? feed : MOCK_RECOMMENDATIONS).slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/datasets/${item.id}`)}
                className="bg-white rounded-xl border border-border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="h-32 bg-gray-100 overflow-hidden">
                  {(item.thumbnail_key || item.thumbnail_url) ? (
                    <img src={item.thumbnail_key ?? item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
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

      {/* My Bookmarks */}
      <section className="mb-8 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <h2 className="text-lg font-serif font-bold text-navy mb-4">My Bookmarks</h2>

        {bookmarks.length === 0 ? (
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