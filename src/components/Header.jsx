import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 bg-white border-b-[3px] border-navy">
      <Link to="/" className="flex items-center gap-2.5 text-navy font-bold no-underline">
        <span className="text-2xl">🦅</span>
        <span className="text-xl">AASTU Research Portal</span>
      </Link>
      <nav className="flex gap-8">
        <Link to="/datasets" className="text-base font-medium text-gray-500 no-underline hover:text-navy">Datasets</Link>
        <Link to="/datasets/contribute" className="text-base font-medium text-gray-500 no-underline hover:text-navy">Contribute Dataset</Link>
      </nav>
      <div className="flex items-center gap-5">
        <button type="button" className="text-xl" aria-label="Notifications">🔔</button>
        <div className="w-9 h-9 rounded-full bg-gray-200" aria-label="User menu" />
      </div>
    </header>
  );
}