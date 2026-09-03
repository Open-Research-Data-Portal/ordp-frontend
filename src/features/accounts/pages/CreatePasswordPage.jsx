import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import AuthSplitCard from "../components/AuthSplitCard";
import TextInput from "../../../components/ui/TextInput";
import Button from "../../../components/ui/Button";
import * as authApi from "../api/authApi";

/**
 * Create password page — the page linked from the invite email that an admin
 * triggers when they create a reviewer account via the admin panel.
 *
 * Backend flow:
 *   POST /admin-panel/users/create/  (admin creates the reviewer; backend
 *   emails a link {FRONTEND_URL}/create-password?uid=<uid>&token=<token>&email=<email>)
 *   POST /accounts/password-reset/confirm/  (this page — sets the password)
 *
 * The uid+token pair is the same Django PasswordResetTokenGenerator pair the
 * backend uses everywhere for setting a password, so the existing
 * password-reset/confirm/ endpoint validates it.
 */
export default function CreatePasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function validate() {
    if (!token)
      return "Invalid or missing invitation link. Please request a new one.";
    if (email && !/^\S+@\S+\.\S+$/.test(email))
      return "Please enter a valid email address.";
    if (password.length < 8)
      return "Password must be at least 8 characters.";
    if (password !== confirmPassword)
      return "Passwords do not match.";
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
        uid,
        token,
        new_password: password,
        confirm_password: confirmPassword,
      });
      navigate("/login", {
        state: { message: "Password set successfully. You can now sign in." },
      });
    } catch (err) {
      setError(err?.message || "Failed to set password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplitCard logoSize="xlarge" sidebarTitle="Reviewer Access">
      <h1 className="text-2xl font-bold text-[#0B1526] mb-2 w-full text-center">
        Create your password
      </h1>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed max-w-sm mx-auto">
        An administrator invited you to review datasets on the AASTU Open
        Research Data Portal. Set a strong password to activate your account.
      </p>

      {error && (
        <div
          role="alert"
          className="mb-4 w-full max-w-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 text-left"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm text-left">
        <TextInput
          id="create-email"
          label="Email Address"
          icon={Mail}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="reviewer@aastu.edu.et"
          readOnly={Boolean(emailParam)}
        />
        <TextInput
          id="new-password"
          label="New Password"
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
        <Button type="submit" loading={submitting} icon={ArrowRight}>
          Set Password &amp; Continue
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