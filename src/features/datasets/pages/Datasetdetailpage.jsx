import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Quote,
  Eye,
  User,
  ChevronDown,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  FileText,
  HardDrive,
  Calendar,
  Copy,
  Database,
} from "lucide-react";
import { Link } from "react-router-dom";
import TopBar from "../../../layouts/TopBar";
import { useAuth } from "../../../context/useAuth";
import * as datasetsApi from "../hooks/datasetsApi";

function formatDate(dateString) {
  if (!dateString) return "—";

  return new Date(dateString).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";

  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function Card({ children, className = "", delay = 0 }) {
  return (
    <div
      className={`bg-white border border-[#E3E1DA] rounded-lg transition-all duration-300 hover:shadow-md hover:border-[#D8D3C4] animate-fade-in-up ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function EditTrigger({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="text-gold hover:text-gold-dark transition-colors"
    >
      <Pencil className="w-3.5 h-3.5" />
    </button>
  );
}

function EditActions({ onSave, onCancel, saving }) {
  return (
    <div className="flex items-center gap-2 mt-4">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1.5 bg-gold hover:bg-gold-dark text-white rounded-md px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-60"
      >
        <Check className="w-3.5 h-3.5" />
        {saving ? "Saving…" : "Save"}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="flex items-center gap-1.5 text-gray-500 hover:text-navy rounded-md px-3 py-2 text-xs font-semibold transition-colors"
      >
        <X className="w-3.5 h-3.5" />
        Cancel
      </button>
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2 border border-[#E3E1DA] rounded-md text-sm bg-[#FBFAF7] focus:outline-none focus:border-navy";

export default function DatasetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [infoOpen, setInfoOpen] = useState(true);
  const [paperOpen, setPaperOpen] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [draft, setDraft] = useState({});

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await datasetsApi.getDatasetDetail(id);

        if (isMounted) {
          setDataset(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.detail ||
              "Failed to load this dataset."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const isOwner =
    dataset?.is_owner ||
    String(dataset?.owner) === String(user?.id);

  const file = dataset?.files?.[0];

  function startEditing(section, initialDraft) {
    setSaveError(null);
    setDraft(initialDraft);
    setEditingSection(section);
  }

  function cancelEditing() {
    setEditingSection(null);
    setDraft({});
    setSaveError(null);
  }

  async function saveSection(section, patch) {
    setSaving(true);
    setSaveError(null);

    try {
      const updated = await datasetsApi.updateDataset(id, patch);

      setDataset((prev) => ({
        ...prev,
        ...(updated || patch),
      }));

      setEditingSection(null);
      setDraft({});
    } catch (err) {
      setSaveError(
        err.response?.data?.detail ||
          "Failed to save changes."
      );
    } finally {
      setSaving(false);
    }
  }

  const files = dataset?.files || [];
  const citationText = dataset
    ? `${dataset.title}. ORDP / AASTU Research Portal. ${dataset.doi || "DOI pending"}.`
    : "";

  function copyCitation() {
    if (!citationText) return;
    navigator.clipboard?.writeText(citationText);
  }

  return (
  <div className="min-h-screen bg-[#F5F5F3]">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.45s ease-out both;
        }

        @keyframes collapseIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-collapse-in {
          animation: collapseIn 0.25s ease-out both;
        }
      `}</style>

      <TopBar />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6">
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-4 animate-fade-in-up" aria-label="Breadcrumb">
          <Link to="/datasets" className="hover:text-[#A67A0D] transition-colors">Datasets</Link>
          <span>/</span>
          <span className="text-navy font-medium truncate max-w-[200px] sm:max-w-md">
            {dataset?.title || "Dataset"}
          </span>
        </nav>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-sm font-medium text-navy hover:text-gold mb-5 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back</span>
        </button>

        {loading && (
          <p className="text-gray-500">
            Loading dataset…
          </p>
        )}

        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}

        {!loading && !error && dataset && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            {/* LEFT COLUMN */}
            <Card className="overflow-hidden">
              {/* HEADER */}
              <div className="bg-navy px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-gold shrink-0">
                    <Database className="w-6 h-6" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={[
                          "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded",
                          dataset.visibility === "public"
                            ? "bg-emerald-500/20 text-emerald-200"
                            : "bg-white/15 text-white",
                        ].join(" ")}
                      >
                        {dataset.visibility || "private"}
                      </span>
                      {dataset.status && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-white/15 text-white capitalize">
                          {String(dataset.status).replace("_", " ")}
                        </span>
                      )}
                    </div>
                    <h1 className="text-2xl font-serif font-bold text-white">
                      {dataset.title}
                    </h1>

                    <p className="text-sm text-[#C7CEDB] mt-0.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Donated on {formatDate(dataset.created_at)}
                    </p>
                  </div>
                </div>

                {isOwner && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        startEditing("header", {
                          title: dataset.title,
                          description: dataset.description,
                        })
                      }
                      className="text-white hover:text-gold transition-colors"
                      aria-label="Edit dataset"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={editMode}
                      aria-label="Toggle edit mode"
                      onClick={() => {
                        if (editMode) {
                          cancelEditing();
                        }

                        setEditMode((value) => !value);
                      }}
                      className={[
                        "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0",
                        editMode
                          ? "bg-white/90"
                          : "bg-white/25",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-navy transition-transform duration-200",
                          editMode
                            ? "translate-x-5 bg-[#A67A0D]"
                            : "translate-x-0",
                        ].join(" ")}
                      />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-8">
                {/* HEADER EDIT */}
                {editingSection === "header" ? (
                  <div className="mb-8 animate-collapse-in">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Title
                    </label>

                    <input
                      type="text"
                      value={draft.title ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          title: e.target.value,
                        }))
                      }
                      className={`${inputClass} mb-4`}
                    />

                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Description
                    </label>

                    <textarea
                      value={draft.description ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          description: e.target.value,
                        }))
                      }
                      rows={4}
                      className={`${inputClass} resize-y`}
                    />

                    {saveError && (
                      <p className="text-danger text-xs mt-2">
                        {saveError}
                      </p>
                    )}

                    <EditActions
                      saving={saving}
                      onCancel={cancelEditing}
                      onSave={() =>
                        saveSection("header", {
                          title: draft.title,
                          description: draft.description,
                        })
                      }
                    />
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3 mb-8">
                    <p className="text-navy">
                      {dataset.description}
                    </p>

                    {editMode && (
                      <EditTrigger
                        label="Edit description"
                        onClick={() =>
                          startEditing("header", {
                            title: dataset.title,
                            description:
                              dataset.description,
                          })
                        }
                      />
                    )}
                  </div>
                )}

                {/* CORE METADATA */}
                {editingSection === "core" ? (
                  <div className="pb-8 border-b border-[#E3E1DA] animate-collapse-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                          Dataset Characteristics
                        </label>

                        <input
                          type="text"
                          value={
                            draft.characteristics ?? ""
                          }
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              characteristics:
                                e.target.value,
                            }))
                          }
                          placeholder="Comma-separated, e.g. Tabular, Multivariate"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                          Subject Area
                        </label>

                        <input
                          type="text"
                          value={draft.subject_name ?? ""}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              subject_name:
                                e.target.value,
                            }))
                          }
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                          Associated Tasks
                        </label>

                        <input
                          type="text"
                          value={
                            draft.associated_tasks ?? ""
                          }
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              associated_tasks:
                                e.target.value,
                            }))
                          }
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                          Feature Type
                        </label>

                        <input
                          type="text"
                          value={draft.feature_type ?? ""}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              feature_type:
                                e.target.value,
                            }))
                          }
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                          # Instances
                        </label>

                        <input
                          type="number"
                          value={draft.item_count ?? ""}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              item_count:
                                e.target.value,
                            }))
                          }
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                          # Features
                        </label>

                        <input
                          type="number"
                          value={draft.column_count ?? ""}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              column_count:
                                e.target.value,
                            }))
                          }
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {saveError && (
                      <p className="text-danger text-xs mt-2">
                        {saveError}
                      </p>
                    )}

                    <EditActions
                      saving={saving}
                      onCancel={cancelEditing}
                      onSave={() => {
                        const patch = {
                          subject_name:
                            draft.subject_name,
                          associated_tasks:
                            draft.associated_tasks,
                          feature_type:
                            draft.feature_type,

                          characteristics:
                            draft.characteristics
                              ? draft.characteristics
                                  .split(",")
                                  .map((item) =>
                                    item.trim()
                                  )
                                  .filter(Boolean)
                              : [],

                          item_count:
                            draft.item_count === ""
                              ? null
                              : Number(
                                  draft.item_count
                                ),

                          column_count:
                            draft.column_count === ""
                              ? null
                              : Number(
                                  draft.column_count
                                ),
                        };

                        saveSection("core", patch);
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-[#E3E1DA]">
                      {editMode && (
                        <span className="absolute -top-1 right-0">
                          <EditTrigger
                            label="Edit core metadata"
                            onClick={() =>
                              startEditing("core", {
                                characteristics:
                                  (
                                    dataset.characteristics ||
                                    []
                                  ).join(", "),

                                subject_name:
                                  dataset.subject_name ||
                                  "",

                                associated_tasks:
                                  dataset.associated_tasks ||
                                  "",

                                feature_type:
                                  dataset.feature_type ||
                                  "",

                                item_count:
                                  file?.item_count ?? "",

                                column_count:
                                  file?.column_count ?? "",
                              })
                            }
                          />
                        </span>
                      )}

                      <div>
                        <p className="text-base font-serif font-bold text-navy mb-1">
                          Dataset Characteristics
                        </p>

                        <p className="text-sm text-gray-600">
                          {dataset.characteristics?.join(
                            ", "
                          ) || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-base font-serif font-bold text-navy mb-1">
                          Subject Area
                        </p>

                        <p className="text-sm text-gray-600">
                          {dataset.subject_name || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-base font-serif font-bold text-navy mb-1">
                          Associated Tasks
                        </p>

                        <p className="text-sm text-gray-600">
                          {dataset.associated_tasks || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8 border-b border-[#E3E1DA]">
                      <div>
                        <p className="text-base font-serif font-bold text-navy mb-1">
                          Feature Type
                        </p>

                        <p className="text-sm text-gray-600">
                          {dataset.feature_type || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-base font-serif font-bold text-navy mb-1">
                          # Instances
                        </p>

                        <p className="text-sm text-gray-600">
                          {file?.item_count ?? "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-base font-serif font-bold text-navy mb-1">
                          # Features
                        </p>

                        <p className="text-sm text-gray-600">
                          {file?.column_count ?? "—"}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* FILES */}
                {files.length > 0 && (
                  <div className="py-6 border-b border-[#E3E1DA]">
                    <h2 className="text-xl font-serif font-bold text-navy mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#A67A0D]" />
                      Files
                    </h2>
                    <ul className="space-y-3">
                      {files.map((f, idx) => (
                        <li
                          key={f.id || idx}
                          className="flex items-center justify-between gap-4 p-4 rounded-lg border border-[#E3E1DA] bg-[#FBFAF7] hover:border-[#EADFC0] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-9 h-9 rounded-lg bg-white border border-[#E3E1DA] flex items-center justify-center shrink-0">
                              <HardDrive className="w-4 h-4 text-[#A67A0D]" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-navy truncate">
                                {f.filename || f.name || `File ${idx + 1}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {f.file_type || "—"} · {formatBytes(f.file_size)}
                                {f.item_count != null && ` · ${f.item_count} rows`}
                                {f.column_count != null && ` · ${f.column_count} cols`}
                              </p>
                            </div>
                          </div>
                          {f.download_url && (
                            <a
                              href={f.download_url}
                              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-[#A67A0D] hover:underline"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* DATASET INFORMATION */}
                <div className="py-6 border-b border-[#E3E1DA]">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setInfoOpen((value) => !value)
                      }
                      className="flex items-center gap-2 text-left"
                    >
                      <span className="text-xl font-serif font-bold text-navy">
                        Dataset Information
                      </span>

                      <ChevronDown
                        className={`w-5 h-5 text-navy transition-transform duration-300 ${
                          infoOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {editMode &&
                      infoOpen &&
                      editingSection !== "info" && (
                        <EditTrigger
                          label="Edit dataset information"
                          onClick={() =>
                            startEditing("info", {
                              has_missing_values: !!(
                                dataset.has_missing_values ??
                                file?.has_missing_values
                              ),
                            })
                          }
                        />
                      )}
                  </div>

                  {infoOpen &&
                    (editingSection === "info" ? (
                      <div className="mt-4 animate-collapse-in">
                        <label className="flex items-center gap-2 text-sm text-navy">
                          <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={
                              !!draft.has_missing_values
                            }
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                has_missing_values:
                                  e.target.checked,
                              }))
                            }
                          />

                          Has Missing Values
                        </label>

                        {saveError && (
                          <p className="text-danger text-xs mt-2">
                            {saveError}
                          </p>
                        )}

                        <EditActions
                          saving={saving}
                          onCancel={cancelEditing}
                          onSave={() =>
                            saveSection("info", {
                              has_missing_values:
                                !!draft.has_missing_values,
                            })
                          }
                        />
                      </div>
                    ) : (
                      <div className="mt-4">
                        <p className="text-base font-semibold text-navy mb-1">
                          Has Missing Values?
                        </p>

                        <p className="text-sm text-gray-600">
                          {(
                            dataset.has_missing_values ??
                            file?.has_missing_values
                          )
                            ? "Yes"
                            : "No"}
                        </p>
                      </div>
                    ))}
                </div>

                {/* INTRODUCTORY PAPER */}
                {dataset.related_publication && (
                  <div className="py-6">
                    <button
                      type="button"
                      onClick={() =>
                        setPaperOpen((value) => !value)
                      }
                      className="flex items-center justify-between w-full text-left"
                    >
                      <span className="text-xl font-serif font-bold text-navy">
                        Introductory Paper
                      </span>

                      <ChevronDown
                        className={`w-5 h-5 text-navy transition-transform duration-300 ${
                          paperOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {paperOpen && (
                      <div className="mt-4 animate-collapse-in">
                        <a
                          href={dataset.related_publication}
                          className="text-[#2C5AAE] hover:underline text-sm"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Follow
                        </a>

                        <p className="text-sm text-gray-600 mt-2">
                          {dataset.citation_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* RIGHT COLUMN */}
            <div className="flex flex-col gap-4">
              {/* DOWNLOAD */}
              <a
                href={file?.download_url || "#"}
                className="flex items-center justify-center gap-2 bg-navy hover:bg-[#132038] text-white rounded-md px-6 py-3.5 text-sm font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5 animate-fade-in-up"
              >
                <Download className="w-4 h-4" />

                DOWNLOAD{" "}
                {file?.file_size
                  ? `(${formatBytes(file.file_size)})`
                  : ""}
              </a>

              {/* CITE */}
              <button
                type="button"
                onClick={copyCitation}
                className="flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-white rounded-md px-6 py-3.5 text-sm font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5 animate-fade-in-up"
                style={{ animationDelay: "50ms" }}
              >
                <Quote className="w-4 h-4" />
                CITE
              </button>

              {citationText && (
                <div className="bg-white border border-[#E3E1DA] rounded-lg p-4 text-xs text-gray-600 leading-relaxed animate-fade-in-up" style={{ animationDelay: "75ms" }}>
                  <p className="font-semibold text-navy mb-1 flex items-center gap-1">
                    <Copy className="w-3.5 h-3.5" />
                    Citation
                  </p>
                  {citationText}
                </div>
              )}

              {/* STATISTICS */}
              <Card className="p-6" delay={100}>
                <div className="flex items-center gap-2 text-sm text-navy mb-2">
                  <Quote className="w-4 h-4 text-gray-400" />

                  <span>
                    {dataset.citation_count ?? 0} citations
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-navy">
                  <Eye className="w-4 h-4 text-gray-400" />

                  <span>
                    {dataset.view_count ?? 0} views
                  </span>
                </div>
              </Card>

              {/* KEYWORDS */}
              <Card className="p-6" delay={150}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-lg font-serif font-bold text-navy">
                    Keywords
                  </p>

                  {editMode &&
                    editingSection !== "keywords" && (
                      <EditTrigger
                        label="Edit keywords"
                        onClick={() =>
                          startEditing("keywords", {
                            keywords: dataset.keywords
                              ? [...dataset.keywords]
                              : [],
                            newKeyword: "",
                          })
                        }
                      />
                    )}
                </div>

                {editingSection === "keywords" ? (
                  <div className="animate-collapse-in">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(draft.keywords || []).map(
                        (keyword, index) => (
                          <span
                            key={`${keyword}-${index}`}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[#2C5AAE] text-[#2C5AAE]"
                          >
                            {keyword}

                            <button
                              type="button"
                              onClick={() =>
                                setDraft((d) => ({
                                  ...d,
                                  keywords:
                                    d.keywords.filter(
                                      (_, idx) =>
                                        idx !== index
                                    ),
                                }))
                              }
                              aria-label={`Remove ${keyword}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        )
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={draft.newKeyword || ""}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            newKeyword: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            draft.newKeyword?.trim()
                          ) {
                            e.preventDefault();

                            setDraft((d) => ({
                              ...d,
                              keywords: [
                                ...(d.keywords || []),
                                d.newKeyword.trim(),
                              ],
                              newKeyword: "",
                            }));
                          }
                        }}
                        placeholder="Add keyword"
                        className={inputClass}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          if (!draft.newKeyword?.trim()) {
                            return;
                          }

                          setDraft((d) => ({
                            ...d,
                            keywords: [
                              ...(d.keywords || []),
                              d.newKeyword.trim(),
                            ],
                            newKeyword: "",
                          }));
                        }}
                        className="shrink-0 bg-[#F2E7C4] text-[#A67A0D] rounded-md px-3 hover:bg-[#EADFC0] transition-colors"
                        aria-label="Add keyword"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {saveError && (
                      <p className="text-danger text-xs mt-2">
                        {saveError}
                      </p>
                    )}

                    <EditActions
                      saving={saving}
                      onCancel={cancelEditing}
                      onSave={() =>
                        saveSection("keywords", {
                          keywords: draft.keywords,
                        })
                      }
                    />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(dataset.keywords || []).map(
                      (keyword) => (
                        <span
                          key={keyword}
                          className="text-xs px-3 py-1.5 rounded-full border border-[#2C5AAE] text-[#2C5AAE] transition-colors hover:bg-[#2C5AAE] hover:text-white cursor-default"
                        >
                          {keyword}
                        </span>
                      )
                    )}

                    {(!dataset.keywords ||
                      dataset.keywords.length === 0) && (
                      <span className="text-sm text-gray-400">
                        No keywords listed
                      </span>
                    )}
                  </div>
                )}
              </Card>

              {/* CREATORS */}
              <Card className="p-6" delay={200}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-lg font-serif font-bold text-navy">
                    Creators
                  </p>

                  {editMode &&
                    editingSection !== "creators" && (
                      <EditTrigger
                        label="Edit creators"
                        onClick={() =>
                          startEditing("creators", {
                            creators: dataset.creators
                              ? dataset.creators.map(
                                  (creator) => ({
                                    ...creator,
                                  })
                                )
                              : [],
                          })
                        }
                      />
                    )}
                </div>

                {editingSection === "creators" ? (
                  <div className="animate-collapse-in flex flex-col gap-3">
                    {(draft.creators || []).map(
                      (creator, index) => (
                        <div
                          key={index}
                          className="border border-[#E3E1DA] rounded-md p-3 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500">
                              Creator {index + 1}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                setDraft((d) => ({
                                  ...d,
                                  creators:
                                    d.creators.filter(
                                      (_, idx) =>
                                        idx !== index
                                    ),
                                }))
                              }
                              aria-label="Remove creator"
                              className="text-danger hover:opacity-70"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <input
                            type="text"
                            value={creator.name || ""}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                creators:
                                  d.creators.map(
                                    (item, idx) =>
                                      idx === index
                                        ? {
                                            ...item,
                                            name: e.target
                                              .value,
                                          }
                                        : item
                                  ),
                              }))
                            }
                            placeholder="Name"
                            className={inputClass}
                          />

                          <input
                            type="email"
                            value={creator.email || ""}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                creators:
                                  d.creators.map(
                                    (item, idx) =>
                                      idx === index
                                        ? {
                                            ...item,
                                            email:
                                              e.target
                                                .value,
                                          }
                                        : item
                                  ),
                              }))
                            }
                            placeholder="Email"
                            className={inputClass}
                          />

                          <input
                            type="text"
                            value={
                              creator.affiliation || ""
                            }
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                creators:
                                  d.creators.map(
                                    (item, idx) =>
                                      idx === index
                                        ? {
                                            ...item,
                                            affiliation:
                                              e.target
                                                .value,
                                          }
                                        : item
                                  ),
                              }))
                            }
                            placeholder="Affiliation (optional)"
                            className={inputClass}
                          />
                        </div>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          creators: [
                            ...(d.creators || []),
                            {
                              name: "",
                              email: "",
                              affiliation: "",
                            },
                          ],
                        }))
                      }
                      className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#A67A0D] border border-dashed border-[#EADFC0] rounded-md py-2 hover:bg-[#FBF6E9] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add creator
                    </button>

                    {saveError && (
                      <p className="text-danger text-xs">
                        {saveError}
                      </p>
                    )}

                    <EditActions
                      saving={saving}
                      onCancel={cancelEditing}
                      onSave={() =>
                        saveSection("creators", {
                          creators: draft.creators,
                        })
                      }
                    />
                  </div>
                ) : (
                  <>
                    {(dataset.creators || []).map(
                      (creator, index) => (
                        <div
                          key={index}
                          className="mb-2 last:mb-0"
                        >
                          <p className="text-sm font-semibold text-navy">
                            {creator.name}
                          </p>

                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <User className="w-3 h-3" />
                            {creator.email}
                          </p>

                          {creator.affiliation && (
                            <p className="text-xs text-gray-500 ml-5">
                              {creator.affiliation}
                            </p>
                          )}
                        </div>
                      )
                    )}

                    {(!dataset.creators ||
                      dataset.creators.length === 0) && (
                      <p className="text-sm text-gray-400">
                        No creators listed
                      </p>
                    )}
                  </>
                )}
              </Card>

              {/* DOI */}
              <Card className="p-6" delay={250}>
                <p className="text-lg font-serif font-bold text-navy mb-2">
                  DOI
                </p>

                <p className="text-sm text-gray-600">
                  {dataset.doi || "Pending"}
                </p>
              </Card>

              {/* LICENSE */}
              <Card className="p-6" delay={300}>
                <p className="text-lg font-serif font-bold text-navy mb-2">
                  License
                </p>

                <p className="text-sm text-gray-600">
                  This dataset is licensed under a{" "}
                  <a
                    href={dataset.license_url || "#"}
                    className="text-[#2C5AAE] hover:underline font-medium"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Creative Commons license
                  </a>
                  .
                </p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

