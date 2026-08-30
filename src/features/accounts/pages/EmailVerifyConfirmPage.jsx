import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import AuthSplitCard from "../components/AuthSplitCard";
import * as authApi from "../api/authApi";
import { useAuth } from "../../../context/useAuth";

export default function EmailVerifyConfirmPage() {
  const navigate = useNavigate();
  const { establishSession } = useAuth();
  const [searchParams] = useSearchParams();

  // The backend sends the verification link as
  //   {FRONTEND_URL}/verify-email?token=<uuid>
  // (confirmed from app/accounts/views.py RegisterView), so the token is
  // always in the `token` query param.
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState(() => (token ? "verifying" : "error")); // verifying | success | error
  const [successMessage, setSuccessMessage] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [error, setError] = useState(() =>
    token
      ? null
      : "Invalid verification link. Please register again or request a new link."
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function verify() {
      try {
        const data = await authApi.verifyEmail(token);
        if (cancelled) return;

        const message = data?.detail || "Email verified successfully.";

        // Backend contract: a successful verification returns access/refresh
        // JWTs (auto-login). If they're absent, keep the simple flow: tell
        // the user to sign in — the login page's completion check handles
        // the rest.
        if (!data?.access || !data?.refresh) {
          navigate("/login", {
            replace: true,
            state: { message: `${message} Please log in to continue.` },
          });
          return;
        }

        // Auto-login: persist the JWTs returned by the verify endpoint.
        const profile = await establishSession({
          access: data.access,
          refresh: data.refresh,
          user: data.user || null,
        });

        // Route to onboarding or the dashboard based on profile completion —
        // the same decision the login page makes.
        let completed = Boolean(profile) && authApi.isProfileCompleted(profile);
        if (!completed) {
          try {
            const completion = await authApi.getProfileCompletion();
            completed = authApi.isProfileCompleted(completion);
          } catch {
            // Fall back to onboarding; it re-checks completion before
            // requiring any input and redirects to the dashboard if done.
          }
        }

        if (cancelled) return;
        setSuccessMessage(message);
        setStatus("success");
        setTimeout(
          () =>
            navigate(
              completed ? "/dashboard" : "/research-interests-onboarding",
              { replace: true }
            ),
          1200
        );
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        // Show the backend's own error.message verbatim so the distinct failure
        // modes stay distinguishable (e.g. "This verification link is invalid."
        // vs an expired-token vs an already-used-token message). Only fall back
        // to a generic string when no message reached us at all.
        setError(
          err?.message || "Verification failed. Please request a new link."
        );
        setErrorCode(
          err instanceof authApi.AuthApiError && err.code ? err.code : null
        );
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [token, navigate, establishSession]);

  return (
    <AuthSplitCard logoSize="xlarge">
      {status === "verifying" && (
        <>
          <Loader2 className="w-12 h-12 text-[#B8860B] animate-spin mb-5" />
          <h1 className="text-2xl font-bold text-[#0B1526] mb-2">Verifying your email</h1>
          <p className="text-sm text-slate-500 max-w-sm">
            Please wait while we confirm your account…
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-9 h-9 text-green-600" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-[#0B1526] mb-2">Email verified!</h1>
          <p className="text-sm text-slate-500 max-w-sm">
            {successMessage} Redirecting you…
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="text-2xl font-bold text-[#0B1526] mb-2">Verification failed</h1>
          <p className="text-sm text-red-600 max-w-sm mb-2">{error}</p>
          {errorCode && (
            <p className="text-xs text-slate-400 mb-4">Error code: {errorCode}</p>
          )}
          <a href="/register" className="text-sm font-semibold text-[#B8860B] hover:underline">
            Return to registration
          </a>
        </>
      )}
    </AuthSplitCard>
  );
}
