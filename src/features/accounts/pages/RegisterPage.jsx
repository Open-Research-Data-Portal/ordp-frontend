import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Database, Users, ArrowLeft } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import TextInput from "../../../components/ui/TextInput";
import Button from "../../../components/ui/Button";
// import * as authApi from "../../api/authApi";
import logo from "../../../assets/aastulogo.png";
import { register, AuthApiError } from "../api/authApi";

const INSTITUTIONAL_DOMAINS = ["@aastu.edu.et", "@aastustudent.edu.et"];
const USERNAME_PATTERN = /^[a-z0-9_]+$/;
const PASSWORD_MIN_LENGTH = 8;

function getPasswordStrength(password) {
  if (!password) return { level: "none", label: "" };
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { level: "weak", label: "Weak", color: "text-red-600" };
  if (score <= 2) return { level: "fair", label: "Fair", color: "text-amber-600" };
  if (score <= 3) return { level: "good", label: "Good", color: "text-blue-600" };
  return { level: "strong", label: "Strong", color: "text-green-600" };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const emailIsValid = /^\S+@\S+\.\S+$/.test(email);
  const emailIsInstitutional = INSTITUTIONAL_DOMAINS.some((domain) =>
    email.toLowerCase().endsWith(domain)
  );
  const passwordStrength = getPasswordStrength(password);
  const usernameIsValid = USERNAME_PATTERN.test(username);

  useEffect(() => {
    if (!username.trim() || !USERNAME_PATTERN.test(username)) {
      queueMicrotask(() => {
        setUsernameStatus(!username.trim() ? null : "invalid");
        setFieldErrors((prev) => ({ ...prev, username: !username.trim() ? undefined : "Username may only contain lowercase letters, numbers, and underscores." }));
      });
      return;
    }
    queueMicrotask(() => setFieldErrors((prev) => ({ ...prev, username: undefined })));

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setUsernameStatus("checking");
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

  function validate() {
    const errors = {};
    if (!fullName.trim()) errors.full_name = "Full name is required.";
    if (!emailIsValid) errors.email = "Enter a valid email address.";
    else if (!emailIsInstitutional) errors.email = "Only AASTU institutional emails are allowed.";
    if (!username.trim()) errors.username = "Username is required.";
    else if (!usernameIsValid) errors.username = "Username may only contain lowercase letters, numbers, and underscores.";
    if (!password) errors.password = "Password is required.";
    else if (password.length < PASSWORD_MIN_LENGTH) errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError(null);
    setFieldErrors({});

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
      });

      navigate("/verify-email", {
        state: { email: email.trim() },
        replace: true,
      });
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
      variant="register"
      left={
        <>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-gold" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-4 text-white">
            Empowering Innovation &amp; Research.
          </h1>
          <p className="text-slate-300 mb-8 leading-relaxed text-sm md:text-base">
            Join the Addis Ababa Science &amp; Technology University community
            of world-class researchers and scholars.
          </p>
          <ul className="space-y-4">
            <FeatureRow icon={GraduationCap} text="Access exclusive grants" />
            <FeatureRow icon={Database} text="Centralized research data" />
            <FeatureRow icon={Users} text="Global collaboration tools" />
          </ul>
        </>
      }
    >
      <div className="flex justify-center mb-3">
        <img src={logo} alt="AASTU" className="w-16 h-16 object-contain" />
      </div>
      <h2 className="text-xl font-bold text-center text-[#0B1526] mb-1">
        Create Your Account
      </h2>
      <p className="text-xs text-slate-500 text-center mb-4">
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
           error={fieldErrors.full_name}
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
           error={fieldErrors.email}
         />

         <TextInput
           id="username"
           label="Username"
           required
           value={username}
           onChange={(e) => {
             const next = e.target.value.toLowerCase();
             setUsername(next);
           }}
           placeholder="abekk_2024"
           status={
             usernameStatus === "checking" || usernameStatus === "valid"
               ? usernameStatus
               : usernameStatus === "invalid" || usernameStatus === "taken"
               ? "error"
               : null
           }
           statusText={
             usernameStatus === "checking"
               ? "Checking availability..."
               : usernameStatus === "taken"
               ? "That username is taken."
               : usernameStatus === "invalid"
               ? "Only lowercase letters, numbers, and underscores allowed."
               : ""
           }
           error={fieldErrors.username}
         />

         <div className="mb-2">
           <TextInput
             id="password"
             label="Password"
             required
             type="password"
             showToggle
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             placeholder="••••••••"
             error={fieldErrors.password}
           />
           {password && (
             <p className={`text-xs mt-1 ${passwordStrength.color}`}>
               Password strength: {passwordStrength.label}
             </p>
           )}
         </div>

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