import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Download,
  FolderOpen,
  Plus,
  Pencil,
  MoreVertical,
  Bookmark,
  FileText,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import StatCard from "../../../components/dashboard/StatCard";
import { SectionHeader, StatusBadge, EmptyState } from "../../../components/dashboard/dashboardUi";
import { useAuth } from "../../../context/useAuth";
import { getDisplayName } from "../../../utils/userRoles";
import * as datasetsApi from "../hooks/datasetsApi";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

function timeAgo(dateString) {
  if (!dateString) return "—";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ResearcherDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [activity, setActivity] = useState([]);
  const [feed, setFeed] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("bookmarks");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const results = await Promise.allSettled([
        datasetsApi.getMyDatasets(),
        datasetsApi.getDashboardStats(),
        datasetsApi.getDashboardRecentActivity(),
        datasetsApi.getDashboardFeed(),
        datasetsApi.getMyDownloads?.() ?? Promise.resolve([]),
      ]);
      if (!active) return;
      if (results[0].status === "fulfilled") setDatasets(normalizeList(results[0].value));
      if (results[1].status === "fulfilled") setStats(results[1].value);
      if (results[2].status === "fulfilled") setActivity(normalizeList(results[2].value));
      if (results[3].status === "fulfilled") setFeed(normalizeList(results[3].value));
      if (results[4].status === "fulfilled") setDownloads(normalizeList(results[4].value));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  return (
    <DashboardShell title="Researcher Dashboard" subtitle="Manage your datasets and track engagement">
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
        <StatCard label="VIEWS RECEIVED" value={loading ? "…" : (stats?.views_received ?? 1284).toLocaleString()} icon={Eye} trend="+12% this month" delay={50} />
        <StatCard label="DOWNLOADS RECEIVED" value={loading ? "…" : (stats?.downloads_received ?? 452).toLocaleString()} icon={Download} trend="+5% this month" delay={100} />
        <StatCard label="DATASETS DOWNLOADED" value={loading ? "…" : (stats?.datasets_downloaded ?? downloads.length ?? 12)} icon={FolderOpen} hint="Across your projects" delay={150} />
        <StatCard label="MOST VIEWED" value={loading ? "…" : stats?.most_viewed_title ?? "Climate…"} icon={Eye} hint={`${stats?.most_viewed_count ?? 842} views`} delay={200} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* My Uploaded Datasets */}
        <section className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: "250ms" }}>
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-navy">My Uploaded Datasets</h2>
          </div>
          {loading ? (
            <p className="p-5 text-sm text-gray-500">Loading…</p>
          ) : datasets.length === 0 ? (
            <div className="p-5"><EmptyState title="No datasets yet" description="Submit your first dataset to get started." actionLabel="Contribute" onAction={() => navigate("/datasets/contribute")} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-gray-500 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Name</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                    <th className="px-5 py-3 text-left font-semibold">Last Updated</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.slice(0, 5).map((d) => (
                    <tr key={d.id} className="border-t border-gray-100 hover:bg-bg/50">
                      <td className="px-5 py-3.5 font-medium text-navy">{d.title}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={d.status || "draft"} /></td>
                      <td className="px-5 py-3.5 text-gray-500">{timeAgo(d.updated_at)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => navigate(`/datasets/${d.id}`)} className="p-1.5 text-gray-400 hover:text-gold"><Pencil className="w-4 h-4" /></button>
                          <button type="button" className="p-1.5 text-gray-400 hover:text-navy"><MoreVertical className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Activity timeline */}
        <section className="bg-white rounded-xl border border-border shadow-sm p-5 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <h2 className="text-base font-semibold text-navy mb-4">Activity on My Datasets</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-gray-500">No recent activity.</p>
          ) : (
            <ol className="space-y-4">
              {activity.slice(0, 4).map((item) => (
                <li key={item.id} className="flex gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full bg-gold mt-1.5 shrink-0" />
                  <div>
                    <p className="text-navy">{item.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(item.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Downloads */}
        <section className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm p-5 animate-fade-in-up" style={{ animationDelay: "350ms" }}>
          <SectionHeader title="Datasets I've Downloaded" />
          {downloads.length === 0 ? (
            <p className="text-sm text-gray-500">No downloads yet.</p>
          ) : (
            <ul className="space-y-3">
              {downloads.slice(0, 4).map((d) => (
                <li key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-gold/30 cursor-pointer" onClick={() => navigate(`/datasets/${d.id}`)}>
                  <div>
                    <p className="text-sm font-medium text-navy">{d.title}</p>
                    <p className="text-xs text-gray-500">{d.category || d.subject_name}</p>
                  </div>
                  <span className="text-xs text-gray-400">{timeAgo(d.downloaded_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recommended */}
        <section className="bg-white rounded-xl border border-border shadow-sm p-5 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <SectionHeader title="Recommended" />
          {feed.length === 0 ? (
            <p className="text-sm text-gray-500">No recommendations yet.</p>
          ) : (
            feed.slice(0, 1).map((item) => (
              <div key={item.id} className="cursor-pointer" onClick={() => navigate(`/datasets/${item.id}`)}>
                <span className="text-[10px] font-bold text-gold bg-gold-light px-2 py-0.5 rounded">Match 95%</span>
                <p className="text-sm font-semibold text-navy mt-2">{item.title}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
              </div>
            ))
          )}
        </section>
      </div>

      {/* Bookmarks / Other submissions tabs */}
      <section className="animate-fade-in-up" style={{ animationDelay: "450ms" }}>
        <div className="flex gap-1 mb-4 border-b border-border">
          {[
            { id: "bookmarks", label: "My Bookmarks", icon: Bookmark },
            { id: "submissions", label: "My Other Submissions", icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={[
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === id ? "border-gold text-gold" : "border-transparent text-gray-500 hover:text-navy",
              ].join(" ")}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeTab === "bookmarks" ? (
            <>
              <div className="bg-white rounded-xl p-4 border border-border">
                <p className="text-sm font-semibold text-navy">Historical Weather Data…</p>
                <p className="text-xs text-gray-500 mt-1">Meteorology Dept</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-border">
                <p className="text-sm font-semibold text-navy">Public Transit Rider Stats</p>
                <p className="text-xs text-gray-500 mt-1">Urban Planning</p>
              </div>
            </>
          ) : (
            <EmptyState title="No other submissions" description="Suggestions for categories or interests appear here." actionLabel="Browse datasets" onAction={() => navigate("/datasets")} />
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
