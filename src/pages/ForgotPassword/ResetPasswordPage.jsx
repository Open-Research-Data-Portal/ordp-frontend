import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ArrowRight, ArrowLeft } from "lucide-react";
import AuthSplitCard from "../../components/auth/AuthSplitCard";
import TextInput from "../../components/ui/TextInput";
import Button from "../../components/ui/Button";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function validate() {
    if (!token) return "Invalid or missing reset link. Please request a new one.";
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
      // TODO(backend): POST /api/accounts/password-reset/confirm/ { token, password }
      await new Promise((r) => setTimeout(r, 600));
      navigate("/login", { state: { message: "Password reset successfully. You can now sign in." } });
    } catch (err) {
      setError(err?.message || "Failed to reset password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplitCard logoSize="xlarge">
      <h1 className="text-2xl font-bold text-[#0B1526] mb-2 w-full text-center">Set a new password</h1>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed max-w-sm mx-auto">
        Choose a strong password for your AASTU research account. You&apos;ll use it to sign in after this step.
      </p>

      {error && (
        <div role="alert" className="mb-4 w-full max-w-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 text-left">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm text-left">
        <TextInput
          id="new-password"
          label="New Password"
          icon={Lock}
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          placeholder="••••••••"
        />
        <Button type="submit" loading={submitting} icon={ArrowRight}>
          Reset Password
        </Button>
      </form>

      <Link
        to="/login"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0B1526] transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to login
      </Link>
    </AuthSplitCard>
  );
}
