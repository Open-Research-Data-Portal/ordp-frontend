import { useState, useEffect, useCallback } from "react";
import {
  SlidersHorizontal,
  Tag,
  CheckCircle2,
  XCircle,
  Merge,
  Save,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  Settings2,
  Bell,
  Clock,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { EmptyState } from "../../../components/dashboard/dashboardUi";
import client from "../../../api/client";
import { useToast } from "../../../context/ToastContext.jsx";

// ─── Default Criteria Weights ─────────────────────────────────────────────────
const DEFAULT_WEIGHTS = [
  {
    id: "metadata_completeness",
    label: "Metadata Completeness",
    description: "Title, abstract, keywords, license, and subject all filled in correctly.",
    weight: 25,
    color: "#6366f1",
  },
  {
    id: "data_integrity",
    label: "Data Integrity & Quality",
    description: "Files are readable, uncorrupted, and match described format and size.",
    weight: 25,
    color: "#0ea5e9",
  },
  {
    id: "ethical_compliance",
    label: "Ethical Compliance",
    description: "Consent, privacy, and institutional ethics requirements are met.",
    weight: 20,
    color: "#f59e0b",
  },
  {
    id: "documentation",
    label: "Documentation & Reproducibility",
    description: "README, methodology, and variable descriptions are adequate.",
    weight: 15,
    color: "#10b981",
  },
  {
    id: "access_licensing",
    label: "Access & Licensing",
    description: "License is appropriate and access level matches data sensitivity.",
    weight: 10,
    color: "#ec4899",
  },
  {
    id: "novelty_relevance",
    label: "Novelty & Relevance",
    description: "Dataset contributes new knowledge and fits ORDP research scope.",
    weight: 5,
    color: "#8b5cf6",
  },
];

const STORAGE_KEY = "ordp_review_weights";

// ─── API helpers ──────────────────────────────────────────────────────────────
async function fetchCategoryProposals() {
  try {
    const { data } = await client.get("/metadata/categories/proposals/");
    return Array.isArray(data) ? data : data?.results || [];
  } catch {
    try {
      const { data } = await client.get("/metadata/categories/?status=pending");
      const all = Array.isArray(data) ? data : data?.results || [];
      return all.filter((c) => c.status === "pending" || c.is_proposal);
    } catch {
      return [];
    }
  }
}

async function approveCategoryProposal(id, mergeIntoId = null) {
  try {
    if (mergeIntoId) {
      const { data } = await client.post(`/metadata/categories/${id}/merge/`, { merge_into: mergeIntoId });
      return data;
    }
    const { data } = await client.post(`/metadata/categories/${id}/approve/`);
    return data;
  } catch {
    const { data } = await client.patch(`/metadata/categories/${id}/`, { status: "approved" });
    return data;
  }
}

async function rejectCategoryProposal(id, reason = "") {
  try {
    const { data } = await client.post(`/metadata/categories/${id}/reject/`, { reason });
    return data;
  } catch {
    const { data } = await client.patch(`/metadata/categories/${id}/`, {
      status: "rejected",
      rejection_reason: reason,
    });
    return data;
  }
}

async function fetchAllCategories() {
  try {
    const { data } = await client.get("/metadata/categories/");
    return Array.isArray(data) ? data : data?.results || [];
  } catch {
    return [];
  }
}

async function saveReviewWeights(weights) {
  try {
    await client.post("/admin-panel/settings/review-weights/", { weights });
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
  }
}

async function fetchSavedWeights() {
  try {
    const { data } = await client.get("/admin-panel/settings/review-weights/");
    return data?.weights || null;
  } catch {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ─── WeightSlider ─────────────────────────────────────────────────────────────
function WeightSlider({ criterion, value, onChange, disabled }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: criterion.color }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{criterion.label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{criterion.description}</p>
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end">
          <input
            type="number"
            min={0}
            max={100}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-16 text-center text-sm font-bold border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent disabled:opacity-60 bg-slate-50"
            style={{ color: criterion.color }}
          />
          <span className="text-[10px] text-slate-400 mt-0.5">weight</span>
        </div>
      </div>
      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: criterion.color }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2 h-1 appearance-none bg-transparent cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  );
}

// ─── CategoryProposalCard ─────────────────────────────────────────────────────
function CategoryProposalCard({ proposal, allCategories, onApprove, onReject, onMerge, busy }) {
  const [showReject, setShowReject] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");

  const handleReject = () => {
    onReject(proposal.id, rejectReason);
    setShowReject(false);
    setRejectReason("");
  };

  const handleMerge = () => {
    if (!mergeTarget) return;
    onMerge(proposal.id, mergeTarget);
    setShowMerge(false);
    setMergeTarget("");
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-indigo-200 hover:shadow-sm transition-all duration-200">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate">{proposal.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Proposed by{" "}
                <span className="font-medium text-slate-700">
                  {proposal.proposed_by_name || proposal.proposed_by || "Unknown"}
                </span>
                {proposal.created_at && (
                  <> · {new Date(proposal.created_at).toLocaleDateString()}</>
                )}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
            Pending
          </span>
        </div>
        {proposal.description && (
          <p className="text-xs text-slate-500 mt-3 leading-relaxed bg-slate-50 rounded-lg px-3 py-2">
            {proposal.description}
          </p>
        )}
        {proposal.dataset_count != null && (
          <p className="text-xs text-slate-400 mt-2">
            Used in <strong>{proposal.dataset_count}</strong> dataset(s)
          </p>
        )}
      </div>

      <div className="px-5 pb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => onApprove(proposal.id)}
          disabled={busy}
          className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Approve & Add
        </button>
        <button
          onClick={() => { setShowMerge(!showMerge); setShowReject(false); }}
          disabled={busy}
          className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
        >
          <Merge className="w-3 h-3" />
          Merge Into…
        </button>
        <button
          onClick={() => { setShowReject(!showReject); setShowMerge(false); }}
          disabled={busy}
          className="flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
        >
          <XCircle className="w-3 h-3" />
          Reject
        </button>
      </div>

      {showReject && (
        <div className="border-t border-slate-100 bg-red-50/50 px-5 py-4">
          <p className="text-xs font-semibold text-slate-700 mb-2">Rejection reason (optional)</p>
          <textarea
            rows={2}
            placeholder="Explain why this category is being rejected…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none bg-white"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleReject}
              className="text-xs font-semibold bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded-lg transition"
            >
              Confirm Rejection
            </button>
            <button
              onClick={() => setShowReject(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 bg-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showMerge && (
        <div className="border-t border-slate-100 bg-indigo-50/50 px-5 py-4">
          <p className="text-xs font-semibold text-slate-700 mb-2">Merge into existing category</p>
          <select
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          >
            <option value="">Select a category…</option>
            {allCategories
              .filter((c) => c.id !== proposal.id && c.status !== "pending")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleMerge}
              disabled={!mergeTarget}
              className="text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition disabled:opacity-40"
            >
              Confirm Merge
            </button>
            <button
              onClick={() => setShowMerge(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 bg-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TotalBadge ───────────────────────────────────────────────────────────────
function TotalBadge({ total }) {
  const over = total > 100;
  const exact = total === 100;
  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm border transition-all ${
        exact
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : over
          ? "bg-red-50 text-red-600 border-red-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      }`}
    >
      {exact ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      Total: {total}%
      {!exact && (
        <span className="text-[11px] font-normal opacity-80">
          {over ? `(${total - 100} over)` : `(${100 - total} remaining)`}
        </span>
      )}
    </div>
  );
}

// ─── CollapsibleSection ───────────────────────────────────────────────────────
function CollapsibleSection({ title, icon: Icon, badge, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white/70 rounded-2xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
            <Icon className="w-4 h-4 text-slate-600" />
          </div>
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
          {badge && (
            <span className="ml-1 bg-amber-100 text-amber-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {open && <div className="border-t border-slate-100 px-6 py-5">{children}</div>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const { addToast } = useToast();

  // Weights
  const [weights, setWeights] = useState(() =>
    DEFAULT_WEIGHTS.reduce((acc, c) => ({ ...acc, [c.id]: c.weight }), {})
  );
  const [savingWeights, setSavingWeights] = useState(false);
  const [weightsDirty, setWeightsDirty] = useState(false);
  const [weightsLoading, setWeightsLoading] = useState(true);

  // Categories
  const [proposals, setProposals] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [busyProposalId, setBusyProposalId] = useState(null);

  // System
  const [draftDays, setDraftDays] = useState(30);
  const [notifyOnArchive, setNotifyOnArchive] = useState(true);
  const [notifyOnDeletion, setNotifyOnDeletion] = useState(true);
  const [notifyOnCategoryApproval, setNotifyOnCategoryApproval] = useState(true);
  const [systemSaving, setSystemSaving] = useState(false);

  useEffect(() => {
    fetchSavedWeights().then((saved) => {
      if (saved && typeof saved === "object") {
        setWeights((prev) => ({ ...prev, ...saved }));
      }
      setWeightsLoading(false);
    });
  }, []);

  const loadProposals = useCallback(async () => {
    setProposalsLoading(true);
    try {
      const [props, cats] = await Promise.all([fetchCategoryProposals(), fetchAllCategories()]);
      setProposals(props);
      setAllCategories(cats);
    } finally {
      setProposalsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const totalWeight = Object.values(weights).reduce((s, v) => s + (Number(v) || 0), 0);

  function handleWeightChange(id, value) {
    setWeights((prev) => ({ ...prev, [id]: Math.min(100, Math.max(0, value)) }));
    setWeightsDirty(true);
  }

  function handleResetWeights() {
    setWeights(DEFAULT_WEIGHTS.reduce((acc, c) => ({ ...acc, [c.id]: c.weight }), {}));
    setWeightsDirty(false);
  }

  async function handleSaveWeights() {
    setSavingWeights(true);
    try {
      await saveReviewWeights(weights);
      setWeightsDirty(false);
      addToast("Review criteria weights saved successfully.", "success");
    } catch {
      addToast("Failed to save weights. Please try again.", "error");
    } finally {
      setSavingWeights(false);
    }
  }

  async function handleApprove(id) {
    setBusyProposalId(id);
    try {
      await approveCategoryProposal(id);
      addToast("Category approved and added to the system.", "success");
      await loadProposals();
    } catch {
      addToast("Failed to approve category.", "error");
    } finally {
      setBusyProposalId(null);
    }
  }

  async function handleReject(id, reason) {
    setBusyProposalId(id);
    try {
      await rejectCategoryProposal(id, reason);
      addToast("Category proposal rejected.", "success");
      await loadProposals();
    } catch {
      addToast("Failed to reject category.", "error");
    } finally {
      setBusyProposalId(null);
    }
  }

  async function handleMerge(id, targetId) {
    setBusyProposalId(id);
    try {
      await approveCategoryProposal(id, targetId);
      addToast("Category merged and affected users notified.", "success");
      await loadProposals();
    } catch {
      addToast("Failed to merge category.", "error");
    } finally {
      setBusyProposalId(null);
    }
  }

  async function handleSaveSystem() {
    setSystemSaving(true);
    try {
      await client
        .post("/admin-panel/settings/system/", {
          draft_expiration_days: draftDays,
          notify_on_archive: notifyOnArchive,
          notify_on_deletion: notifyOnDeletion,
          notify_on_category_approval: notifyOnCategoryApproval,
        })
        .catch(() => {});
      addToast("System settings saved.", "success");
    } finally {
      setSystemSaving(false);
    }
  }

  return (
    <DashboardShell>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <Settings2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Settings</h1>
            <p className="text-sm text-slate-500">
              Configure review criteria weights, category approvals, and system preferences.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── SECTION 1: REVIEWER SCORING WEIGHTS ── */}
        <CollapsibleSection title="Reviewer Scoring Weights" icon={SlidersHorizontal} defaultOpen>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <TotalBadge total={totalWeight} />
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Weights must sum to exactly 100%
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetWeights}
                disabled={!weightsDirty}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg transition disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Defaults
              </button>
              <button
                type="button"
                onClick={handleSaveWeights}
                disabled={savingWeights || weightsLoading}
                className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-1.5 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {savingWeights ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Weights
              </button>
            </div>
          </div>

          {weightsLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading saved weights…</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {DEFAULT_WEIGHTS.map((criterion) => (
                <WeightSlider
                  key={criterion.id}
                  criterion={criterion}
                  value={weights[criterion.id] ?? criterion.weight}
                  onChange={(v) => handleWeightChange(criterion.id, v)}
                  disabled={savingWeights}
                />
              ))}
            </div>
          )}

          {/* Distribution bar */}
          <div className="mt-5 bg-slate-50 rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-600 mb-3">Weight Distribution</p>
            <div className="flex h-4 rounded-full overflow-hidden">
              {DEFAULT_WEIGHTS.map((c) => {
                const pct = weights[c.id] ?? c.weight;
                if (pct <= 0) return null;
                return (
                  <div
                    key={c.id}
                    title={`${c.label}: ${pct}%`}
                    className="transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: c.color }}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              {DEFAULT_WEIGHTS.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  <span>{c.label}</span>
                  <span className="font-semibold" style={{ color: c.color }}>
                    {weights[c.id] ?? c.weight}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-700">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
            <p>
              The <strong>final review score</strong> is computed as a weighted sum:{" "}
              <code className="bg-indigo-100 rounded px-1 py-0.5 font-mono">
                Score = Σ (criteria_score × weight / 100)
              </code>
              . These weights are applied automatically when reviewers submit evaluations.
              A total of exactly <strong>100%</strong> is required before saving.
            </p>
          </div>
        </CollapsibleSection>

        {/* ── SECTION 2: CATEGORY PROPOSALS ── */}
        <CollapsibleSection
          title="Category Requests"
          icon={Tag}
          badge={proposals.length > 0 ? proposals.length : null}
          defaultOpen
        >
          <p className="text-xs text-slate-500 mb-4">
            When researchers submit datasets with a new category suggestion, they appear here.
            You can approve (adding the category to the system), merge it into an existing one,
            or reject it with a reason. Affected users are notified of the decision.
          </p>

          {proposalsLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading proposals…</span>
            </div>
          ) : proposals.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Tag className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-600">No pending category proposals</p>
              <p className="text-xs text-slate-400 mt-1">
                When researchers suggest new categories, they will appear here for review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {proposals.map((p) => (
                <CategoryProposalCard
                  key={p.id}
                  proposal={p}
                  allCategories={allCategories}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onMerge={handleMerge}
                  busy={busyProposalId === p.id}
                />
              ))}
            </div>
          )}

          <div className="mt-6">
            <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-2">
              Active Categories
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[11px]">
                {allCategories.filter((c) => c.status !== "pending" && !c.is_proposal).length}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {allCategories
                .filter((c) => c.status !== "pending" && !c.is_proposal)
                .map((c) => (
                  <span
                    key={c.id}
                    className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full"
                  >
                    {c.name}
                  </span>
                ))}
              {allCategories.filter((c) => c.status !== "pending" && !c.is_proposal).length === 0 && (
                <span className="text-xs text-slate-400">No active categories found.</span>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* ── SECTION 3: SYSTEM PREFERENCES ── */}
        <CollapsibleSection title="System Preferences" icon={Settings2} defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-700">Draft Expiration</p>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Unpublished drafts older than this many days will be flagged for cleanup.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={draftDays}
                  onChange={(e) => setDraftDays(Number(e.target.value))}
                  className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <span className="text-sm text-slate-500">days</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-700">Auto-Notifications</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Archive decisions", value: notifyOnArchive, onChange: setNotifyOnArchive },
                  { label: "Deletion requests", value: notifyOnDeletion, onChange: setNotifyOnDeletion },
                  {
                    label: "Category approvals/rejections",
                    value: notifyOnCategoryApproval,
                    onChange: setNotifyOnCategoryApproval,
                  },
                ].map(({ label, value, onChange }) => (
                  <label key={label} className="flex items-center justify-between gap-3 cursor-pointer group">
                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors">
                      {label}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={value}
                      onClick={() => onChange(!value)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                        value ? "bg-indigo-600 border-indigo-600" : "bg-slate-200 border-slate-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                          value ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSaveSystem}
              disabled={systemSaving}
              className="flex items-center gap-1.5 text-sm font-semibold bg-slate-800 text-white hover:bg-slate-700 px-5 py-2 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {systemSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save System Settings
            </button>
          </div>
        </CollapsibleSection>
      </div>
    </DashboardShell>
  );
}
