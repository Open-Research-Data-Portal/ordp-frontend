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
  Search,
  Edit2,
  ArrowRight,
  Plus,
  RefreshCw,
  X,
  Trash2,
  UserX,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { EmptyState } from "../../../components/dashboard/dashboardUi";
import client from "../../../api/client";
import { useToast } from "../../../context/ToastContext.jsx";
import * as datasetsApi from "../hooks/datasetsApi";

// ─── Default Criteria Weights ─────────────────────────────────────────────────
const DEFAULT_WEIGHTS = [
  {
    id: "metadata_completeness",
    label: "Metadata Completeness",
    description: "Title, abstract, keywords, license, and subject all filled in correctly.",
    weight: 25,
    color: "#0C1236", // Primary Navy (100% weight)
  },
  {
    id: "data_integrity",
    label: "Data Integrity & Quality",
    description: "Files are readable, uncorrupted, and match described format and size.",
    weight: 25,
    color: "#1A2248", // Navy Muted (80% weight)
  },
  {
    id: "ethical_compliance",
    label: "Ethical Compliance",
    description: "Consent, privacy, and institutional ethics requirements are met.",
    weight: 20,
    color: "#8B6914", // Gold Dark
  },
  {
    id: "documentation",
    label: "Documentation & Reproducibility",
    description: "README, methodology, and variable descriptions are adequate.",
    weight: 15,
    color: "#A87E0E", // Primary Gold
  },
  {
    id: "access_licensing",
    label: "Access & Licensing",
    description: "License is appropriate and access level matches data sensitivity.",
    weight: 10,
    color: "#4C7A3D", // System Forest
  },
  {
    id: "novelty_relevance",
    label: "Novelty & Relevance",
    description: "Dataset contributes new knowledge and fits ORDP research scope.",
    weight: 5,
    color: "#2D3766", // Navy Slate (60% weight)
  },
];

const STORAGE_KEY = "ordp_review_weights";

// ─── API helpers ──────────────────────────────────────────────────────────────
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
            className="w-16 text-center text-sm font-bold border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold disabled:opacity-60 bg-slate-50"
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

  // System & Draft Expiration
  const [draftDays, setDraftDays] = useState(30);
  const [draftExpiration, setDraftExpiration] = useState(null);
  const [expiringDrafts, setExpiringDrafts] = useState(false);
  const [notifyOnArchive, setNotifyOnArchive] = useState(true);
  const [notifyOnDeletion, setNotifyOnDeletion] = useState(true);
  const [systemSaving, setSystemSaving] = useState(false);

  // Inactive Users & Succession (Migrated from User Management)
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [loadingInactive, setLoadingInactive] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [successionPreviousId, setSuccessionPreviousId] = useState("");
  const [successionEmail, setSuccessionEmail] = useState("");
  const [successionFullName, setSuccessionFullName] = useState("");
  const [successionLoading, setSuccessionLoading] = useState(false);

  useEffect(() => {
    fetchSavedWeights().then((saved) => {
      if (saved && typeof saved === "object") {
        setWeights((prev) => ({ ...prev, ...saved }));
      }
      setWeightsLoading(false);
    });
  }, []);

  const loadDraftExpiration = useCallback(async () => {
    try {
      const data = await datasetsApi.getDraftExpirationPreview?.();
      if (data) setDraftExpiration(data);
    } catch (err) {
      console.warn("Could not load draft expiration preview:", err);
    }
  }, []);

  const loadInactiveUsers = useCallback(async () => {
    setLoadingInactive(true);
    try {
      const data = await datasetsApi.getInactiveUsers();
      const list = Array.isArray(data) ? data : data?.users || data?.results || [];
      setInactiveUsers(list);
    } catch (err) {
      console.warn("Could not load inactive users:", err);
    } finally {
      setLoadingInactive(false);
    }
  }, []);

  const loadAdminUsers = useCallback(async () => {
    try {
      const data = await datasetsApi.getAdminUsers();
      const list = Array.isArray(data) ? data : data?.results || [];
      const admins = list.filter((u) => {
        const roles = Array.isArray(u.roles) ? u.roles : [u.role || u.primary_role];
        return roles.some((r) => String(r).toLowerCase().includes("admin"));
      });
      setAdminUsers(admins);
    } catch (err) {
      console.warn("Could not load admin users:", err);
    }
  }, []);

  useEffect(() => {
    loadDraftExpiration();
    loadInactiveUsers();
    loadAdminUsers();
  }, [loadDraftExpiration, loadInactiveUsers, loadAdminUsers]);

  async function handlePermanentInactiveDelete(user) {
    const id = user.id || user.user_id;
    if (!id || !window.confirm(`Permanently delete inactive account for ${user.email}?`)) return;
    setLoadingInactive(true);
    try {
      await datasetsApi.permanentlyDeleteInactiveUser(id);
      setInactiveUsers((prev) => prev.filter((u) => (u.id || u.user_id) !== id));
      addToast("Inactive user permanently deleted.", "success");
    } catch (err) {
      addToast(err?.response?.data?.detail || "Failed to permanently delete inactive user.", "error");
    } finally {
      setLoadingInactive(false);
    }
  }

  async function handleAdminSuccession(e) {
    e.preventDefault();
    if (!successionPreviousId || !successionEmail.trim()) {
      addToast("Please select a previous admin and provide a new admin email.", "error");
      return;
    }
    if (!window.confirm(`Confirm admin succession? This will grant full admin privileges to ${successionEmail} and deactivate the previous admin account.`)) return;
    setSuccessionLoading(true);
    try {
      await datasetsApi.runAdminSuccession({
        previous_admin_id: successionPreviousId,
        email: successionEmail.trim(),
        full_name: successionFullName.trim(),
        deactivate_previous: true,
      });
      addToast("Admin succession completed successfully.", "success");
      setSuccessionPreviousId("");
      setSuccessionEmail("");
      setSuccessionFullName("");
      await loadAdminUsers();
      await loadInactiveUsers();
    } catch (err) {
      addToast(err?.response?.data?.detail || "Admin succession failed.", "error");
    } finally {
      setSuccessionLoading(false);
    }
  }

  async function handleRunDraftExpiration() {
    if (!window.confirm(`Delete inactive drafts older than ${draftDays} days now?`)) return;
    setExpiringDrafts(true);
    try {
      const result = await datasetsApi.runDraftExpiration({ days: draftDays });
      addToast(`${result?.deleted_count || 0} expired draft(s) deleted.`, "success");
      await loadDraftExpiration();
    } catch (err) {
      addToast(err?.response?.data?.detail || "Failed to delete expired drafts.", "error");
    } finally {
      setExpiringDrafts(false);
    }
  }

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

  async function handleSaveSystem() {
    setSystemSaving(true);
    try {
      await client
        .post("/admin-panel/settings/system/", {
          draft_expiration_days: draftDays,
          notify_on_archive: notifyOnArchive,
          notify_on_deletion: notifyOnDeletion,
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
          <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center shadow-md">
            <Settings2 className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy">Admin Settings</h1>
            <p className="text-sm text-slate-500">
              Configure review criteria weights, draft expiration, and system preferences.
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
                className="flex items-center gap-1.5 text-xs font-semibold bg-navy text-white hover:bg-navy-light px-4 py-1.5 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {savingWeights ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-gold" />
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

          <div className="mt-4 flex items-start gap-3 bg-gold-light/40 border border-gold/30 rounded-xl p-4 text-xs text-navy">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-gold-dark" />
            <p>
              The <strong>final review score</strong> is computed as a weighted sum:{" "}
              <code className="bg-gold-light text-navy rounded px-1.5 py-0.5 font-mono font-bold">
                Score = Σ (criteria_score × weight / 100)
              </code>
              . These weights are applied automatically when reviewers submit evaluations.
              A total of exactly <strong>100%</strong> is required before saving.
            </p>
          </div>
        </CollapsibleSection>

        {/* ── SECTION 2: SYSTEM PREFERENCES & DRAFT EXPIRATION ── */}
        <CollapsibleSection title="System Preferences & Draft Expiration" icon={Settings2} defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Draft Expiration Card (Moved from User Management) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-700">Draft Expiration</p>
                  </div>
                  {draftExpiration && (
                    <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 font-semibold px-2.5 py-0.5 rounded-full">
                      {draftExpiration?.expired_count ?? 0} expired
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Unpublished drafts older than the configured window are automatically flagged for purge.
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-xs text-slate-600 font-medium">Cleanup threshold:</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={draftDays}
                    onChange={(e) => setDraftDays(Number(e.target.value))}
                    className="w-20 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-center focus:outline-none focus:ring-2 focus:ring-navy/30"
                  />
                  <span className="text-xs text-slate-500">days</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {draftExpiration?.expired_count ?? 0} draft(s), {draftExpiration?.days ?? draftDays} day window
                </span>
                <button
                  type="button"
                  onClick={handleRunDraftExpiration}
                  disabled={expiringDrafts || !draftExpiration?.expired_count}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold hover:bg-navy-light disabled:opacity-50 transition cursor-pointer shadow-xs"
                >
                  {expiringDrafts ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  )}
                  Delete Expired Drafts
                </button>
              </div>
            </div>

            {/* Auto-Notifications */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-700">Auto-Notifications</p>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Configure automated system alert broadcasts across operational queues.
              </p>
              <div className="space-y-3">
                {[
                  { label: "Archive decisions", value: notifyOnArchive, onChange: setNotifyOnArchive },
                  { label: "Deletion requests", value: notifyOnDeletion, onChange: setNotifyOnDeletion },
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
                      className={`relative inline-flex h-5 w-9 items-center rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-gold/30 ${
                        value ? "bg-emerald-600 border-emerald-600" : "bg-slate-200 border-slate-200"
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

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleSaveSystem}
              disabled={systemSaving}
              className="flex items-center gap-1.5 text-xs font-semibold bg-navy text-white hover:bg-navy-light px-5 py-2 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {systemSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-gold" />}
              Save System Settings
            </button>
          </div>
        </CollapsibleSection>

        {/* ── SECTION 3: ADMINISTRATIVE OPERATIONS & SUCCESSION ── */}
        <CollapsibleSection title="Administrative Operations & Account Succession" icon={Shield} defaultOpen>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inactive Users */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <UserX className="w-4 h-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-700">Inactive User Accounts</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadInactiveUsers}
                    disabled={loadingInactive}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-dark disabled:opacity-50 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingInactive ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Accounts marked inactive are kept safe by default. Permanently purge only when compliance or storage policy mandates.
                </p>

                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-navy">{inactiveUsers.length}</span>
                  <span className="text-xs text-slate-400">inactive user(s) recorded</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {inactiveUsers.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-400">No inactive accounts found.</p>
                    </div>
                  ) : (
                    inactiveUsers.map((u) => {
                      const uid = u.id || u.user_id;
                      return (
                        <div
                          key={uid}
                          className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-navy">{u.full_name || u.name || u.email}</p>
                            <p className="truncate text-[11px] text-slate-500">{u.email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePermanentInactiveDelete(u)}
                            disabled={loadingInactive}
                            className="shrink-0 rounded-md bg-red-600 hover:bg-red-700 px-2.5 py-1 text-[11px] font-semibold text-white transition disabled:opacity-50 shadow-2xs cursor-pointer"
                            title="Permanently remove account from database"
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Admin Succession */}
            <form onSubmit={handleAdminSuccession} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">Admin Succession</p>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Designate a successor administrator. This securely transfers administrative credentials, grants the Admin role, and deactivates the retiring administrator account.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Retiring / Current Admin
                    </label>
                    <select
                      required
                      value={successionPreviousId}
                      onChange={(e) => setSuccessionPreviousId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy/30"
                    >
                      <option value="">Select previous administrator…</option>
                      {adminUsers.map((u) => (
                        <option key={u.id || u.user_id} value={u.id || u.user_id}>
                          {u.full_name || u.name || u.email} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Successor Full Name
                    </label>
                    <input
                      required
                      type="text"
                      value={successionFullName}
                      onChange={(e) => setSuccessionFullName(e.target.value)}
                      placeholder="e.g. Dr. Abebe Bikila"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Successor Email Address
                    </label>
                    <input
                      required
                      type="email"
                      value={successionEmail}
                      onChange={(e) => setSuccessionEmail(e.target.value)}
                      placeholder="e.g. abebe.b@aastu.edu.et"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/30"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={successionLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gold hover:bg-gold-dark px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {successionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  Complete Admin Succession
                </button>
              </div>
            </form>
          </div>
        </CollapsibleSection>
      </div>
    </DashboardShell>
  );
}
