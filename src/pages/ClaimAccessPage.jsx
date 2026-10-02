import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { KeyRound, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { claimShareAccess } from "../api/sharing";
import { useAuth } from "../context/useAuth";

export default function ClaimAccessPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [claimedData, setClaimedData] = useState(null);

  async function handleClaim(e) {
    e?.preventDefault();
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const payload = purpose.trim() ? { purpose: purpose.trim() } : {};
      const res = await claimShareAccess(token, payload);
      setClaimedData(res);
      if (res?.dataset_id) {
        setTimeout(() => {
          navigate(`/datasets/${res.dataset_id}`);
        }, 1500);
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to claim access. The link may have expired or is invalid."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-xl overflow-hidden animate-fade-in-up">
        {/* Header banner */}
        <div className="bg-navy px-6 py-5 text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="text-base font-bold">Claim Dataset Access</h1>
            <p className="text-xs text-slate-300">Activate your research share permission</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {!isAuthenticated && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <p className="font-semibold mb-1">Account Notice</p>
              <p>
                If you have an account, please{" "}
                <Link to="/login" className="font-bold underline text-amber-950">
                  log in
                </Link>{" "}
                first to associate this access token with your user profile.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {claimedData ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-navy">Access Successfully Claimed!</h2>
              <p className="text-xs text-gray-500">
                Redirecting you to the dataset page in a moment…
              </p>
              {claimedData.dataset_id && (
                <Link
                  to={`/datasets/${claimedData.dataset_id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:text-gold-dark mt-2"
                >
                  Go to Dataset Now <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          ) : (
            <form onSubmit={handleClaim} className="space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                You have received a share invitation token. Click below to activate your share permission and start accessing the research data.
              </p>

              <div>
                <label htmlFor="claim-purpose" className="block text-xs font-semibold text-gray-700 mb-1">
                  Intended Research Purpose (Optional)
                </label>
                <textarea
                  id="claim-purpose"
                  rows={3}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Specify how you intend to use this dataset (required for delegated shares)…"
                  className="w-full text-xs rounded-xl border border-border p-3 focus:outline-none focus:border-gold resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-navy hover:bg-navy/90 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-xs"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4 text-gold" />}
                {loading ? "Activating Share…" : "Claim Access"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
