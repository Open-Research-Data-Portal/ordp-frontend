import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowRight, UserCheck, X, Sparkles, CheckCircle2 } from "lucide-react";

export default function ReviewerRoleNoticeModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-[#E3E1DA] animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Accent Gradient Header */}
        <div className="bg-gradient-to-r from-navy via-navy-light to-navy p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-gold/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gold/15 rounded-full blur-2xl" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex p-3 rounded-2xl bg-gold/20 border border-gold/30 mb-3 shadow-inner">
            <ShieldCheck className="w-9 h-9 text-gold" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/20 text-gold text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Special Privilege
          </div>

          <h3 className="text-2xl font-serif font-bold text-white tracking-tight">
            Reviewer Privileges Granted
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
            An administrator has assigned you Reviewer access on the Open Research Data Portal.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="bg-[#F8F7F4] rounded-xl p-4 border border-[#E3E1DA] space-y-2.5">
            <p className="text-xs font-bold uppercase text-navy tracking-wider">What you can now do:</p>
            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Evaluate incoming dataset submissions using standard peer rubrics</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Inspect dataset modifications, revisions, and metadata diffs</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Cast quorum decisions on archive and modification requests</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">
            You can effortlessly switch between your Reviewer Console and your personal User Dashboard at any time.
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/reviewer-dashboard");
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-navy hover:bg-navy-light text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <span>Reviewer Dashboard</span>
              <ArrowRight className="w-4 h-4 text-gold" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/user-dashboard");
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-navy text-slate-800 hover:text-navy bg-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-slate-500" />
              <span>User Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
