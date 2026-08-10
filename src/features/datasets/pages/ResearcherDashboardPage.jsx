import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../layouts/Sidebar";
import TopBar from "../../../layouts/TopBar";
import { useAuth } from "../../../context/useAuth";

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// TODO(backend): replace with real GET /api/datasets/mine/ once available.
const MOCK_DATASETS = [
  {
    id: "1",
    title: "Seismic Activity Patterns in Northern Ethiopia 2020-2023",
    description: "Structured sensor readings covering four seismic monitoring stations.",
    visibility: "public",
    download_count: 128,
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  {
    id: "2",
    title: "Climate Variability Analysis in the Ethiopian Highlands",
    description: "Decade-long rainfall and temperature dataset for highland agriculture research.",
    visibility: "restricted",
    download_count: 42,
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  {
    id: "3",
    title: "Urban Traffic Flow — Addis Ababa Ring Road",
    description: "Vehicle count and congestion metrics collected via roadside sensors.",
    visibility: "public",
    download_count: 7,
    updated_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    is_active: true,
  },
  {
    id: "4",
    title: "Groundwater Quality Survey — Oromia Region",
    description: "Chemical composition readings from 60 sampling wells.",
    visibility: "public",
    download_count: 15,
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
];

// TODO(backend): replace with real GET /api/datasets/recommended/ once available.
const MOCK_FEED = [
  {
    id: "101",
    title: "Machine Learning Approaches to Drought Prediction in the Horn of Africa",
    description: "Satellite-derived vegetation indices paired with rainfall records for ML-based forecasting.",
    owner_name: "Dr. Meron Tadesse",
    visibility: "public",
    download_count: 312,
    updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    match_reason: "Based on your interest in Climate Data",
  },
  {
    id: "102",
    title: "Reinforcement Learning Benchmarks for Multi-Objective Optimization",
    description: "Evaluation suite and reward-shaping data for RL research across five environments.",
    owner_name: "iCog Labs Research Team",
    visibility: "public",
    download_count: 89,
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    match_reason: "Based on your interest in Machine Learning",
  },
  {
    id: "103",
    title: "Seismic Hazard Mapping — East African Rift System",
    description: "Compiled fault-line and tremor-frequency data for regional hazard modeling.",
    owner_name: "Dr. Solomon Girma",
    visibility: "restricted",
    download_count: 54,
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    match_reason: "Similar to datasets you've viewed",
  },
  {
    id: "104",
    title: "Crop Yield Response to Soil Moisture — Rift Valley Farms",
    description: "Field-measured soil moisture and yield outcomes across three growing seasons.",
    owner_name: "Dr. Hanna Bekele",
    visibility: "public",
    download_count: 176,
    updated_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    match_reason: "Based on your interest in Climate Data",
  },
];

// TODO(backend): replace with real GET /api/activity/mine/ once available.
const MOCK_ACTIVITY = [
  {
    id: "a1",
    type: "download",
    message: "You downloaded \"Groundwater Quality Survey — Oromia Region\"",
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: "a2",
    type: "upload",
    message: "You uploaded \"Urban Traffic Flow — Addis Ababa Ring Road\"",
    timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
  {
    id: "a3",
    type: "comment",
    message: "New comment on \"Climate Variability Analysis in the Ethiopian Highlands\"",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "a4",
    type: "approval",
    message: "\"Seismic Activity Patterns in Northern Ethiopia 2020-2023\" was approved by an admin",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const ACTIVITY_STYLE = {
  download: { icon: "⬇", bg: "bg-blue-50", text: "text-blue-600" },
  upload: { icon: "📤", bg: "bg-emerald-50", text: "text-emerald-600" },
  comment: { icon: "💬", bg: "bg-amber-50", text: "text-amber-600" },
  approval: { icon: "✅", bg: "bg-violet-50", text: "text-violet-600" },
};

export default function ResearcherDashboardPage() {
  const { user } = useAuth();
  const [datasets] = useState(MOCK_DATASETS);
  const [feed] = useState(MOCK_FEED);
  const [activity] = useState(MOCK_ACTIVITY);
  const [loading] = useState(false);
  const [error] = useState(null);
  const navigate = useNavigate();

  const activeDatasets = datasets.filter((d) => d.is_active);
  const totalDownloads = datasets.reduce((sum, d) => sum + (d.download_count || 0), 0);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <div className="p-8 lg:p-10">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Welcome back, {user?.title ? `${user.title} ` : ""}
                {user?.name || "Researcher"}
              </h1>
              <p className="text-gray-500 mt-1">{today}</p>
            </div>
            <button
              onClick={() => navigate("/datasets/contribute")}
              className="bg-slate-900 text-white rounded-lg px-4 py-2.5 font-medium hover:bg-slate-800 transition"
            >
              + New Dataset
            </button>
          </div>

          {error && (
            <p role="alert" className="text-red-700 mb-4">
              Failed to load your datasets.
            </p>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <span className="text-xs text-gray-500 tracking-wide">MY DATASETS</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? "…" : activeDatasets.length}
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <span className="text-xs text-gray-500 tracking-wide">TOTAL DOWNLOADS</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? "…" : totalDownloads.toLocaleString()}
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <span className="text-xs text-gray-500 tracking-wide">PROFILE VIEWS</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {user?.profile_views ?? "—"}
              </div>
              <span className="text-xs text-gray-500">Last 30 days</span>
            </div>
          </div>

          {/* Feed — datasets based on interest */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Recommended For You</h2>
                <p className="text-xs text-gray-500 mt-0.5">Datasets matched to your research interests</p>
              </div>
              <button
                onClick={() => navigate("/datasets/explore")}
                className="text-amber-600 font-medium text-sm hover:underline shrink-0"
              >
                View all
              </button>
            </div>

            {loading && <p className="text-gray-500">Loading feed…</p>}

            {!loading && feed.length === 0 && (
              <div className="bg-white rounded-xl p-10 text-center text-gray-500">
                No recommendations yet.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {feed.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/datasets/${item.id}`)}
                  role="button"
                  tabIndex={0}
                  className="group bg-white rounded-xl p-5 shadow-sm border border-transparent hover:border-amber-200 hover:shadow-md cursor-pointer transition"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        item.visibility === "public"
                          ? "bg-slate-900 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {item.visibility === "public" ? "PUBLIC" : "PRIVATE"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      ✨ {item.match_reason}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 leading-snug group-hover:text-amber-700 transition">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{item.description}</p>

                  <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-600">
                      {item.owner_name.charAt(0)}
                    </span>
                    <span className="text-gray-600 font-medium">{item.owner_name}</span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span className="flex items-center gap-1">⬇ {item.download_count}</span>
                    <span className="flex items-center gap-1">🕒 {timeAgo(item.updated_at)}</span>
                    <span className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center group-hover:bg-amber-100 group-hover:text-amber-700 transition">
                      →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-5">Recent Activity</h2>

            {loading && <p className="text-gray-500">Loading activity…</p>}

            {!loading && activity.length === 0 && (
              <p className="text-gray-500">No recent activity.</p>
            )}

            <ol className="relative border-l-2 border-gray-100 ml-3">
              {activity.map((item) => {
                const style = ACTIVITY_STYLE[item.type] ?? {
                  icon: "•",
                  bg: "bg-gray-50",
                  text: "text-gray-600",
                };
                return (
                  <li key={item.id} className="mb-6 last:mb-0 ml-6">
                    <span
                      className={`absolute -left-[19px] flex items-center justify-center w-9 h-9 rounded-full ring-4 ring-white ${style.bg} ${style.text}`}
                    >
                      {style.icon}
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
  );
}