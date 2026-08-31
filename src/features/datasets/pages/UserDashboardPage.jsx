import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Download, Eye, MoreVertical } from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { ProfileBanner, SectionHeader, StatusBadge, EmptyState } from "../../../components/dashboard/dashboardUi";
import { useAuth } from "../../../context/useAuth";
import { getDisplayName } from "../../../utils/userRoles";
import * as datasetsApi from "../hooks/datasetsApi";

import { getDatasetImage } from "../../../utils/datasetImage";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

export default function UserDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feed, setFeed] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [profileComplete, setProfileComplete] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const [feedRes, bookmarksRes] = await Promise.allSettled([
        datasetsApi.getDiscoverFeed?.() ?? datasetsApi.getDashboardFeed(),
        datasetsApi.getBookmarks?.() ?? Promise.resolve([]),
      ]);
      if (!active) return;
      if (feedRes.status === "fulfilled") setFeed(normalizeList(feedRes.value));
      if (bookmarksRes.status === "fulfilled") setBookmarks(normalizeList(bookmarksRes.value));
      setProfileComplete(Boolean(user?.can_upload_datasets || user?.profile?.can_upload_datasets || user?.profile_complete || user?.profile?.profile_complete || user?.is_profile_complete));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [user]);

  const exploreItems = feed.slice(0, 3);

  return (
    <DashboardShell title="Research Hub" subtitle="AASTU Academic Portal">
      {!profileComplete && !bannerDismissed && (
        <ProfileBanner onDismiss={() => setBannerDismissed(true)} onGoToProfile={() => navigate("/profile")} />
      )}

      <div className="mb-2 animate-fade-in-up">
        <h1 className="text-2xl font-serif font-bold text-navy">Welcome, {getDisplayName(user)}</h1>
        <p className="text-sm text-gray-500 mt-1">Discover research materials and track your submissions.</p>
      </div>

      {/* Explore Datasets */}
      <section className="mt-8 mb-10 animate-fade-in-up">
        <SectionHeader
          title="Explore Datasets"
          subtitle="Discover trending research materials."
          actionLabel="View All →"
          onAction={() => navigate("/datasets")}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {exploreItems.map((item, i) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/datasets/${item.id}`)}
              onKeyDown={(e) => e.key === "Enter" && navigate(`/datasets/${item.id}`)}
              className="group bg-white rounded-xl overflow-hidden border border-border hover:border-gold/40 hover:shadow-md cursor-pointer transition-all"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="h-36 bg-navy/5 overflow-hidden">
                {getDatasetImage(item) ? (
                  <img src={getDatasetImage(item)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-navy/10 to-gold/10" />
                )}
              </div>
              <div className="p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gold">{item.category || item.subject_name || "Research"}</span>
                <h3 className="text-sm font-semibold text-navy mt-1 line-clamp-2 group-hover:text-gold transition-colors">{item.title}</h3>
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{item.views ?? item.view_count ?? "—"}</span>
                  <span className="flex items-center gap-1"><Download className="w-3 h-3" />{item.downloads ?? item.download_count ?? 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* My Bookmarks */}
      <section className="mb-10 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        <SectionHeader title="My Bookmarks" />
        {loading ? (
          <p className="text-sm text-gray-500">Loading bookmarks…</p>
        ) : bookmarks.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="No bookmarks yet"
            description="Save datasets while browsing to access them quickly from here."
            actionLabel="Browse Directory"
            onAction={() => navigate("/datasets")}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bookmarks.slice(0, 4).map((b) => (
              <div key={b.id} className="bg-white rounded-xl p-4 border border-border hover:border-gold/30 cursor-pointer" onClick={() => navigate(`/datasets/${b.id}`)}>
                <p className="text-sm font-semibold text-navy">{b.title}</p>
                <p className="text-xs text-gray-500 mt-1">{b.category || b.subject_name}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
