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

export default function ResearcherDashboardPage() {
  const { user } = useAuth();
  const [datasets] = useState(MOCK_DATASETS);
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-7">
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

          {/* Body */}
          <div className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr] gap-5">
            <div className="bg-white rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-slate-900">My Datasets</h2>
                <button
                  onClick={() => navigate("/datasets")}
                  className="text-amber-600 font-medium text-sm hover:underline"
                >
                  View all
                </button>
              </div>

              {loading && <p className="text-gray-500">Loading datasets…</p>}

              {!loading && activeDatasets.length === 0 && (
                <p className="text-gray-500">No active datasets yet.</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeDatasets.slice(0, 4).map((dataset) => (
                  <div
                    key={dataset.id}
                    onClick={() => navigate(`/datasets/${dataset.id}`)}
                    role="button"
                    tabIndex={0}
                    className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          dataset.visibility === "public"
                            ? "bg-slate-900 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {dataset.visibility === "public" ? "PUBLIC" : "PRIVATE"}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          aria-label="Edit dataset"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/datasets/${dataset.id}/edit`);
                          }}
                          className="text-gray-500 hover:text-slate-900"
                        >
                          ✎
                        </button>
                        <button
                          aria-label={dataset.visibility === "public" ? "Share dataset" : "Restricted"}
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-500 hover:text-slate-900"
                        >
                          {dataset.visibility === "public" ? "⤴" : "🔒"}
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 mt-3">{dataset.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{dataset.description}</p>

                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                      <span>⬇ {dataset.download_count ?? 0}</span>
                      <span>🕒 {dataset.updated_at ? timeAgo(dataset.updated_at) : "—"}</span>
                      <button
                        aria-label="Open dataset"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/datasets/${dataset.id}`);
                        }}
                        className="bg-gray-100 rounded-md w-7 h-7 flex items-center justify-center hover:bg-gray-200"
                      >
                        →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tip panel */}
            <div className="bg-slate-900 text-white rounded-xl p-5 h-fit">
              <h3 className="font-semibold mb-2">Researcher Tip</h3>
              <p className="text-sm text-slate-300">
                You can increase your citation impact by tagging your datasets with standard DOI
                identifiers from the library portal.
              </p>
              <a href="/help/doi" className="text-amber-400 text-sm font-medium mt-2 inline-block">
                Learn more →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}