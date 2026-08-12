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
// Placeholder data for UI-only development.
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
];

export default function DatasetListPage() {
  const [datasets] = useState(MOCK_DATASETS);
  const [loading] = useState(false);
  const [error] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const activeDatasets = datasets.filter((d) => d.is_active);
  const displayName =
    (user?.full_name ??
      [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim()) ||
    user?.username ||
    user?.email ||
    "User";

  return (
    <div className="min-h-screen flex bg-[#F5F5F3]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title="My Datasets" user={{ name: displayName }} />
        <main className="flex-1 px-8 py-8">
          <div className="p-8 lg:p-10 bg-gray-50 min-h-screen rounded-2xl border border-slate-200">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">My Datasets</h1>
                <p className="text-gray-500 mt-1">
                  {loading ? "Loading…" : `${activeDatasets.length} dataset${activeDatasets.length === 1 ? "" : "s"}`}
                </p>
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

            {loading && <p className="text-gray-500">Loading datasets…</p>}

            {!loading && activeDatasets.length === 0 && (
              <div className="bg-white rounded-xl p-10 text-center">
                <p className="text-gray-500 mb-4">You haven't uploaded any datasets yet.</p>
                <button
                  onClick={() => navigate("/datasets/contribute")}
                  className="bg-slate-900 text-white rounded-lg px-4 py-2 font-medium hover:bg-slate-800 transition"
                >
                  Upload your first dataset
                </button>
              </div>
            )}

            {!loading && activeDatasets.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeDatasets.map((dataset) => (
                  <div
                    key={dataset.id}
                    onClick={() => navigate(`/datasets/${dataset.id}`)}
                    role="button"
                    tabIndex={0}
                    className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition"
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
            )}
          </div>
        </main>
      </div>
    </div>
  );
}