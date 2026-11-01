import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Shield,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import TextInput from "../../../components/ui/TextInput";
import Button from "../../../components/ui/Button";
import { useAuth } from "../../../context/useAuth";
import * as authApi from "../api/authApi";

const PASSWORD_MIN_LENGTH = 8;

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500", text: "text-red-600" };
  if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500", text: "text-amber-600" };
  if (score === 3) return { score: 3, label: "Good", color: "bg-blue-500", text: "text-blue-600" };
  return { score: 4, label: "Strong", color: "bg-green-500", text: "text-green-600" };
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { clearLocalAuth } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(newPassword);

  function validate() {
    const errors = {};
    if (!currentPassword) {
      errors.current_password = "Enter your current password.";
    }
    if (!newPassword) {
      errors.new_password = "Enter a new password.";
    } else if (newPassword.length < PASSWORD_MIN_LENGTH) {
      errors.new_password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    if (!confirmPassword) {
      errors.confirm_password = "Confirm your new password.";
    } else if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.confirm_password = "Passwords do not match.";
    }
    if (currentPassword && newPassword && currentPassword === newPassword) {
      errors.new_password = "New password cannot be the same as your current password.";
    }
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGeneralError("");
    setFieldErrors({});

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setSuccess(true);

      // Directly clear local auth state and tokens without calling the backend logout endpoint
      // (the backend already revoked all outstanding refresh tokens)
      clearLocalAuth?.();

      const successMsg =
        res?.detail ||
        res?.message ||
        "Password changed successfully. Please log in with your new password.";

      // Brief pause to allow user to perceive success before redirecting to login
      setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: { message: successMsg },
        });
      }, 1000);
    } catch (err) {
      const serverFieldErrors = err?.fieldErrors || {};
      if (Object.keys(serverFieldErrors).length > 0) {
        setFieldErrors(serverFieldErrors);
      }
      setGeneralError(
        err?.message ||
          "Failed to change password. Please check your credentials and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell
      title="Security Settings"
      subtitle="Update your account credentials"
    >
      <div className="max-w-2xl">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0B1526] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
          </button>
        </div>

        {success ? (
          <div className="bg-white border border-green-200 rounded-2xl p-8 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-[#0B1526] mb-2">
              Password Changed Successfully
            </h2>
            <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
              Your password has been updated and all active sessions have been securely ended. Redirecting you to sign in...
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
              Redirecting to login
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center text-[#8B6F1F]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0B1526]">Change Password</h2>
                <p className="text-xs text-slate-500">
                  Choose a strong, unique password to protect your ORDP account.
                </p>
              </div>
            </div>

            <div className="p-6">
              {/* Security info alert */}
              <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-3">
                <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-blue-950">Security Notice: </span>
                  For your security, changing your password revokes all active sessions and refresh tokens across all devices. You will need to log in again with your new password.
                </div>
              </div>

              {generalError && (
                <div
                  role="alert"
                  className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Unable to update password</p>
                    <p className="mt-0.5 text-xs text-red-600 leading-relaxed">
                      {generalError}
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <TextInput
                  id="current_password"
                  label="Current Password"
                  type="password"
                  required
                  showToggle
                  icon={Lock}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (fieldErrors.current_password) {
                      setFieldErrors((prev) => ({ ...prev, current_password: null }));
                    }
                  }}
                  error={fieldErrors.current_password}
                  placeholder="Enter your current password"
                />

                <TextInput
                  id="new_password"
                  label="New Password"
                  type="password"
                  required
                  showToggle
                  icon={Lock}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (fieldErrors.new_password) {
                      setFieldErrors((prev) => ({ ...prev, new_password: null }));
                    }
                  }}
                  error={fieldErrors.new_password}
                  helperText="Must be at least 8 characters. Avoid common words, your username, or email."
                  placeholder="Enter a new secure password"
                />

                {newPassword && (
                  <div className="mb-4 -mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 font-medium">Password strength:</span>
                      <span className={`font-semibold ${strength.text}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${strength.score >= 1 ? strength.color : "bg-transparent"}`} />
                      <div className={`h-full rounded-full transition-all ${strength.score >= 2 ? strength.color : "bg-transparent"}`} />
                      <div className={`h-full rounded-full transition-all ${strength.score >= 3 ? strength.color : "bg-transparent"}`} />
                      <div className={`h-full rounded-full transition-all ${strength.score >= 4 ? strength.color : "bg-transparent"}`} />
                    </div>
                  </div>
                )}

                <TextInput
                  id="confirm_password"
                  label="Confirm New Password"
                  type="password"
                  required
                  showToggle
                  icon={Lock}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirm_password) {
                      setFieldErrors((prev) => ({ ...prev, confirm_password: null }));
                    }
                  }}
                  error={fieldErrors.confirm_password}
                  placeholder="Re-enter your new password"
                />

                <div className="mt-8 flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth={false}
                    onClick={() => navigate("/profile")}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth={false}
                    loading={submitting}
                    disabled={submitting}
                    icon={ShieldCheck}
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
