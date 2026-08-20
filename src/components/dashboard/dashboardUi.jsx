import { X } from "lucide-react";

export function ProfileBanner({ onDismiss, onGoToProfile }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-gold/30 bg-gold-light/60 px-5 py-3.5 animate-fade-in-up">
      <p className="text-sm text-navy">
        <span className="font-semibold">Complete your profile</span>
        {" — "}
        Add your research interests and affiliation to get better recommendations.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onGoToProfile}
          className="bg-navy hover:bg-navy-light text-white text-xs font-semibold rounded-lg px-4 py-2 transition-colors"
        >
          Go to Profile
        </button>
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-gray-500 hover:text-navy p-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-blue-50 text-blue-700 border-blue-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    published: "bg-emerald-50 text-emerald-700 border-emerald-200",
    draft: "bg-gray-100 text-gray-600 border-gray-200",
    under_review: "bg-violet-50 text-violet-700 border-violet-200",
    changes_requested: "bg-orange-50 text-orange-700 border-orange-200",
  };
  const key = String(status || "pending").toLowerCase().replace(" ", "_");
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${styles[key] || styles.pending}`}>
      {String(status || "pending").replace(/_/g, " ")}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border bg-white p-10 text-center">
      {Icon && (
        <span className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-gray-50 text-gray-400 mb-4">
          <Icon className="w-6 h-6" />
        </span>
      )}
      <p className="font-semibold text-navy">{title}</p>
      {description && <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 text-sm font-semibold text-gold border border-gold rounded-lg px-5 py-2 hover:bg-gold-light transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <h2 className="text-base font-semibold text-navy">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="text-sm font-medium text-gold hover:underline shrink-0">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function DashboardFooter() {
  return (
    <footer className="mt-10 pt-6 border-t border-border text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2">
      <span>© {new Date().getFullYear()} Addis Ababa Science and Technology University. All rights reserved.</span>
      <div className="flex items-center gap-4">
        <a href="/privacy" className="hover:text-navy">Privacy Policy</a>
        <a href="/terms" className="hover:text-navy">Terms of Service</a>
        <a href="/support" className="hover:text-navy">Support</a>
      </div>
    </footer>
  );
}
