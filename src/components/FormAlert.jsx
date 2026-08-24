import { AlertCircle, CheckCircle, Info } from "lucide-react";

const VARIANTS = {
  error: {
    wrapper: "border-red-200 bg-red-50 text-red-700",
    icon: AlertCircle,
  },
  success: {
    wrapper: "border-green-200 bg-green-50 text-green-700",
    icon: CheckCircle,
  },
  info: {
    wrapper: "border-blue-200 bg-blue-50 text-blue-700",
    icon: Info,
  },
};

/**
 * FormAlert — styled inline alert for form-level feedback.
 * Returns null when `message` is falsy so callers can always render it unconditionally.
 */
export default function FormAlert({ message, variant = "error" }) {
  if (!message) return null;
  const { wrapper, icon: Icon } = VARIANTS[variant] ?? VARIANTS.error;
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm mt-4 ${wrapper}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
