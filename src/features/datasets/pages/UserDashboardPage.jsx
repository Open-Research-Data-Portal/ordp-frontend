import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Download, Eye, MoreVertical } from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { ProfileBanner, ProfileSavedNotice, SectionHeader, StatusBadge, EmptyState } from "../../../components/dashboard/dashboardUi";
import { useAuth } from "../../../context/useAuth";
import { getDisplayName } from "../../../utils/userRoles";
import * as datasetsApi from "../hooks/datasetsApi";
import * as authApi from "../../accounts/api/authApi";
import { isProfileComplete } from "../../accounts/onboarding";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

const PLACEHOLDER_EXPLORE = [
  {
    id: "e1",
    title: "Structural Integrity Analysis of High-Rise Concrete",
    category: "Civil Engineering",
    views: "2.4k",
    downloads: 450,
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=200&fit=crop",
  },
  {
    id: "e2",
    title: "Ethiopian Language Processing Model Corpus",
    category: "Machine Learning",
    views: "1.8k",
    downloads: 320,
    image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=200&fit=crop",
  },
  {
    id: "e3",
    title: "Genomic Sequencing Variations in Indigenous Flora",
    category: "Bio-informatics",
    views: "980",
    downloads: 210,
    image: "https://images.unsplash.com/photo-1532187863486-abf9db5811e2?w=400&h=200&fit=crop",
  },
];

const PLACEHOLDER_SUBMISSIONS = [
  { id: "s1", title: "Urban Heat Island Mapping", category: "Urban Planning", date: "Oct 12, 2024", status: "pending" },
  { id: "s2", title: "Solar Panel Efficiency Dataset", category: "Electrical Engineering", date: "Sep 28, 2024", status: "approved" },
  { id: "s3", title: "Rainfall Pattern Analysis 2020-2024", category: "Meteorology", date: "Sep 15, 2024", status: "rejected" },
];

export default function UserDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feed, setFeed] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [profileComplete, setProfileComplete] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const [feedRes, bookmarksRes, suggestionsRes] = await Promise.allSettled([
        datasetsApi.getDiscoverFeed?.() ?? datasetsApi.getDashboardFeed(),
        datasetsApi.getBookmarks?.() ?? Promise.resolve([]),
        datasetsApi.getMySuggestions?.() ?? Promise.resolve([]),
      ]);
      if (!active) return;
      if (feedRes.status === "fulfilled") setFeed(normalizeList(feedRes.value));
      if (bookmarksRes.status === "fulfilled") setBookmarks(normalizeList(bookmarksRes.value));
      if (suggestionsRes.status === "fulfilled") {
        const items = normalizeList(suggestionsRes.value);
        setSubmissions(items.length ? items : PLACEHOLDER_SUBMISSIONS);
      } else {
        setSubmissions(PLACEHOLDER_SUBMISSIONS);
      }
      try {
        const completion = await authApi.getProfileCompletion();
        if (active) setProfileComplete(isProfileComplete(completion, user));
      } catch {
        if (active) setProfileComplete(isProfileComplete(user, user));
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [user]);

  const exploreItems = feed.length ? feed.slice(0, 3) : PLACEHOLDER_EXPLORE;

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
                {item.image || item.thumbnail ? (
                  <img src={item.image || item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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

      {/* My Submissions */}
      <section className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <SectionHeader title="My Submissions" />
        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500 bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-5 py-3 font-semibold">Suggestion Name</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Date Submitted</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-bg/50">
                    <td className="px-5 py-4 font-medium text-navy">{row.title || row.name}</td>
                    <td className="px-5 py-4 text-gray-600">{row.category || row.category_name || "—"}</td>
                    <td className="px-5 py-4 text-gray-500">{row.date || row.created_at?.slice(0, 10) || "—"}</td>
                    <td className="px-5 py-4"><StatusBadge status={row.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <button type="button" aria-label="Actions" className="text-gray-400 hover:text-navy p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
