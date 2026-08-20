export default function AuthFooter() {
  return (
    <footer className="w-full bg-[#F7F7F5] border-t border-slate-200 px-8 py-5 flex items-center justify-between text-sm">
      <div>
        <p className="font-semibold text-[#0B1526]">AASTU</p>
        <p className="text-slate-400 text-xs mt-0.5">
          © 2024 AASTU University Research Office. All rights reserved.
        </p>
      </div>
      <div className="flex items-center gap-6 text-slate-500 text-xs">
        <a href="/ethics" className="hover:text-[#0B1526]">Ethics Committee</a>
        <a href="/data-governance" className="hover:text-[#0B1526]">Data Governance</a>
        <a href="/support" className="hover:text-[#0B1526]">Contact Support</a>
      </div>
    </footer>
  );
}
