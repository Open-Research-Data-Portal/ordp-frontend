import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import TopBar from "../../../layouts/TopBar";
import { useAuth } from "../../../context/useAuth";
import * as datasetsApi from "../hooks/datasetsApi";

const STATUS_META = {
  approved: { label: "APPROVED", dot: "bg-success", text: "text-success" },
  pending: { label: "PENDING", dot: "bg-[#D98A0D]", text: "text-[#D98A0D]" },
  rejected: { label: "REJECTED", dot: "bg-danger", text: "text-danger" },
};

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25];

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "numeric", day: "numeric", year: "numeric",
  });
}

export default function DatasetListPage() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortDesc, setSortDesc] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(0);
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
    return () => { isMounted = false; };
  }, []);

  const displayName =
    (user?.full_name ??
      [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim()) ||
    user?.username ||
    user?.email ||
    "User";

  const sortedActive = useMemo(() => {
    const active = datasets.filter((d) => d.is_active !== false);
    return [...active].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return sortDesc ? bTime - aTime : aTime - bTime;
    });
  }, [datasets, sortDesc]);

  const totalRows = sortedActive.length;
  const pageStart = page * rowsPerPage;
  const pageEnd = Math.min(pageStart + rowsPerPage, totalRows);
  const pageRows = sortedActive.slice(pageStart, pageEnd);
  const canGoPrev = page > 0;
  const canGoNext = pageEnd < totalRows;

  return (
    <div className="min-h-screen flex bg-[#F5F5F3]">
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title="My Datasets" user={{ name: displayName }} />
        <main className="flex-1 px-8 py-8">
          <div className="p-8 lg:p-10 bg-white min-h-screen rounded-2xl border border-[#E3E1DA]">
            {/* Back to dashboard */}
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="group flex items-center gap-2 text-sm font-medium text-navy hover:text-gold mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Dashboard</span>
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl text-navy">🗄</div>
              <h1 className="text-2xl font-serif font-bold text-navy">Your Donated Datasets</h1>
            </div>

            {/* Controls row: sort pill */}
            <div className="flex flex-wrap items-center gap-6 mb-6">
              <button
                type="button"
                onClick={() => setSortDesc((v) => !v)}
                className="flex items-center gap-2 bg-navy text-gold rounded-full px-4 py-2 text-xs font-semibold tracking-wide"
              >
                <span>☰</span>
                SORT BY&nbsp;&nbsp;DATE DONATED, {sortDesc ? "DESC" : "ASC"}
              </button>
            </div>

            {error && <p role="alert" className="text-danger mb-4">{error}</p>}
            {loading && <p className="text-gray-500">Loading datasets…</p>}

            {!loading && !error && totalRows === 0 && (
              <div className="bg-[#F7F6F2] rounded-xl p-10 text-center border border-[#E3E1DA]">
                <p className="text-gray-500 mb-4">You haven't uploaded any datasets yet.</p>
                <button
                  onClick={() => navigate("/datasets/contribute")}
                  className="bg-[#A67A0D] hover:bg-[#8f690b] text-white rounded-md px-4 py-2 text-sm font-semibold transition"
                >
                  Upload your first dataset
                </button>
              </div>
            )}

            {!loading && !error && totalRows > 0 && (
              <>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#E3E1DA]">
                      <th className="text-left text-xs font-semibold text-gray-500 tracking-wide uppercase py-3">
                        Dataset Name
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 tracking-wide uppercase py-3">
                        Date Donated
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 tracking-wide uppercase py-3">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((dataset) => {
                      const meta = STATUS_META[dataset.status] || {
                        label: (dataset.status || "—").toUpperCase(),
                        dot: "bg-gray-400",
                        text: "text-gray-500",
                      };
                      return (
                        <tr key={dataset.id} className="border-b border-[#E3E1DA]">
                          <td className="py-4">
                            <button
                              type="button"
                              onClick={() => navigate(`/datasets/${dataset.id}`)}
                              className="text-[#2C5AAE] hover:underline font-medium text-base"
                            >
                              {dataset.title}
                            </button>
                          </td>
                          <td className="py-4 text-sm text-navy">{formatDate(dataset.created_at)}</td>
                          <td className="py-4">
                            <span className={`inline-flex items-center gap-2 text-sm font-semibold ${meta.text}`}>
                              <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-end gap-4 mt-6 text-sm text-gray-500">
                  <span>Rows per page</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                    className="border border-[#E3E1DA] rounded-full px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-navy"
                  >
                    {ROWS_PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span>{totalRows === 0 ? "0" : pageStart + 1} to {pageEnd} of {totalRows}</span>
                  <button
                    type="button"
                    disabled={!canGoPrev}
                    onClick={() => setPage((p) => Math.max(p - 1, 0))}
                    className="text-lg disabled:opacity-30 disabled:cursor-not-allowed hover:text-navy"
                    aria-label="Previous page"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    disabled={!canGoNext}
                    onClick={() => setPage((p) => p + 1)}
                    className="text-lg disabled:opacity-30 disabled:cursor-not-allowed hover:text-navy"
                    aria-label="Next page"
                  >
                    ›
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}