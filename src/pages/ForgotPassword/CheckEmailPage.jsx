import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, ArrowLeft, ArrowRight, RotateCw } from "lucide-react";
import AuthSplitCard from "../../components/auth/AuthSplitCard";

export default function CheckEmailPage() {
  const location = useLocation();
  const email = location.state?.email;
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleResend() {
    setResending(true);
    try {
      // TODO(backend): POST /api/accounts/password-reset/ { email }
      await new Promise((r) => setTimeout(r, 600));
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthSplitCard logoSize="xlarge">
      <div className="w-16 h-16 rounded-full bg-[#F5C453]/25 flex items-center justify-center mb-5">
        <CheckCircle2 className="w-9 h-9 text-[#B8860B]" strokeWidth={2} />
      </div>
      <h1 className="text-2xl font-bold text-[#0B1526] mb-3">Check your email</h1>
      <p className="text-sm text-slate-500 mb-8 leading-relaxed max-w-sm">
        A password reset link has been sent to{" "}
        {email ? (
          <span className="font-medium text-slate-700">{email}</span>
        ) : (
          "your university inbox"
        )}
        . Click the link in the email to set a new password, then sign in.
      </p>

      <div className="w-full max-w-sm border-t border-slate-100 pt-6">
        <p className="text-sm text-slate-500 mb-2">Didn&apos;t receive the email?</p>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B8860B] hover:underline disabled:opacity-60"
        >
          {resending ? "Resending…" : resent ? "Link resent ✓" : "Resend link"}
          {!resending && !resent && <ArrowRight className="w-3.5 h-3.5" />}
          {resending && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
        </button>
      </div>

      <Link
        to="/login"
        className="mt-8 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0B1526] transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to login
      </Link>
    </AuthSplitCard>
  );
}
