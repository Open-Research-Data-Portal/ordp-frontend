import { Link } from "react-router-dom";

export default function TopNav() {
  return (
    <header className="w-full bg-[#F7F7F5] border-b border-slate-200 px-8 py-4 flex items-center justify-between">
      <Link to="/login" className="text-lg font-bold text-[#0B1526]">
        AASTU Research Portal
      </Link>
      <nav className="flex items-center gap-6 text-sm text-slate-600">
        <Link to="/support" className="hover:text-[#0B1526]">Support</Link>
        <Link to="/academic-policy" className="hover:text-[#0B1526]">Academic Policy</Link>
      </nav>
    </header>
  );
}
