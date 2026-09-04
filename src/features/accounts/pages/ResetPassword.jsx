import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import AuthSplitCard from "../components/AuthSplitCard";
import TextInput from "../../../components/ui/TextInput";
import Button from "../../../components/ui/Button";
import * as authApi from "../api/authApi";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const uid = searchParams.get("uid");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function validate() {
    if (!token) return "Invalid or missing setup link. Please use the link sent to your email.";
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
      await authApi.confirmPasswordReset({
        token,
        new_password: password,
        confirm_password: confirmPassword,
        uid: uid || undefined,
      });
      navigate("/login", {
        state: { message: "Password created successfully! You can now sign in with your email and new password." },
      });
    } catch (err) {
      setError(err?.message || "Failed to set password. The link may be expired or already used.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplitCard logoSize="xlarge">
      <h1 className="text-2xl font-bold text-[#0B1526] mb-2 w-full text-center">Set account password</h1>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed max-w-sm mx-auto">
        Create a password for your ORDP account. Once set, you can immediately log in and access your dashboard.
      </p>

      {!token && (
        <div role="alert" className="mb-4 w-full max-w-sm rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 text-left">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Missing token in link</p>
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
          Set Password & Sign In
        </Button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0B1526] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
      </div>
    </AuthSplitCard>
  );
}