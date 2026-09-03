import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Download, Eye, UploadCloud, KeyRound, GitBranch } from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { ProfileBanner, ProfileSavedNotice, SectionHeader, EmptyState } from "../../../components/dashboard/dashboardUi";
import { useAuth } from "../../../context/useAuth";
import { getDisplayName, isReviewer, isAdmin } from "../../../utils/userRoles";
import * as datasetsApi from "../hooks/datasetsApi";
import * as authApi from "../../accounts/api/authApi";
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
  const [stats, setStats] = useState(null);
  const [profileComplete, setProfileComplete] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isReviewer(user)) {
      navigate("/reviewer-dashboard", { replace: true });
      return;
    }
    if (isAdmin(user)) {
      navigate("/admin-dashboard", { replace: true });
      return;
    }
  }, [user, navigate]);

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
      const statsRes = await Promise.allSettled([datasetsApi.getDashboardStats()]);
      if (statsRes[0].status === "fulfilled") setStats(statsRes[0].value);

      // Check profile completion via user state, storage, and API
      let isComplete = Boolean(
        user?.can_upload_datasets ||
        user?.profile?.can_upload_datasets ||
        user?.profile_complete ||
        user?.profile?.profile_complete ||
        user?.is_profile_complete ||
        sessionStorage.getItem("ordp:profile_completed") === "true" ||
        localStorage.getItem("ordp:profile_completed") === "true"
      );

      if (!isComplete) {
        try {
          const profileData = await authApi.getCompleteProfile();
          if (
            profileData?.can_upload_datasets ||
            profileData?.is_profile_complete ||
            profileData?.completed ||
            profileData?.is_complete ||
            authApi.isProfileCompleted(profileData)
          ) {
            isComplete = true;
            sessionStorage.setItem("ordp:profile_completed", "true");
          }
        } catch {
          // ignore
        }
      }

      setProfileComplete(isComplete);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [user]);

  const exploreItems = feed.slice(0, 3);

  return (
    <DashboardShell title="Research Hub" subtitle="AASTU Academic Portal">
      <ProfileSavedNotice />
      {!profileComplete && !bannerDismissed && (
        <ProfileBanner onDismiss={() => setBannerDismissed(true)} onGoToProfile={() => navigate("/profile")} />
      )}

      <div className="mb-2 animate-fade-in-up">
        <h1 className="text-2xl font-serif font-bold text-navy">Welcome, {getDisplayName(user)}</h1>
        <p className="text-sm text-gray-500 mt-1">Discover research materials and track your submissions.</p>
      </div>

      <section className="mt-6 mb-10 grid grid-cols-2 gap-3 md:grid-cols-5 animate-fade-in-up" aria-label="Your activity statistics">
        {[
          ["Downloads", stats?.downloads ?? stats?.downloads_i_made ?? 0, Download],
          ["Views", stats?.views ?? stats?.views_received ?? 0, Eye],
          ["Uploads", stats?.uploads ?? stats?.total_uploads ?? 0, UploadCloud],
          ["Dataset access", stats?.dataset_access ?? stats?.access_requests ?? 0, KeyRound],
          ["Contributions", stats?.contributions ?? stats?.total_contributions ?? 0, GitBranch],
        ].map(([label, value, Icon]) => (
          <div key={label} className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <Icon className="h-4 w-4 text-gold" />
            <p className="mt-3 text-xl font-serif font-bold text-navy">{Number(value || 0).toLocaleString()}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          </div>
        ))}
      </section>

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
