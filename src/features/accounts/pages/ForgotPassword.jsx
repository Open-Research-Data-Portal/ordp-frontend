import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, ShieldCheck, Mail } from "lucide-react";
import TextInput from "../../../components/ui/TextInput";
import Button from "../../../components/ui/Button";
import logo from "../../../assets/aastulogo.png";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      navigate("/check-email", { state: { email } });
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F0F0EE] px-4 py-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-[0_8px_40px_rgba(11,21,38,0.1)] overflow-hidden flex flex-col md:flex-row">
        <div className="md:w-[38%] bg-[#001026] text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden min-h-[320px]">
          <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle,#60a5fa_1px,transparent_1px)] [background-size:14px_14px]" />
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-3">Securing Academic Excellence</h2>
            <div className="w-10 h-0.5 bg-[#D4AF37] mb-4" />
            <p className="text-sm text-slate-300 leading-relaxed">
              Your account is the gateway to the university&apos;s research
              ecosystem. Protect your datasets and publications with a
              strong, unique password.
            </p>
          </div>
          <div className="relative z-10 flex items-start gap-2 text-xs text-slate-400 mt-10">
            <ShieldCheck className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-300 tracking-widest font-medium">VERIFIED PORTAL</p>
              <p className="mt-0.5">Institutional Research Office © 2024</p>
            </div>
          </div>
        </div>

        <div className="md:w-[62%] p-8 md:p-10 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <img src={logo} alt="AASTU" className="w-10 h-10 object-contain" />
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0B1526] transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-[#0B1526] mb-2">Reset Your Password</h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Enter the email address associated with your AASTU account. We&apos;ll
            send you a secure link to reset your credentials.
          </p>

          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex-1">
            <TextInput
              id="reset-email"
              label="University Email Address"
              icon={Mail}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="researcher@aastu.edu.et"
              helperText="* Use your institutional .edu.et email for verification."
            />
            <Button type="submit" loading={submitting} icon={Send} variant="primary">
              Send Reset Link
            </Button>
          </form>

          <div className="flex items-center gap-6 text-xs text-slate-400 mt-8 pt-4 border-t border-slate-100">
            <a href="/ethics" className="hover:text-[#0B1526]">Ethics Committee</a>
            <a href="/data-governance" className="hover:text-[#0B1526]">Data Governance</a>
            <a href="/support" className="hover:text-[#0B1526]">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}
