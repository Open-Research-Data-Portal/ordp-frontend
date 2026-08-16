export default function Button({
  children,
  type = "button",
  onClick,
  loading = false,
  disabled = false,
  variant = "primary",
  fullWidth = true,
  icon: Icon,
}) {
  const base =
    "flex items-center justify-center gap-2 rounded-xl font-semibold py-3 text-sm transition disabled:opacity-60 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#0B1526] text-white hover:bg-[#16233a]",
    secondary:
      "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    gold: "bg-[#8B6F1F] text-white hover:bg-[#7a611b]",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[base, variants[variant], fullWidth ? "w-full" : "px-6"].join(
        " ",
      )}
    >
      {loading ? "Please wait…" : children}
      {!loading && Icon && <Icon className="w-4 h-4" />}
    </button>
  );
}
