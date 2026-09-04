import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Lock, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import AuthSplitCard from "../components/AuthSplitCard";
import TextInput from "../../../components/ui/TextInput";
import Button from "../../../components/ui/Button";
import * as authApi from "../api/authApi";
import { useAuth } from "../../../context/useAuth";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { establishSession } = useAuth();

  const token =
    searchParams.get("token") ||
    searchParams.get("key") ||
    searchParams.get("t") ||
    params.token ||
    "";
  const uid =
    searchParams.get("uid") ||
    searchParams.get("user_id") ||
    searchParams.get("id") ||
    params.uid ||
    "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  function validate() {
    if (!token) return "Invalid or missing token in your setup link. Please make sure you clicked the full email link.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.confirmPasswordReset({
        uid: uid || undefined,
        token,
        new_password: password,
        confirm_password: confirmPassword,
      });

      setSuccess(true);

      if (res?.access && res?.refresh) {
        await establishSession({
          access: res.access,
          refresh: res.refresh,
          user: res.user || null,
        });
        setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
      } else {
        setTimeout(
          () =>
            navigate("/login", {
              replace: true,
              state: { message: "Password created successfully! You can now log in with your email and new password." },
            }),
          1200
        );
      }
    } catch (err) {
      setError(err?.message || "Failed to set password. The link may have expired or already been used.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplitCard logoSize="xlarge">
      {success ? (
        <div className="flex flex-col items-center text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-9 h-9 text-green-600" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-[#0B1526] mb-2">Password configured!</h1>
          <p className="text-sm text-slate-500 max-w-sm">
            Your credentials have been securely updated. Redirecting you now…
          </p>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-[#0B1526] mb-2 w-full text-center">Set account password</h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed max-w-sm mx-auto text-center">
            Create a password for your ORDP account. Once set, you can immediately log in and access your dashboard.
          </p>

          {!token && (
            <div role="alert" className="mb-4 w-full max-w-sm rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 text-left">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Missing setup token</p>
                  <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
                    Please make sure you clicked the full link sent to your email. If your link has expired, request a new one below.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 w-full max-w-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 text-left">
              <p>{error}</p>
              {(error.toLowerCase().includes("expired") || error.toLowerCase().includes("invalid")) && (
                <Link
                  to="/forgot-password"
                  className="mt-2 inline-block text-xs font-semibold text-red-800 underline hover:text-red-950"
                >
                  Request a new password reset link &rarr;
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm text-left">
            <TextInput
              id="new-password"
              label="Password"
              icon={Lock}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              showToggle
              placeholder="••••••••"
              helperText="At least 8 characters."
            />
            <TextInput
              id="confirm-password"
              label="Confirm Password"
              icon={Lock}
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              showToggle
              placeholder="••••••••"
            />
            <Button type="submit" loading={submitting} disabled={!token} icon={ArrowRight}>
              Set Password & Continue
            </Button>
          </form>

          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0B1526] transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>
        </>
      )}
    </AuthSplitCard>
  );
}