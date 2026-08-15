import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../layouts/Sidebar";
import TopBar from "../../../layouts/TopBar";
import { useAuth } from "../../../context/useAuth";
import * as datasetsApi from "../hooks/datasetsApi";

function timeAgo(dateString) {
  if (!dateString) return "—";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DatasetListPage() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const loadDatasets = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await datasetsApi.getMyDatasets();
        if (isMounted) {
          // Handle both array responses and { results: [...] } paginated responses
          const list = Array.isArray(data) ? data : data?.results || [];
          setDatasets(list);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.detail || "Failed to load your datasets.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDatasets();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeDatasets = datasets.filter((d) => d.is_active !== false);
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
                {error}
              </p>
            )}

            {loading && <p className="text-gray-500">Loading datasets…</p>}

            {!loading && !error && activeDatasets.length === 0 && (
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

            {!loading && !error && activeDatasets.length > 0 && (
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
                      <span>🕒 {timeAgo(dataset.updated_at)}</span>
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