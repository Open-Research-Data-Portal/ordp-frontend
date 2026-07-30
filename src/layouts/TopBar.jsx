import { Search } from "lucide-react";

export default function TopBar({ title, user }) {
  const initials = (user?.name || "Dr. Abebe A.")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex items-center justify-between px-8 py-5 bg-[#F5F5F3] border-b border-slate-200">
      <h1 className="text-xl font-serif font-bold text-[#0B1526]">{title}</h1>
      <div className="flex items-center gap-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search resources..."
            className="pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-[#F7F7F5]
                       focus:outline-none focus:ring-2 focus:ring-[#0B1526]/15 w-64"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-[#0B1526] text-white text-xs font-bold
                            flex items-center justify-center">
            {initials}
          </span>
          <span className="text-sm font-medium text-slate-700">{user?.name || "Dr. Abebe A."}</span>
        </div>
      </div>
    </header>
  );
}
