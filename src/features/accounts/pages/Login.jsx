import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../../../context/useAuth";
import { AuthApiError } from "../api/authApi";
import AuthLayout from "../components/AuthLayout";
import TextInput from "../../../components/ui/TextInput";
import Button from "../../../components/ui/Button";
import logo from "../../../assets/aastulogo.png";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [apiError, setApiError] = useState(null);

  function validate() {
    if (!identifier.trim()) return "Please enter your email or username.";
    if (!password) return "Please enter your password.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError(null);

    const validationMessage = validate();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }
    setFormError(null);
    setSubmitting(true);

    try {
      const result = await login(identifier, password, stayLoggedIn);
      const completed = Boolean(
        result.profile?.researchInterestsCompleted ||
        result.profile?.onboardingCompleted ||
        result.profile?.research_interests_completed ||
        result.profile?.onboarding_completed ||
        result.profile?.interests?.length
      );
      if (!completed) {
        navigate("/research-interests-onboarding");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setApiError(
        err instanceof AuthApiError
          ? err
          : new AuthApiError({ code: "UNKNOWN_ERROR", message: "Something went wrong. Please try again." })
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    // If redirected from reset password flow with a success message,
    // ensure the password field is empty.
    if (location.state?.message) {
      queueMicrotask(() => setPassword(""));
    }
  }, [location.state]);

  return (
    <AuthLayout
      variant="login"
      left={
        <>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
            Empowering Innovation at AASTU
          </h1>
          <p className="text-slate-300 mb-10 leading-relaxed text-sm md:text-base">
            Welcome to the official Research Portal of Addis Ababa Science
            and Technology University. Access global datasets, collaborative
            tools, and peer-reviewed publications.
          </p>
          <div className="flex gap-4">
            <StatCard value="0" label="Researchers" />
            <StatCard value="0" label="Publications" />
          </div>
        </>
      }
    >
      <div className="flex flex-col items-center text-center w-full">
        <div className="flex justify-center mb-5">
          <img src={logo} alt="AASTU" className="w-24 h-24 object-contain" />
        </div>
        <h2 className="text-xl font-bold text-[#0B1526] mb-1">Welcome Back</h2>
        <p className="text-sm text-slate-500 mb-6">
          Sign in to your research dashboard
        </p>

        {successMessage && (
          <div role="status" className="mb-4 w-full rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 text-center">
            {successMessage}
          </div>
        )}
        {apiError && (
          <div role="alert" className="mb-4 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 text-center">
            {apiError.message}
          </div>
        )}
        {formError && !apiError && (
          <div role="alert" className="mb-4 w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 text-center">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="w-full text-left">
          <TextInput
            id="identifier"
            label="Email or Username"
            icon={Mail}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. researcher@aastu.edu.et or username"
          />

          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs text-slate-500 hover:text-[#0B1526]">
              Forgot password?
            </Link>
          </div>
          <TextInput
            id="password"
            icon={Lock}
            type="password"
            showToggle
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            label=""
          />

          <label className="flex items-center gap-2 mb-5 text-sm text-slate-600 -mt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={stayLoggedIn}
              onChange={(e) => setStayLoggedIn(e.target.checked)}
              className="rounded border-slate-300 accent-[#0B1526]"
            />
            Stay logged in for 30 days
          </label>

          <Button type="submit" loading={submitting} icon={ArrowRight}>
            Log In
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5 w-full">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-[#B8860B] font-semibold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-5 py-4 min-w-[120px]">
      <div className="text-2xl font-bold text-[#D4AF37]">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">{label}</div>
    </div>
  );
}
