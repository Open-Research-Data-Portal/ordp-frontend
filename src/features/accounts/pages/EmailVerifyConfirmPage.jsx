import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import AuthSplitCard from "../components/AuthSplitCard";
import * as authApi from "../api/authApi";

export default function EmailVerifyConfirmPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [status, setStatus] = useState(() => (uid && token ? "verifying" : "error")); // verifying | success | error
  const [message, setMessage] = useState("");
  const [error, setError] = useState(() =>
    uid && token ? null : "Invalid verification link. Please register again or request a new link."
  );

  useEffect(() => {
    if (!uid || !token) return;

    let cancelled = false;

    async function verify() {
      try {
        const data = await authApi.verifyEmail(uid, token);
        if (cancelled) return;
        const nextMessage = data?.detail || "Email verified. You can now log in.";
        setMessage(nextMessage);
        setStatus("success");
        setTimeout(() => navigate("/login", { replace: true, state: { message: nextMessage } }), 1500);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(
          err instanceof authApi.AuthApiError
            ? err.message
            : err?.message || "Verification failed. The link may have expired."
        );
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [uid, token, navigate]);

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
            {message || "Your account is active. Redirecting you to sign in…"}
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
