import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Database, RefreshCw, Save, Trash2, X } from "lucide-react";
import Sidebar from "../../../layouts/Sidebar";
import TopBar from "../../../layouts/TopBar";
import Button from "../../../components/ui/Button";
import Select from "../../../components/ui/Select";
import TextArea from "../../../components/ui/TextArea";
import MultiSelectTags from "../../../components/ui/MultiSelectTags";
import { useAuth } from "../../../context/useAuth";
import {
  hardDeleteDataset,
  listCategories,
  listKeywords,
  listMyDatasets,
  listSubjects,
  saveMetadata,
  softDeleteDataset,
} from "../api/datasetsApi";

function isAdminUser(user) {
  return user?.role === "admin" || user?.profile?.role === "admin";
}

function normalizeOptions(items, key = "name") {
  return items.map((item) => ({
    value: item.id,
    label: item[key],
  }));
}

function getDisplayName(user) {
  const full =
    user?.full_name ??
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  return full || user?.username || user?.email || "";
}

function formatStatus(dataset) {
  return [dataset?.status, dataset?.visibility].filter(Boolean).join(" - ");
}

export default function DatasetManagementPage() {
  const { user } = useAuth();
  const admin = isAdminUser(user);

  const [datasets, setDatasets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [keywordValues, setKeywordValues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyDeleteId, setBusyDeleteId] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setFeedback({ type: "", message: "" });
      try {
        const [datasetList, categoryList, subjectList, keywordList] =
          await Promise.all([
            listMyDatasets(),
            listCategories(),
            listSubjects(),
            listKeywords(),
          ]);

        if (cancelled) return;

        setDatasets(datasetList);
        setCategories(categoryList);
        setSubjects(subjectList);
        setKeywords(keywordList);
        setSelectedDatasetId((current) => current || datasetList[0]?.id || "");
      } catch {
        if (!cancelled) {
          setFeedback({
            type: "error",
            message: "Unable to load your datasets right now.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const keywordOptions = useMemo(
    () => keywords.map((item) => item.word),
    [keywords],
  );
  const keywordIdByWord = useMemo(
    () => Object.fromEntries(keywords.map((item) => [item.word, item.id])),
    [keywords],
  );
  const categoryOptions = useMemo(
    () => normalizeOptions(categories),
    [categories],
  );
  const subjectOptions = useMemo(() => normalizeOptions(subjects), [subjects]);

  const selectedDataset = useMemo(
    () => datasets.find((item) => item.id === selectedDatasetId) || null,
    [datasets, selectedDatasetId],
  );

  useEffect(() => {
    queueMicrotask(() => {
      if (!selectedDataset) {
        setDescription("");
        setCategoryId("");
        setSubjectId("");
        setKeywordValues([]);
        return;
      }

      const metadata = selectedDataset.metadata;
      setDescription(metadata?.description || "");
      setCategoryId(metadata?.category || "");
      setSubjectId(metadata?.subject || "");
      setKeywordValues(
        (metadata?.keywords || [])
          .map(
            (keywordId) => keywords.find((item) => item.id === keywordId)?.word,
          )
          .filter(Boolean),
      );
    });
  }, [selectedDataset, keywords]);

  async function refreshDatasets(nextSelectedId = selectedDatasetId) {
    const datasetList = await listMyDatasets();
    setDatasets(datasetList);
    if (nextSelectedId) {
      setSelectedDatasetId(nextSelectedId);
    } else if (!datasetList.find((item) => item.id === selectedDatasetId)) {
      setSelectedDatasetId(datasetList[0]?.id || "");
    }
  }

  async function handleSaveMetadata() {
    if (!selectedDataset) return;
    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      await saveMetadata(selectedDataset.id, {
        description,
        category: categoryId,
        subject: subjectId,
        keywords: keywordValues
          .map((word) => keywordIdByWord[word])
          .filter(Boolean),
      });
      await refreshDatasets(selectedDataset.id);
      setFeedback({ type: "success", message: "Metadata saved successfully." });
    } catch {
      setFeedback({
        type: "error",
        message: "Unable to save metadata. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSoftDelete(dataset) {
    setBusyDeleteId(dataset.id);
    setFeedback({ type: "", message: "" });
    try {
      await softDeleteDataset(dataset.id);
      await refreshDatasets();
      setFeedback({
        type: "success",
        message: `"${dataset.title}" was marked inactive.`,
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Soft delete failed. Please try again.",
      });
    } finally {
      setBusyDeleteId("");
      setPendingDelete(null);
    }
  }

  async function handleHardDelete(dataset) {
    setBusyDeleteId(dataset.id);
    setFeedback({ type: "", message: "" });
    try {
      await hardDeleteDataset(dataset.id, true);
      await refreshDatasets();
      setFeedback({
        type: "success",
        message: `"${dataset.title}" was permanently deleted.`,
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Hard delete failed. Please try again.",
      });
    } finally {
      setBusyDeleteId("");
      setPendingDelete(null);
    }
  }

  function confirmPendingDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.mode === "hard") {
      handleHardDelete(pendingDelete.dataset);
      return;
    }
    handleSoftDelete(pendingDelete.dataset);
  }

  const displayName = getDisplayName(user);

  return (
    <div className="min-h-screen flex bg-[#F5F5F3]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title="Dataset Management" user={{ name: displayName }} />

        <main className="flex-1 px-8 py-8">
          <div className="grid gap-6 xl:grid-cols-[360px_1fr] max-w-7xl">
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-[#0B1526]">
                    Your datasets
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Edit metadata or remove a dataset.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => refreshDatasets(selectedDatasetId)}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              <div className="p-4 space-y-3">
                {loading && (
                  <p className="text-sm text-slate-500">Loading datasets...</p>
                )}
                {!loading && datasets.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No active datasets available.
                  </p>
                )}

                {datasets.map((dataset) => {
                  const active = dataset.id === selectedDatasetId;
                  return (
                    <article
                      key={dataset.id}
                      className={[
                        "w-full rounded-xl border p-4 transition",
                        active
                          ? "border-[#8B6F1F] bg-amber-50/50"
                          : "border-slate-200 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3 text-left">
                        <button
                          type="button"
                          onClick={() => setSelectedDatasetId(dataset.id)}
                          className="min-w-0 flex-1 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-[#8B6F1F]/30"
                        >
                          <h3 className="font-semibold text-[#0B1526]">
                            {dataset.title}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatStatus(dataset)}
                          </p>
                        </button>
                        <span
                          className={[
                            "text-[11px] font-semibold rounded-full px-2.5 py-1",
                            dataset.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500",
                          ].join(" ")}
                        >
                          {dataset.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          {dataset.metadata
                            ? "Has metadata"
                            : "No metadata yet"}
                        </span>
                        {dataset.visibility === "public" && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                            Public
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDatasetId(dataset.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white"
                        >
                          <Database className="w-3.5 h-3.5" /> Edit metadata
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDelete({ mode: "soft", dataset })
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                        {admin && (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingDelete({ mode: "hard", dataset })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Hard delete
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="space-y-6">
              {feedback.message && (
                <div
                  role="status"
                  className={[
                    "rounded-xl border px-4 py-3 text-sm",
                    feedback.type === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700",
                  ].join(" ")}
                >
                  {feedback.message}
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-serif font-bold text-[#0B1526]">
                      Metadata editor
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Update category, keywords, and related metadata for the
                      selected dataset.
                    </p>
                  </div>
                  {selectedDataset && (
                    <div className="text-right text-xs text-slate-400">
                      <p className="font-semibold text-slate-600">
                        {selectedDataset.title}
                      </p>
                      <p>{formatStatus(selectedDataset)}</p>
                    </div>
                  )}
                </div>

                {!selectedDataset && !loading && (
                  <p className="text-sm text-slate-500">
                    Select a dataset to edit its metadata.
                  </p>
                )}

                {selectedDataset && (
                  <>
                    <TextArea
                      id="datasetDescription"
                      label="Metadata description"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Summarize the dataset for discovery and reuse..."
                    />

                    <div className="grid gap-x-6 md:grid-cols-2">
                      <Select
                        id="datasetCategory"
                        label="Category"
                        required
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        options={categoryOptions}
                        placeholder="Choose a category..."
                      />
                      <Select
                        id="datasetSubject"
                        label="Subject"
                        required
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                        options={subjectOptions}
                        placeholder="Choose a subject..."
                      />
                    </div>

                    <MultiSelectTags
                      id="datasetKeywords"
                      label="Keyword tags"
                      optional
                      value={keywordValues}
                      onChange={setKeywordValues}
                      options={keywordOptions}
                      placeholder="Type a keyword and press Enter..."
                    />

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        variant="gold"
                        fullWidth={false}
                        icon={Save}
                        loading={saving}
                        disabled={!description || !categoryId || !subjectId}
                        onClick={handleSaveMetadata}
                      >
                        Save metadata
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {selectedDataset && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg font-serif font-bold text-[#0B1526]">
                        Delete dataset
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">
                        Standard delete marks the dataset inactive. Admins can
                        permanently remove it.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="secondary"
                      fullWidth={false}
                      icon={Trash2}
                      loading={busyDeleteId === selectedDataset.id}
                      disabled={busyDeleteId === selectedDataset.id}
                      onClick={() =>
                        setPendingDelete({
                          mode: "soft",
                          dataset: selectedDataset,
                        })
                      }
                    >
                      Delete (soft)
                    </Button>

                    {admin && (
                      <Button
                        variant="danger"
                        fullWidth={false}
                        icon={AlertTriangle}
                        loading={busyDeleteId === selectedDataset.id}
                        disabled={busyDeleteId === selectedDataset.id}
                        onClick={() =>
                          setPendingDelete({
                            mode: "hard",
                            dataset: selectedDataset,
                          })
                        }
                      >
                        Hard delete
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {pendingDelete.mode === "hard"
                    ? "Permanent delete"
                    : "Soft delete"}
                </p>
                <h2
                  id="delete-dialog-title"
                  className="mt-1 text-lg font-serif font-bold text-[#0B1526]"
                >
                  {pendingDelete.mode === "hard"
                    ? "Permanently delete dataset?"
                    : "Mark dataset inactive?"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close delete confirmation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-sm text-slate-600">
              {pendingDelete.mode === "hard"
                ? `This will permanently remove "${pendingDelete.dataset.title}" and cannot be undone.`
                : `This will move "${pendingDelete.dataset.title}" to inactive without permanently removing it.`}
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                fullWidth={false}
                disabled={busyDeleteId === pendingDelete.dataset.id}
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant={pendingDelete.mode === "hard" ? "danger" : "gold"}
                fullWidth={false}
                icon={pendingDelete.mode === "hard" ? AlertTriangle : Trash2}
                loading={busyDeleteId === pendingDelete.dataset.id}
                onClick={confirmPendingDelete}
              >
                {pendingDelete.mode === "hard"
                  ? "Permanently delete"
                  : "Mark inactive"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
