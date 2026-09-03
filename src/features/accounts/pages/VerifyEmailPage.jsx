import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import AuthSplitCard from "../components/AuthSplitCard";

export default function VerifyEmailPage() {
  const location = useLocation();
  const email = location.state?.email;

  return (
    <AuthSplitCard logoSize="xlarge">
      <div className="w-16 h-16 rounded-full bg-[#F5C453]/25 flex items-center justify-center mb-5">
        <CheckCircle2 className="w-9 h-9 text-[#B8860B]" strokeWidth={2} />
      </div>
      <h1 className="text-2xl font-bold text-[#0B1526] mb-3">Check your email</h1>
      <p className="text-sm text-slate-500 mb-8 leading-relaxed max-w-sm">
        We&apos;ve sent a verification link to{" "}
        {email ? (
          <span className="font-medium text-slate-700">{email}</span>
        ) : (
          "your university inbox"
        )}
        . Click the link in the email to activate your account and access your dashboard.
      </p>

      <Link
        to="/login"
        className="mt-8 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0B1526] transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to login
      </Link>
    </AuthSplitCard>
  );
}
