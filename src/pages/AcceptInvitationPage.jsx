import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Users, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { getDatasetInvitation, acceptDatasetInvitation } from "../api/sharing";
import { useAuth } from "../context/useAuth";

export default function AcceptInvitationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchPreview() {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const data = await getDatasetInvitation(token);
        if (active) setInvitation(data);
      } catch (err) {
        if (active) {
          setError(
            err?.response?.data?.detail ||
            err?.response?.data?.message ||
            "Unable to load invitation. The invitation link may be expired or already accepted."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchPreview();
    return () => { active = false; };
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    setError("");

    try {
      const res = await acceptDatasetInvitation(token);
      setSuccess(true);
      const datasetId = res?.dataset_id || invitation?.dataset_id || invitation?.dataset?.id;
      if (datasetId) {
        setTimeout(() => {
          navigate(`/datasets/${datasetId}`);
        }, 1500);
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to accept invitation. Please try again."
      );
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-xl overflow-hidden animate-fade-in-up">
        {/* Top header */}
        <div className="bg-navy px-6 py-5 text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="text-base font-bold">Co-author Invitation</h1>
            <p className="text-xs text-slate-300">Join research dataset collaboration</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {!isAuthenticated && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <p className="font-semibold mb-1">Sign-In Required</p>
              <p>
                Please{" "}
                <Link to="/login" className="font-bold underline text-amber-950">
                  log in
                </Link>{" "}
                with your institutional account to accept this co-authorship.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-xs text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin text-gold" />
              <span>Loading invitation details…</span>
            </div>
          ) : success ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-navy">Invitation Accepted!</h2>
              <p className="text-xs text-gray-500">
                You are now a registered contributor on this dataset. Redirecting…
              </p>
              <Link
                to="/researcher-dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:text-gold-dark mt-2"
              >
                Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : invitation ? (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-border rounded-xl p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Dataset</span>
                <h3 className="text-base font-bold text-navy leading-snug">
                  {invitation.dataset_title || invitation.dataset?.title || "Research Dataset"}
                </h3>
                {invitation.inviter_name && (
                  <p className="text-xs text-gray-500">
                    Invited by: <span className="font-semibold text-gray-700">{invitation.inviter_name}</span>
                  </p>
                )}
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Permission:</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    <ShieldCheck className="w-3 h-3" />
                    {invitation.permission || "view"} access
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                By accepting, you will be added as a recognized contributor to this dataset with permissions to{" "}
                {invitation.permission === "edit" ? "collaborate on metadata and updates" : "access and review dataset assets"}.
              </p>

              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="w-full py-2.5 px-4 bg-navy hover:bg-navy/90 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-xs"
              >
                {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {accepting ? "Accepting Invitation…" : "Accept Co-Authorship"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
