import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Database, Users } from "lucide-react";
import AuthLayout from "../../components/auth/AuthLayout";
import TextInput from "../../components/ui/TextInput";
import Button from "../../components/ui/Button";
import logo from "../../assets/aastulogo.png";
import { register, AuthApiError } from "../../api/authApi";

const INSTITUTIONAL_DOMAINS = ["@aastu.edu.et", "@aastustudent.edu.et"];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  const emailIsValid = /^\S+@\S+\.\S+$/.test(email);
  const emailIsInstitutional = INSTITUTIONAL_DOMAINS.some((domain) =>
    email.toLowerCase().endsWith(domain)
  );

  useEffect(() => {
    if (!username.trim()) return;

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        const available = !["admin", "test", "researcher"].includes(username.toLowerCase());
        if (cancelled) return;
        setUsernameStatus(available ? "valid" : "taken");
      } catch {
        if (cancelled) return;
        setUsernameStatus(null);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [username]);

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError(null);

    if (!fullName.trim() || !emailIsValid || !username.trim() || !password) {
      setApiError("Please fill in all required fields with valid values.");
      return;
    }
    if (usernameStatus === "taken") {
      setApiError("That username is already taken.");
      return;
    }

    setSubmitting(true);
    try {
      await register({
        full_name: fullName,
        email,
        username,
        password,
      });
      navigate("/verify-email", { state: { email } });
    } catch (err) {
      if (err instanceof AuthApiError) {
        setApiError(err.message);
      } else {
        setApiError("Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      showChrome
      variant="register"
      left={
        <>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
            Empowering Innovation &amp; Research.
          </h1>
          <p className="text-slate-300 mb-10 leading-relaxed text-sm md:text-base">
            Join the Addis Ababa Science &amp; Technology University community
            of world-class researchers and scholars.
          </p>
          <ul className="space-y-5">
            <FeatureRow icon={GraduationCap} text="Access exclusive grants" />
            <FeatureRow icon={Database} text="Centralized research data" />
            <FeatureRow icon={Users} text="Global collaboration tools" />
          </ul>
        </>
      }
    >
      <div className="flex justify-center mb-5">
        <img src={logo} alt="AASTU" className="w-24 h-24 object-contain" />
      </div>
      <h2 className="text-xl font-bold text-center text-[#0B1526] mb-1">
        Create Your Account
      </h2>
      <p className="text-sm text-slate-500 text-center mb-6">
        Complete the form below to register your profile.
      </p>

      {apiError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <TextInput
          id="fullName"
          label="Full Name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Dr. Abebe Bekele"
        />

        <TextInput
          id="email"
          label="Email Address"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="researcher@aastu.edu.et"
          status={emailIsValid && emailIsInstitutional ? "valid" : null}
          statusText={
            emailIsValid && emailIsInstitutional ? "Valid university email" : ""
          }
        />

        <TextInput
          id="username"
          label="Username"
          required
          value={username}
          onChange={(e) => {
            const next = e.target.value;
            setUsername(next);
            setUsernameStatus(next.trim() ? "checking" : null);
          }}
          placeholder="abekk_2024"
          status={
            usernameStatus === "checking" || usernameStatus === "valid"
              ? usernameStatus
              : null
          }
          statusText={
            usernameStatus === "checking"
              ? "Checking availability..."
              : usernameStatus === "taken"
              ? "That username is taken."
              : ""
          }
        />

        <TextInput
          id="password"
          label="Password"
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <div className="mt-2">
          <Button type="submit" loading={submitting}>
            Register
          </Button>
        </div>
      </form>

      <p className="text-center text-sm text-slate-500 mt-5">
        Already have an account?{" "}
        <Link to="/login" className="text-[#B8860B] font-semibold hover:underline">
          Log In
        </Link>
      </p>
    </AuthLayout>
  );
}

function FeatureRow({ icon: Icon, text }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <span className="text-sm font-medium text-slate-100">{text}</span>
    </li>
  );
}
