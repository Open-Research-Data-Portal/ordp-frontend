import React, { useEffect, useMemo, useState, Fragment } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  Database,
  ClipboardList,
  Trash2,
  Activity,
  ShieldCheck,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  UserCheck,
  X,
  Star,
  Shield,
  UserPlus,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import StatCard from "../../../components/dashboard/StatCard";
import { SectionHeader, StatusBadge, ProfileSavedNotice, EmptyState } from "../../../components/dashboard/dashboardUi";
import * as datasetsApi from "../hooks/datasetsApi";
import { fetchAllDatasets } from "../../../api/datasetsHub";
import { useToast } from "../../../context/ToastContext.jsx";
import { useAuth } from "../../../context/useAuth";
import { getEffectiveRoles } from "../../../utils/userRoles";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

const ALL_SYSTEM_ROLES = ["public", "reviewer", "admin"];

const ROLE_OPTIONS = [
  { value: "public", label: "User (Public / Researcher)" },
  { value: "reviewer", label: "Reviewer (Checker)" },
  { value: "admin", label: "Administrator" },
];

function formatRoleLabel(role) {
  const r = String(role || "").toLowerCase();
  if (r === "admin" || r === "administrator") return "Admin";
  if (r === "reviewer" || r === "checker") return "Reviewer";
  if (r === "researcher") return "Researcher";
  return "User";
}

function getUserRoles(user) {
  if (!user) return ["public"];
  let roles = [];
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    roles = user.roles.map((r) => String(r).toLowerCase());
  } else if (user.role) {
    roles = [String(user.role).toLowerCase()];
  } else {
    roles = ["public"];
  }
  if (!roles.includes("public")) {
    roles.push("public");
  }
  return Array.from(new Set(roles));
}

function getUserPrimaryRole(user) {
  if (!user) return "public";
  if (user.primary_role) return String(user.primary_role).toLowerCase();
  if (user.role) return String(user.role).toLowerCase();
  const roles = getUserRoles(user);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("reviewer")) return "reviewer";
  return roles[0] || "public";
}

function displayRoleOf(user) {
  if (!user) return "user";
  if (user.is_superuser || user.is_staff || user.is_admin) return "admin";
  const roles = getEffectiveRoles(user);
  if (roles.includes("admin") || roles.includes("superadmin") || roles.includes("superuser") || roles.includes("staff")) {
    return "admin";
  }
  if (roles.includes("reviewer") || roles.includes("checker")) {
    return "reviewer";
  }
  if (roles.includes("researcher")) {
    return "researcher";
  }
  return "user";
}

function getUserStatus(user) {
  if (!user) return "active";
  if (user.is_active === false) return "inactive";
  const s = String(user.status || "").toLowerCase().trim();
  if (s === "inactive" || s === "deactivated" || s === "disabled" || s === "suspended") {
    return "inactive";
  }
  return "active";
}

const roleBadge = {
  public: "bg-gray-100 text-gray-700 border-gray-200",
  reviewer: "bg-violet-50 text-violet-700 border-violet-200",
  admin: "bg-gold-light text-gold border-gold/30",
  researcher: "bg-blue-50 text-blue-700 border-blue-200",
  user: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function AdminDashboardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const tab = searchParams.get("tab") || "overview";

  const [cards, setCards] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [users, setUsers] = useState([]);
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [draftExpiration, setDraftExpiration] = useState(null);
  const [queue, setQueue] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [userSearch, setUserSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserRole, setNewUserRole] = useState("public");
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [opsLoading, setOpsLoading] = useState(false);
  const [successionPreviousId, setSuccessionPreviousId] = useState("");
  const [successionEmail, setSuccessionEmail] = useState("");
  const [successionFullName, setSuccessionFullName] = useState("");
  const [deactivateWarningModal, setDeactivateWarningModal] = useState(null);
  const [togglingActiveId, setTogglingActiveId] = useState(null);
  const [roleUpdatingId, setRoleUpdatingId] = useState(null);
  const [roleActionBusyId, setRoleActionBusyId] = useState(null);
  const [datasetSearch, setDatasetSearch] = useState("");
  const [datasetStatusFilter, setDatasetStatusFilter] = useState("all");
  const [expandedDatasetId, setExpandedDatasetId] = useState(null);

  const { user: authUser } = useAuth();
  const currentAdminId = authUser?.id || authUser?.user_id;
  const currentAdminEmail = authUser?.email?.toLowerCase();

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const [cardsRes, auditRes, usersRes, queueRes, reviewsRes, inactiveRes, draftRes] = await Promise.allSettled([
        datasetsApi.getAdminCards?.() ?? Promise.resolve(null),
        datasetsApi.getAdminAuditLog?.() ?? Promise.resolve([]),
        datasetsApi.getAdminUsers?.() ?? Promise.resolve([]),
        datasetsApi.getAdminQueue?.() ?? Promise.resolve([]),
        datasetsApi.getMyReviews?.() ?? Promise.resolve([]),
        datasetsApi.getInactiveUsers?.() ?? Promise.resolve({ users: [] }),
        datasetsApi.getDraftExpirationPreview?.() ?? Promise.resolve(null),
      ]);
      if (!active) return;
      if (cardsRes.status === "fulfilled") setCards(cardsRes.value);
      if (auditRes.status === "fulfilled") setAuditLog(normalizeList(auditRes.value));
      if (usersRes.status === "fulfilled") setUsers(normalizeList(usersRes.value));
      if (queueRes.status === "fulfilled") setQueue(normalizeList(queueRes.value));
      if (reviewsRes.status === "fulfilled") setReviews(normalizeList(reviewsRes.value));
      if (inactiveRes.status === "fulfilled") setInactiveUsers(normalizeList(inactiveRes.value?.users || inactiveRes.value));
      if (draftRes.status === "fulfilled") setDraftExpiration(draftRes.value);

      // The moderation queue can be empty/unavailable even when datasets
      // exist — fall back to the full directory so the datasets tab always
      // shows what's actually in the portal.
      if (active && normalizeList(queueRes.value ?? []).length === 0) {
        try {
          setQueue(await fetchAllDatasets());
        } catch {
          // keep empty queue — not critical
        }
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  const actionColors = useMemo(() => ({
    "Dataset Update": "bg-blue-50 text-blue-700",
    "Access Granted": "bg-gray-100 text-gray-700",
    Backup: "bg-indigo-50 text-indigo-700",
    "Role Change": "bg-amber-50 text-amber-700",
    Upload: "bg-emerald-50 text-emerald-700",
    "Record Deletion": "bg-red-50 text-red-700",
    "User Created": "bg-emerald-50 text-emerald-700",
    "User Deleted": "bg-red-50 text-red-700",
  }), []);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.trim().toLowerCase();
    return users.filter(
      (u) =>
        String(u.email || "").toLowerCase().includes(q) ||
        String(u.full_name || u.name || "").toLowerCase().includes(q) ||
        String(u.id || u.user_id || "").includes(q)
    );
  }, [users, userSearch]);

  const filteredDatasets = useMemo(() => {
    let list = normalizeList(queue);
    if (datasetSearch.trim()) {
      const q = datasetSearch.trim().toLowerCase();
      list = list.filter(
        (d) =>
          String(d.title || d.name || "").toLowerCase().includes(q) ||
          String(d.id || d.dataset_id || "").includes(q) ||
          String(d.owner_name || d.author || d.uploader_name || "").toLowerCase().includes(q) ||
          String(d.category || d.metadata?.category_name || "").toLowerCase().includes(q)
      );
    }
    if (datasetStatusFilter !== "all") {
      list = list.filter(
        (d) => String(d.status || "pending").toLowerCase() === datasetStatusFilter.toLowerCase()
      );
    }
    return list;
  }, [queue, datasetSearch, datasetStatusFilter]);

  const reviewStats = useMemo(() => {
    const list = normalizeList(reviews);
    const pending = list.filter((r) => String(r.status || "").toLowerCase() === "pending").length;
    const approved = list.filter((r) => String(r.status || "").toLowerCase() === "approved").length;
    const rejected = list.filter((r) => String(r.status || "").toLowerCase() === "rejected").length;
    const total = list.length || pending + approved + rejected || 1;
    return {
      total: list.length || pending + approved + rejected,
      pending,
      approved,
      rejected,
      approvedPct: Math.round((approved / total) * 100),
      rejectedPct: Math.round((rejected / total) * 100),
      pendingPct: Math.round((pending / total) * 100),
    };
  }, [reviews]);

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreateError("");
    setCreatingUser(true);
    try {
      const email = newUserEmail.trim();
      const fullName = newUserFullName.trim();
      const res = await datasetsApi.createAdminUser({
        email,
        full_name: fullName,
        role: newUserRole,
      });

      if (res?.status === "role_granted") {
        // Backend added role to existing account
        setUsers((prev) => {
          const exists = prev.some((u) => u.email?.toLowerCase() === email.toLowerCase());
          if (exists) {
            return prev.map((u) => {
              if (u.email?.toLowerCase() === email.toLowerCase()) {
                const currentList = getUserRoles(u);
                const updatedRoles = res.roles || Array.from(new Set([...currentList, newUserRole]));
                return {
                  ...u,
                  roles: updatedRoles,
                  primary_role: res.primary_role || u.primary_role || newUserRole,
                  role: res.primary_role || u.role || newUserRole,
                };
              }
              return u;
            });
          }
          datasetsApi.getAdminUsers?.().then((fresh) => setUsers(normalizeList(fresh)));
          return prev;
        });

        const detailMsg = res.detail || `Account for "${email}" already exists; granted "${formatRoleLabel(newUserRole)}" role to it.`;
        addToast(detailMsg, "info");
        setSuccessNotice(detailMsg);
      } else {
        // Newly created account
        const name = fullName || email;
        const newObj = {
          id: res?.id || res?.user_id || `new-${Date.now()}`,
          email,
          full_name: fullName,
          role: newUserRole,
          roles: res?.roles || [newUserRole, "public"],
          primary_role: res?.primary_role || newUserRole,
          status: "Active",
          initials: name.slice(0, 2).toUpperCase(),
          ...res,
        };
        setUsers((s) => [newObj, ...s]);
        addToast(`User "${name}" created successfully. Activation email sent.`, "success");
        setSuccessNotice(`User "${name}" (${email}) was created successfully. An activation email has been dispatched.`);
      }

      setNewUserEmail("");
      setNewUserFullName("");
      setNewUserRole("public");
      setShowCreateForm(false);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.email?.[0] ||
        err?.response?.data?.full_name?.[0] ||
        err?.response?.data?.role?.[0] ||
        err?.message ||
        "Failed to create user or assign role.";
      setCreateError(detail);
    } finally {
      setCreatingUser(false);
    }
  }

  function hasUploadedDatasets(targetUser) {
    if (!targetUser) return false;
    const uid = String(targetUser.id || targetUser.user_id || "");
    const uemail = String(targetUser.email || "").toLowerCase();
    if (
      targetUser.dataset_count > 0 ||
      targetUser.uploaded_datasets_count > 0 ||
      (Array.isArray(targetUser.datasets) && targetUser.datasets.length > 0)
    ) {
      return true;
    }
    return queue.some((d) => {
      const dOwnerId = String(d.owner_id || d.owner?.id || d.user || d.created_by || "");
      const dOwnerEmail = String(d.owner_email || d.owner?.email || d.owner || "").toLowerCase();
      return (uid && dOwnerId === uid) || (uemail && dOwnerEmail === uemail);
    });
  }

  async function handleGrantUserRole(targetUser, roleToGrant) {
    const id = targetUser.id || targetUser.user_id;
    if (!id || roleActionBusyId) return;
    setRoleActionBusyId(`${id}-${roleToGrant}`);
    try {
      const res = await datasetsApi.grantAdminUserRole(id, roleToGrant);
      const updatedRoles = res?.roles || Array.from(new Set([...getUserRoles(targetUser), roleToGrant]));
      const updatedPrimary = res?.primary_role || targetUser.primary_role || getUserPrimaryRole(targetUser);

      setUsers((prev) =>
        prev.map((u) => {
          if ((u.id || u.user_id) === id) {
            return {
              ...u,
              ...res,
              roles: updatedRoles,
              primary_role: updatedPrimary,
              role: updatedPrimary,
            };
          }
          return u;
        })
      );
      addToast(
        `Granted "${formatRoleLabel(roleToGrant)}" role to ${targetUser.full_name || targetUser.email}.`,
        "success"
      );
    } catch (err) {
      addToast(err?.response?.data?.detail || `Failed to grant role "${formatRoleLabel(roleToGrant)}".`, "error");
    } finally {
      setRoleActionBusyId(null);
    }
  }

  async function handleRevokeUserRole(targetUser, roleToRevoke) {
    const id = targetUser.id || targetUser.user_id;
    if (!id || roleActionBusyId) return;

    if (roleToRevoke === "public") {
      addToast("The 'public' role cannot be revoked.", "warning");
      return;
    }

    const isSelf = String(id) === String(currentAdminId) || targetUser.email?.toLowerCase() === currentAdminEmail;
    if (roleToRevoke === "admin" && isSelf) {
      addToast("You cannot revoke your own administrator role.", "warning");
      return;
    }

    if (!window.confirm(`Revoke the "${formatRoleLabel(roleToRevoke)}" role from ${targetUser.full_name || targetUser.email}?`)) {
      return;
    }

    setRoleActionBusyId(`${id}-${roleToRevoke}`);
    try {
      const res = await datasetsApi.revokeAdminUserRole(id, roleToRevoke);
      const updatedRoles = res?.roles || getUserRoles(targetUser).filter((r) => r !== roleToRevoke);
      const updatedPrimary = res?.primary_role || updatedRoles[0] || "public";

      setUsers((prev) =>
        prev.map((u) => {
          if ((u.id || u.user_id) === id) {
            return {
              ...u,
              ...res,
              roles: updatedRoles,
              primary_role: updatedPrimary,
              role: updatedPrimary,
            };
          }
          return u;
        })
      );

      const released = res?.released_datasets;
      if (Array.isArray(released) && released.length > 0) {
        addToast(
          `Revoked Reviewer role. Released assignment on ${released.length} pending dataset(s).`,
          "info"
        );
      } else {
        addToast(`Revoked "${formatRoleLabel(roleToRevoke)}" role from ${targetUser.full_name || targetUser.email}.`, "success");
      }
    } catch (err) {
      addToast(err?.response?.data?.detail || `Failed to revoke role "${formatRoleLabel(roleToRevoke)}".`, "error");
    } finally {
      setRoleActionBusyId(null);
    }
  }

  async function handleSetPrimaryRole(targetUser, primaryRole) {
    const id = targetUser.id || targetUser.user_id;
    if (!id || roleActionBusyId) return;
    setRoleActionBusyId(`${id}-primary`);
    try {
      const res = await datasetsApi.setAdminUserPrimaryRole(id, primaryRole);
      setUsers((prev) =>
        prev.map((u) => {
          if ((u.id || u.user_id) === id) {
            return {
              ...u,
              ...res,
              primary_role: primaryRole,
              role: primaryRole,
            };
          }
          return u;
        })
      );
      addToast(`Set primary role for ${targetUser.full_name || targetUser.email} to "${formatRoleLabel(primaryRole)}".`, "success");
    } catch (err) {
      addToast(err?.response?.data?.detail || "Failed to set primary role.", "error");
    } finally {
      setRoleActionBusyId(null);
    }
  }

  async function handleUpdateUserRole(targetUser, newRole) {
    const id = targetUser.id || targetUser.user_id;
    if (!id || roleUpdatingId) return;
    setRoleUpdatingId(id);
    try {
      await datasetsApi.updateAdminUserRole(id, newRole);
      setUsers((prev) =>
        prev.map((u) => {
          if ((u.id || u.user_id) === id) {
            return { ...u, role: newRole, roles: [newRole], primary_role: newRole };
          }
          return u;
        })
      );
      addToast(
        `Updated role for ${targetUser.full_name || targetUser.email} to ${formatRoleLabel(newRole)}.`,
        "success"
      );
    } catch (err) {
      addToast(err?.response?.data?.detail || "Failed to update user role.", "error");
    } finally {
      setRoleUpdatingId(null);
    }
  }

  function handleToggleUserActiveClick(targetUser) {
    const isCurrentlyActive = getUserStatus(targetUser) === "active";
    if (isCurrentlyActive) {
      // Trying to DEACTIVATE -> check datasets
      const userHasData = hasUploadedDatasets(targetUser);
      setDeactivateWarningModal({
        user: targetUser,
        hasDatasets: userHasData,
        step: 1,
      });
    } else {
      // Trying to ACTIVATE -> execute directly
      executeToggleActive(targetUser, true);
    }
  }

  async function executeToggleActive(targetUser, newActiveState) {
    const id = targetUser.id || targetUser.user_id;
    if (!id) return;
    setTogglingActiveId(id);
    try {
      await datasetsApi.toggleAdminUserActive(id, newActiveState);
      setUsers((prev) =>
        prev.map((u) => {
          if ((u.id || u.user_id) === id) {
            return {
              ...u,
              is_active: newActiveState,
              status: newActiveState ? "active" : "inactive",
            };
          }
          return u;
        })
      );
      addToast(
        `User ${targetUser.full_name || targetUser.email} is now ${newActiveState ? "Active" : "Inactive"}.`,
        "success"
      );
      setDeactivateWarningModal(null);
    } catch (err) {
      addToast(err?.response?.data?.detail || "Failed to update account status.", "error");
    } finally {
      setTogglingActiveId(null);
    }
  }

  async function refreshAdminOps() {
    setOpsLoading(true);
    try {
      const [inactive, drafts] = await Promise.all([
        datasetsApi.getInactiveUsers(),
        datasetsApi.getDraftExpirationPreview(),
      ]);
      setInactiveUsers(normalizeList(inactive?.users || inactive));
      setDraftExpiration(drafts);
    } finally {
      setOpsLoading(false);
    }
  }

  async function handlePermanentInactiveDelete(user) {
    const id = user.id || user.user_id;
    if (!id || !window.confirm(`Permanently delete inactive user ${user.email}?`)) return;
    setOpsLoading(true);
    try {
      await datasetsApi.permanentlyDeleteInactiveUser(id);
      setUsers((list) => list.filter((u) => (u.id || u.user_id) !== id));
      setInactiveUsers((list) => list.filter((u) => (u.id || u.user_id) !== id));
      addToast("Inactive user permanently deleted.", "success");
    } catch (err) {
      addToast(err?.response?.data?.detail || "Failed to permanently delete inactive user.", "error");
    } finally {
      setOpsLoading(false);
    }
  }

  async function handleRunDraftExpiration() {
    if (!window.confirm("Delete expired inactive drafts now?")) return;
    setOpsLoading(true);
    try {
      const result = await datasetsApi.runDraftExpiration({});
      addToast(`${result.deleted_count || 0} expired draft(s) deleted.`, "success");
      await refreshAdminOps();
    } catch (err) {
      addToast(err?.response?.data?.detail || "Failed to expire drafts.", "error");
    } finally {
      setOpsLoading(false);
    }
  }

  async function handleAdminSuccession(e) {
    e.preventDefault();
    setOpsLoading(true);
    try {
      await datasetsApi.runAdminSuccession({
        previous_admin_id: successionPreviousId,
        email: successionEmail.trim(),
        full_name: successionFullName.trim(),
        deactivate_previous: true,
      });
      addToast("Admin succession completed.", "success");
      setSuccessionPreviousId("");
      setSuccessionEmail("");
      setSuccessionFullName("");
      const freshUsers = await datasetsApi.getAdminUsers();
      setUsers(normalizeList(freshUsers));
      await refreshAdminOps();
    } catch (err) {
      addToast(err?.response?.data?.detail || "Admin succession failed.", "error");
    } finally {
      setOpsLoading(false);
    }
  }

  return (
    <DashboardShell title="ORDP Admin Console" subtitle="System status and key metrics">
      <ProfileSavedNotice />
      <div className="flex justify-between items-start mb-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy">
            {tab === "users" ? "User Management" : tab === "datasets" ? "Dataset Management" : tab === "audit" ? "System Audit Log" : "Overview"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {tab === "users"
              ? "Manage institutional access and role delegations."
              : "System status and key metrics for the Open Research Data Portal."}
          </p>
        </div>
        <div className="text-right text-xs text-gray-400">
          <p className="uppercase tracking-wide">Last synced</p>
          <p className="font-medium text-navy">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {tab === "users" ? (
        <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, email, or ID"
                className="rounded-lg border border-slate-200 text-sm py-2 pl-9 pr-3 bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm((s) => !s);
                setSuccessNotice("");
              }}
              className="bg-gold hover:bg-gold-dark text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
            >
              {showCreateForm ? "Cancel" : "+ Create User"}
            </button>
          </div>

          {successNotice && (
            <div className="mx-5 mt-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">✓</span>
                <span>{successNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessNotice("")}
                className="text-emerald-600 hover:text-emerald-900 text-sm font-bold ml-3"
              >
                ✕
              </button>
            </div>
          )}

          {showCreateForm && (
            <form onSubmit={handleCreateUser} className="mx-5 mt-4 mb-2 rounded-xl border border-slate-200 bg-[#F8F7F4] p-5">
              <p className="text-sm font-semibold text-navy mb-3">New User</p>
              {createError && (
                <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {createError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1" htmlFor="newEmail">
                    Email
                  </label>
                  <input
                    id="newEmail"
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 text-sm py-2 px-3"
                    placeholder="name@aastu.edu.et"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1" htmlFor="newFullName">
                    Full Name
                  </label>
                  <input
                    id="newFullName"
                    type="text"
                    required
                    value={newUserFullName}
                    onChange={(e) => setNewUserFullName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 text-sm py-2 px-3"
                    placeholder="Dr. Jane Doe"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1" htmlFor="newRole">
                    Role
                  </label>
                  <select
                    id="newRole"
                    required
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 text-sm py-2 px-3 bg-[#F7F6F2]"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Tip: If this email already has an account, the selected role will be added to it. If it is a new email, an account will be created and an activation link sent.
              </p>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs font-semibold text-gray-600 hover:text-navy px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="bg-navy hover:bg-navy-light text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-50 transition-colors"
                >
                  {creatingUser ? "Processing…" : "Assign / Create User"}
                </button>
              </div>
            </form>
          )}

          <div className="mx-5 my-4 grid gap-4 lg:grid-cols-3">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-navy">Inactive Users</p>
                  <p className="mt-1 text-xs text-gray-500">Accounts are kept inactive by default. Permanently delete only when appropriate.</p>
                </div>
                <button type="button" onClick={refreshAdminOps} disabled={opsLoading} className="text-xs font-semibold text-gold disabled:opacity-50">
                  Refresh
                </button>
              </div>
              <p className="mt-4 text-2xl font-bold text-navy">{inactiveUsers.length}</p>
              <div className="mt-3 space-y-2">
                {inactiveUsers.slice(0, 3).map((u) => (
                  <div key={u.id || u.user_id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-navy">{u.full_name || u.email}</p>
                      <p className="truncate text-[11px] text-gray-500">{u.email}</p>
                    </div>
                    {u.eligible_for_delete && (
                      <button
                        type="button"
                        onClick={() => handlePermanentInactiveDelete(u)}
                        disabled={opsLoading}
                        className="shrink-0 rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <form onSubmit={handleAdminSuccession} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-navy">Admin Succession</p>
              <p className="mt-1 text-xs text-gray-500">Create a successor admin, revoke the previous admin role, and block old credentials.</p>
              <div className="mt-3 grid gap-2">
                <select
                  required
                  value={successionPreviousId}
                  onChange={(e) => setSuccessionPreviousId(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  <option value="">Previous admin</option>
                  {users.filter((u) => Array.isArray(u.roles) && u.roles.includes("admin")).map((u) => (
                    <option key={u.id || u.user_id} value={u.id || u.user_id}>
                      {u.full_name || u.email}
                    </option>
                  ))}
                </select>
                <input
                  required
                  type="email"
                  value={successionEmail}
                  onChange={(e) => setSuccessionEmail(e.target.value)}
                  placeholder="new.admin@aastu.edu.et"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                />
                <input
                  required
                  value={successionFullName}
                  onChange={(e) => setSuccessionFullName(e.target.value)}
                  placeholder="New admin full name"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                />
              </div>
              <button type="submit" disabled={opsLoading} className="mt-3 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                Complete succession
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">User</th>
                  <th className="px-5 py-3 text-left font-semibold">Role</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Account Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const uid = u.id || u.user_id;
                    const isTogglingActive = togglingActiveId === uid;
                    const userStatus = getUserStatus(u);
                    const isActive = userStatus === "active";
                    const userRoles = getUserRoles(u);
                    const primaryRole = getUserPrimaryRole(u);
                    const availableToGrant = ALL_SYSTEM_ROLES.filter((r) => !userRoles.includes(r));

                    return (
                      <tr key={uid} className="border-t border-gray-100 hover:bg-bg/50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
                              {(u.full_name || u.name || u.email || "U").slice(0, 2).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-navy truncate">{u.full_name || u.name || "—"}</p>
                              <p className="text-xs text-gray-500 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-2">
                            {/* Assigned roles badges */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {userRoles.map((r) => {
                                const isPrimary = r === primaryRole;
                                const isSelfAdmin =
                                  r === "admin" &&
                                  (String(uid) === String(currentAdminId) ||
                                    u.email?.toLowerCase() === currentAdminEmail);
                                const canRevoke = r !== "public" && !isSelfAdmin;
                                const isRevoking = roleActionBusyId === `${uid}-${r}`;

                                return (
                                  <span
                                    key={r}
                                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                                      r === "admin"
                                        ? "bg-amber-50 text-amber-900 border-amber-300"
                                        : r === "reviewer"
                                        ? "bg-indigo-50 text-indigo-900 border-indigo-300"
                                        : "bg-slate-100 text-slate-800 border-slate-300"
                                    }`}
                                  >
                                    {isPrimary && (
                                      <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                                    )}
                                    <span>{formatRoleLabel(r)}</span>
                                    {isPrimary && (
                                      <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-200/60 text-amber-800 px-1 py-0.2 rounded ml-0.5">
                                        Primary
                                      </span>
                                    )}

                                    {/* Set as Primary button if multiple roles exist and this isn't primary */}
                                    {!isPrimary && userRoles.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetPrimaryRole(u, r)}
                                        disabled={Boolean(roleActionBusyId)}
                                        className="text-[10px] text-slate-400 hover:text-amber-700 font-normal hover:underline ml-1 cursor-pointer disabled:opacity-40"
                                        title={`Make "${formatRoleLabel(r)}" the primary role`}
                                      >
                                        {roleActionBusyId === `${uid}-primary` ? "Setting…" : "Set primary"}
                                      </button>
                                    )}

                                    {/* Revoke button */}
                                    {canRevoke ? (
                                      <button
                                        type="button"
                                        onClick={() => handleRevokeUserRole(u, r)}
                                        disabled={Boolean(roleActionBusyId)}
                                        className="text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-full p-0.5 transition ml-1 cursor-pointer disabled:opacity-40"
                                        title={`Revoke "${formatRoleLabel(r)}" role`}
                                        aria-label={`Revoke ${formatRoleLabel(r)} role`}
                                      >
                                        {isRevoking ? (
                                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                        ) : (
                                          <X className="w-2.5 h-2.5" />
                                        )}
                                      </button>
                                    ) : isSelfAdmin ? (
                                      <span
                                        className="text-[10px] text-amber-600/70 ml-1"
                                        title="Cannot revoke your own administrator role"
                                      >
                                        🔒
                                      </span>
                                    ) : null}
                                  </span>
                                );
                              })}
                            </div>

                            {/* Quick Grant for available roles */}
                            {availableToGrant.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="text-[10px] text-gray-400 font-medium">Grant:</span>
                                {availableToGrant.map((missingRole) => {
                                  const isGranting = roleActionBusyId === `${uid}-${missingRole}`;
                                  return (
                                    <button
                                      key={missingRole}
                                      type="button"
                                      onClick={() => handleGrantUserRole(u, missingRole)}
                                      disabled={Boolean(roleActionBusyId)}
                                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border transition cursor-pointer disabled:opacity-40 ${
                                        missingRole === "admin"
                                          ? "text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300"
                                          : missingRole === "reviewer"
                                          ? "text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border-indigo-300"
                                          : "text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-300"
                                      }`}
                                      title={`Grant ${formatRoleLabel(missingRole)} role`}
                                    >
                                      {isGranting ? (
                                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                      ) : (
                                        "+"
                                      )}
                                      {formatRoleLabel(missingRole)}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={userStatus} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleToggleUserActiveClick(u)}
                              disabled={isTogglingActive}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isActive ? "bg-emerald-600" : "bg-slate-300"
                              }`}
                              role="switch"
                              aria-checked={isActive}
                              title={isActive ? "Click to deactivate" : "Click to activate"}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  isActive ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                            <span
                              className={`text-xs font-semibold w-14 text-left ${
                                isActive ? "text-emerald-700" : "text-slate-400"
                              }`}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : tab === "datasets" ? (
        <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-5 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-navy">Datasets Management</h2>
              <p className="text-xs text-gray-500 mt-0.5">Search, filter, and inspect institutional repository records.</p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={datasetSearch}
                  onChange={(e) => setDatasetSearch(e.target.value)}
                  placeholder="Search title, author, category…"
                  className="w-full bg-gray-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition"
                />
                {datasetSearch && (
                  <button
                    type="button"
                    onClick={() => setDatasetSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
                {[
                  { id: "all", label: "All" },
                  { id: "approved", label: "Approved" },
                  { id: "pending", label: "Pending" },
                  { id: "under_review", label: "Under Review" },
                  { id: "rejected", label: "Rejected" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDatasetStatusFilter(s.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      datasetStatusFilter === s.id
                        ? "bg-navy text-white shadow-xs"
                        : "text-slate-600 hover:text-navy hover:bg-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Dataset</th>
                  <th className="px-5 py-3 text-left font-semibold">Category</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDatasets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-500">
                      {datasetSearch || datasetStatusFilter !== "all"
                        ? "No datasets matching your search criteria."
                        : "No datasets available."}
                    </td>
                  </tr>
                ) : (
                  filteredDatasets.map((dataset) => {
                    const id = dataset.id || dataset.dataset_id;
                    const isExpanded = expandedDatasetId === id;
                    const catName =
                      dataset.metadata?.category_name ||
                      dataset.category_name ||
                      dataset.category ||
                      "General Research";
                    const authorName =
                      dataset.owner_name ||
                      dataset.author ||
                      dataset.uploader_name ||
                      dataset.owner?.full_name ||
                      "AASTU Researcher";
                    const createdDate = dataset.created_at || dataset.date || dataset.createdAt;
                    const desc =
                      dataset.description ||
                      dataset.abstract ||
                      dataset.metadata?.description ||
                      "No extended description provided for this submission.";

                    return (
                      <React.Fragment key={id}>
                        <tr className={`transition-colors ${isExpanded ? "bg-amber-50/40" : "hover:bg-slate-50/60"}`}>
                          <td className="px-5 py-3.5 font-medium text-navy">
                            <p className="font-semibold text-navy leading-snug line-clamp-1">
                              {dataset.title || dataset.name || `Dataset #${id}`}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 font-mono">ID: {id}</p>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-600">
                            <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                              {catName}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={dataset.status || "pending"} />
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setExpandedDatasetId(isExpanded ? null : id)}
                              className={`inline-flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                                isExpanded
                                  ? "bg-gold text-white border-gold shadow-xs"
                                  : "border-gold/60 text-navy hover:bg-gold-light/40 hover:border-gold"
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              See
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Dropdown details box */}
                        {isExpanded && (
                          <tr className="bg-gradient-to-b from-[#FDFBF7] to-white border-t border-b border-gold/30">
                            <td colSpan={4} className="px-6 py-4 animate-fade-in">
                              <div className="bg-white rounded-xl border border-gold/30 p-4 shadow-xs space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-3 border-b border-slate-100">
                                  <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">Researcher / Author</p>
                                    <p className="text-xs font-semibold text-navy mt-0.5 truncate">{authorName}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">Category</p>
                                    <p className="text-xs font-semibold text-navy mt-0.5 truncate">{catName}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">Uploaded Date</p>
                                    <p className="text-xs font-semibold text-navy mt-0.5 truncate">
                                      {createdDate ? new Date(createdDate).toLocaleDateString() : "Recent"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">Engagement</p>
                                    <p className="text-xs font-semibold text-navy mt-0.5">
                                      {(dataset.view_count || dataset.views || 0).toLocaleString()} views · {(dataset.download_count || dataset.downloads || 0).toLocaleString()} downloads
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Summary Details</p>
                                  <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                                    {desc}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    Format: {dataset.format || dataset.data_format || "Tabular/Archive"}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/datasets/${id}`)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy hover:bg-navy-light text-white text-xs font-semibold shadow-xs hover:shadow transition cursor-pointer"
                                  >
                                    More
                                    <ArrowRight className="w-3.5 h-3.5 text-gold" />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              label="TOTAL USERS"
              value={loading ? "…" : ((cards?.total_users ?? users.length) || 0).toLocaleString()}
              icon={Users}
              trend="+12% this month"
              delay={50}
            />
            <StatCard
              label="ACTIVE DATASETS"
              value={loading ? "…" : (cards?.active_datasets ?? 0).toLocaleString()}
              icon={Database}
              trend="+3.4% this month"
              delay={100}
            />
            <StatCard
              label="PENDING REVIEWS"
              value={loading ? "…" : (queue.length || cards?.pending_reviews || reviewStats.pending || 0)}
              icon={ClipboardList}
              hint="Requires attention"
              delay={150}
            />
            <StatCard
              label="APPROVAL RATE"
              value={loading ? "…" : `${reviewStats.approvedPct}%`}
              icon={ShieldCheck}
              hint={`${reviewStats.approved} approved / ${reviewStats.rejected} rejected`}
              delay={200}
            />
          </div>

          <div className="mb-8">
            {/* User Role Distribution bar chart */}
            <section className="bg-white rounded-xl border border-border shadow-sm p-6 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
              <SectionHeader title="User Role Distribution" subtitle="Number of users per role" />
              {loading ? (
                <div className="h-56 flex items-center justify-center text-sm text-gray-500">Loading chart…</div>
              ) : (() => {
                const roleMap = { public: 0, reviewer: 0, admin: 0 };
                users.forEach((u) => {
                  const roles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : ["public"]);
                  roles.forEach((r) => { if (r in roleMap) roleMap[r]++; else roleMap["public"]++; });
                });
                const chartData = [
                  { name: "User", count: roleMap.public, fill: "#94a3b8" },
                  { name: "Reviewer", count: roleMap.reviewer, fill: "#7c3aed" },
                ].filter(d => d.count > 0);
                return chartData.length === 0 ? (
                  <EmptyState title="No user data" description="User role data will appear here." />
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {chartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Audit log widget */}
            <section className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: "350ms" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-base font-semibold text-navy">Recent Audit Log</h2>
                <button
                  type="button"
                  onClick={() => navigate("/admin/audit-log")}
                  className="text-xs font-semibold text-gold border border-gold rounded-md px-3 py-1.5 hover:bg-gold-light transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-gray-500 bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold">Timestamp</th>
                      <th className="px-5 py-3 text-left font-semibold">User</th>
                      <th className="px-5 py-3 text-left font-semibold">Action</th>
                      <th className="px-5 py-3 text-left font-semibold">Resource</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-500">
                          No audit entries yet.
                        </td>
                      </tr>
                    ) : (
                      auditLog.slice(0, 5).map((row) => (
                        <tr key={row.id} className="border-t border-gray-100 hover:bg-bg/50">
                          <td className="px-5 py-3 text-gray-500 font-mono text-xs">{row.timestamp}</td>
                          <td className="px-5 py-3 font-medium text-navy">{row.user || row.user_name}</td>
                          <td className="px-5 py-3">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${actionColors[row.action] || "bg-gray-100 text-gray-700"}`}>
                              {row.action}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-gray-600">{row.resource || row.resource_id}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* System health */}
            <section className="bg-white rounded-xl border border-border shadow-sm p-5 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-gold" />
                <h2 className="text-base font-semibold text-navy">System Health</h2>
              </div>
              <ul className="space-y-4">
                {[
                  { label: "API Endpoint", status: "Operational" },
                  { label: "Data Indexing", status: "98% Complete" },
                  { label: "Auth Services", status: "Operational" },
                ].map(({ label, status }) => (
                  <li key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-semibold text-gold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {status}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}

      {/* Deactivation Confirmation Modal with Dataset Warning and Second Confirmation */}
      {deactivateWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-scale-up">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    deactivateWarningModal.hasDatasets
                      ? "bg-amber-100 text-amber-600"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy">
                    {deactivateWarningModal.step === 2
                      ? "Second Confirmation Required"
                      : "Deactivate User Account"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {deactivateWarningModal.user.full_name || deactivateWarningModal.user.email}
                  </p>
                </div>
              </div>

              {deactivateWarningModal.hasDatasets ? (
                deactivateWarningModal.step === 1 ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 text-xs font-medium leading-relaxed">
                      ⚠️ <strong>This user has uploaded datasets — are you sure?</strong>
                      <p className="mt-1.5 text-[11px] text-amber-800">
                        Deactivating their account will restrict their ability to log in or submit updates, but their uploaded datasets will remain preserved in the institutional portal.
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">
                      Please confirm if you want to proceed. A second confirmation step will be required before this action takes effect.
                    </p>
                    <div className="mt-5 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setDeactivateWarningModal(null)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-navy border border-slate-200 bg-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeactivateWarningModal((prev) => ({ ...prev, step: 2 }))}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-xs cursor-pointer"
                      >
                        I'm Sure, Proceed →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl border border-red-300 bg-red-50 text-red-950 text-xs font-medium leading-relaxed">
                      🛑 <strong>Second & Final Confirmation:</strong>
                      <p className="mt-1 text-[11px] text-red-800">
                        Are you completely certain you want to deactivate <strong>{deactivateWarningModal.user.full_name || deactivateWarningModal.user.email}</strong>?
                      </p>
                    </div>
                    <div className="mt-5 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setDeactivateWarningModal((prev) => ({ ...prev, step: 1 }))}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-navy border border-slate-200 bg-white cursor-pointer"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        disabled={togglingActiveId === (deactivateWarningModal.user.id || deactivateWarningModal.user.user_id)}
                        onClick={() => executeToggleActive(deactivateWarningModal.user, false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        {togglingActiveId ? "Deactivating…" : "Confirm Deactivation"}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Are you sure you want to deactivate <strong>{deactivateWarningModal.user.full_name || deactivateWarningModal.user.email}</strong>? They will not be able to log in until reactivated.
                  </p>
                  <div className="mt-5 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDeactivateWarningModal(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-navy border border-slate-200 bg-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={togglingActiveId === (deactivateWarningModal.user.id || deactivateWarningModal.user.user_id)}
                      onClick={() => executeToggleActive(deactivateWarningModal.user, false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {togglingActiveId ? "Deactivating…" : "Confirm Deactivation"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
