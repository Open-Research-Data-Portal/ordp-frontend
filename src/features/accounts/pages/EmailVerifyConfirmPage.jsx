import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import AuthSplitCard from "../components/AuthSplitCard";
import * as authApi from "../api/authApi";
import { useAuth } from "../../../context/useAuth";
import {
  INTERESTS_ONBOARDING_PATH,
  isInterestsOnboardingSatisfied,
} from "../onboarding";

export default function EmailVerifyConfirmPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { establishSession } = useAuth();
  const [searchParams] = useSearchParams();

  const token =
    searchParams.get("token") ||
    searchParams.get("key") ||
    searchParams.get("t") ||
    params.token ||
    "";

  const [status, setStatus] = useState(() => (token ? "verifying" : "error")); // verifying | success | error
  const [successMessage, setSuccessMessage] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [error, setError] = useState(() =>
    token
      ? null
      : "Invalid verification link. Please check your email or request a new link."
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function verify() {
      try {
        const data = await authApi.verifyEmail(token);
        if (cancelled) return;

        const message = data?.detail || "Email verified successfully.";

        // If backend does not return tokens (e.g. newly invited reviewer needing password setup),
        // direct them to set a password rather than an unauthenticated login page.
        if (!data?.access || !data?.refresh) {
          navigate(`/reset-password?token=${encodeURIComponent(token)}`, {
            replace: true,
            state: { message: `${message} Please set your password to complete account activation.` },
          });
          return;
        }

        // Auto-login: persist the JWTs returned by the verify endpoint.
        const profile = await establishSession({
          access: data.access,
          refresh: data.refresh,
          user: data.user || null,
        });

        let completed = Boolean(profile) && authApi.isProfileCompleted(profile);
        if (!completed) {
          try {
            const completion = await authApi.getProfileCompletion();
            completed = isInterestsOnboardingSatisfied({
              completion,
              profile,
              user: data.user || profile,
              backendCompleted: authApi.isProfileCompleted(completion),
            });
          } catch {
            // Fall back to onboarding
          }
        }

        if (cancelled) return;
        setSuccessMessage(message);
        setStatus("success");
        setTimeout(
          () =>
            navigate(completed ? "/dashboard" : INTERESTS_ONBOARDING_PATH, {
              replace: true,
            }),
          1200
        );
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(
          err?.message || "Verification failed. If an administrator created your account, set your password below."
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
          <h1 className="text-2xl font-bold text-[#0B1526] mb-2">Verifying your account</h1>
          <p className="text-sm text-slate-500 max-w-sm">
            Please wait while we confirm your credentials…
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-9 h-9 text-green-600" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-[#0B1526] mb-2">Account confirmed!</h1>
          <p className="text-sm text-slate-500 max-w-sm">
            {successMessage} Redirecting you…
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="text-2xl font-bold text-[#0B1526] mb-2">Verification Notice</h1>
          <p className="text-sm text-red-600 max-w-sm mb-3">{error}</p>
          {errorCode && (
            <p className="text-xs text-slate-400 mb-3">Code: {errorCode}</p>
          )}

          {token && (
            <div className="mt-2 mb-6 p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-slate-700 text-left max-w-sm w-full">
              <div className="flex items-center gap-2 mb-1 text-amber-900 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-[#B8860B]" />
                <span>Invited Reviewer / New Account</span>
              </div>
              <p className="mb-3 text-slate-600 text-xs leading-relaxed">
                If an administrator created your reviewer or staff account, set your password below to activate:
              </p>
              <Link
                to={`/reset-password?token=${encodeURIComponent(token)}`}
                className="inline-flex items-center justify-center gap-1.5 w-full bg-[#B8860B] text-white font-medium py-2 px-3 rounded-lg text-xs hover:bg-[#9a7009] transition"
              >
                <span>Set Account Password</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs font-semibold text-[#B8860B]">
            <Link to="/login" className="hover:underline">
              Return to login
            </Link>
            <span>•</span>
            <Link to="/forgot-password" className="hover:underline">
              Request reset link
            </Link>
          </div>
        </>
      )}
    </AuthSplitCard>
  );
}
