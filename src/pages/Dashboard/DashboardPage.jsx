import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Database, Pencil, Trash2, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../layouts/Sidebar";
import TopBar from "../../layouts/TopBar";
import Button from "../../components/ui/Button";
import { useAuth } from "../../context/useAuth";
import * as datasetsApi from "../../features/datasets/api/datasetsApi";

function getDisplayName(user) {
  const full =
    user?.full_name ??
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  return full || user?.username || user?.email || "";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [datasetError, setDatasetError] = useState("");
  const [datasetMessage, setDatasetMessage] = useState("");
  const [busyDatasetId, setBusyDatasetId] = useState("");

  const isAdmin = useMemo(
    () => user?.role === "admin" || user?.profile?.role === "admin" || user?.is_staff,
    [user]
  );

  useEffect(() => {
    let cancelled = false;
    datasetsApi
      .listMyDatasets()
      .then((items) => {
        if (!cancelled) setDatasets(items);
      })
      .catch((err) => {
        if (!cancelled) setDatasetError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingDatasets(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSoftDelete(dataset) {
    const confirmed = window.confirm(`Deactivate "${dataset.title}"?`);
    if (!confirmed) return;
    setBusyDatasetId(dataset.id);
    setDatasetError("");
    setDatasetMessage("");
    try {
      await datasetsApi.softDeleteDataset(dataset.id);
      setDatasets((items) => items.filter((item) => item.id !== dataset.id));
      setDatasetMessage("Dataset deactivated.");
    } catch (err) {
      setDatasetError(err.message);
    } finally {
      setBusyDatasetId("");
    }
  }

  async function handleHardDelete(dataset) {
    const confirmed = window.confirm(
      `Permanently delete "${dataset.title}"? This cannot be undone.`
    );
    if (!confirmed) return;
    setBusyDatasetId(dataset.id);
    setDatasetError("");
    setDatasetMessage("");
    try {
      await datasetsApi.hardDeleteDataset(dataset.id);
      setDatasets((items) => items.filter((item) => item.id !== dataset.id));
      setDatasetMessage("Dataset permanently deleted.");
    } catch (err) {
      setDatasetError(err.message);
    } finally {
      setBusyDatasetId("");
    }
  }

  return (
    <div className="min-h-screen flex bg-[#F5F5F3]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title="Dashboard" user={{ name: getDisplayName(user) }} />
        <main className="flex-1 px-8 py-8">
          <div className="max-w-4xl">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#0B1526] mb-2">
                    Welcome to your research dashboard
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    From here you can manage projects, submissions, and access university research
                    resources.
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <Button
                    variant="gold"
                    fullWidth={false}
                    icon={ArrowRight}
                    onClick={() => navigate("/data-upload")}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Data Upload
                    </span>
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth={false}
                    icon={ArrowRight}
                    onClick={() => navigate("/profile")}
                  >
                    <span className="inline-flex items-center gap-2">
                      <UserRound className="w-4 h-4" />
                      Profile
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0B1526]">My datasets</h2>
                  <p className="text-sm text-slate-500">Manage metadata and dataset availability.</p>
                </div>
              </div>

              {datasetMessage && (
                <div role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
                  {datasetMessage}
                </div>
              )}
              {datasetError && (
                <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  {datasetError}
                </div>
              )}

              {loadingDatasets ? (
                <p className="text-sm text-slate-500">Loading datasets...</p>
              ) : datasets.length === 0 ? (
                <p className="text-sm text-slate-500">No active datasets yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="py-3 pr-4 font-semibold">Title</th>
                        <th className="py-3 pr-4 font-semibold">Visibility</th>
                        <th className="py-3 pr-4 font-semibold">Status</th>
                        <th className="py-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datasets.map((dataset) => {
                        const isBusy = busyDatasetId === dataset.id;
                        return (
                          <tr key={dataset.id} className="border-b border-slate-100 last:border-0">
                            <td className="py-3 pr-4 font-medium text-slate-800">{dataset.title}</td>
                            <td className="py-3 pr-4 capitalize text-slate-600">{dataset.visibility}</td>
                            <td className="py-3 pr-4 capitalize text-slate-600">{dataset.status}</td>
                            <td className="py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => navigate("/projects")}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                  aria-label={`Edit metadata for ${dataset.title}`}
                                  title="Edit metadata"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleSoftDelete(dataset)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                                  aria-label={`Deactivate ${dataset.title}`}
                                  title="Deactivate"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleHardDelete(dataset)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60"
                                    aria-label={`Permanently delete ${dataset.title}`}
                                    title="Permanently delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
