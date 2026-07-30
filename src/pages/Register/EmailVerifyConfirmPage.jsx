import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import AuthSplitCard from "../../components/auth/AuthSplitCard";

export default function EmailVerifyConfirmPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState(() => (token ? "verifying" : "error")); // verifying | success | error
  const [error, setError] = useState(() =>
    token ? null : "Invalid verification link. Please register again or request a new link."
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function verify() {
      try {
        // TODO(backend): POST /api/accounts/verify-email/ { token }
        await new Promise((r) => setTimeout(r, 900));
        if (cancelled) return;
        setStatus("success");
        setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(err?.message || "Verification failed. The link may have expired.");
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

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
            Your account is active. Redirecting you to your dashboard…
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="text-2xl font-bold text-[#0B1526] mb-2">Verification failed</h1>
          <p className="text-sm text-red-600 max-w-sm mb-4">{error}</p>
          <a href="/register" className="text-sm font-semibold text-[#B8860B] hover:underline">
            Return to registration
          </a>
        </>
      )}
    </AuthSplitCard>
  );
}
