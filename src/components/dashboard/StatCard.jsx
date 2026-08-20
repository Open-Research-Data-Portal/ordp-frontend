export default function StatCard({ label, value, icon: Icon, delay = 0, hint, trend, dark = false }) {
  if (dark) {
    return (
      <div
        className="bg-navy rounded-xl p-5 text-white shadow-sm animate-fade-in-up"
        style={{ animationDelay: `${delay}ms` }}
      >
        <p className="text-xs text-slate-400 tracking-wide font-medium mb-3">{label}</p>
        <div className="space-y-2">
          {Array.isArray(value) ? (
            value.map(({ k, v }) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-slate-400">{k}</span>
                <span className={`font-bold ${k === "Approval Rate" ? "text-gold" : ""}`}>{v}</span>
              </div>
            ))
          ) : (
            <div className="text-2xl font-bold">{value}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl p-5 shadow-sm border border-border hover:border-gold/30 hover:shadow-md transition-all duration-300 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 tracking-wide font-medium">{label}</span>
        <span className="w-8 h-8 rounded-lg bg-gold-light flex items-center justify-center text-gold">
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="text-2xl font-bold text-navy mt-2">{value}</div>
      {trend && <p className="text-xs text-gold mt-1 font-medium">{trend}</p>}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
