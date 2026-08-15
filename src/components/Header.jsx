import { Link } from "react-router-dom";
import logo from "../assets/aastulogo.png";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 bg-white border-b-[3px] border-navy">
      <Link to="/" className="flex items-center gap-2.5 text-navy font-bold no-underline">
        <img src={logo} alt="AASTU" className="w-8 h-8 object-contain" />
        <span className="text-xl">AASTU Research Portal</span>
      </Link>
      <nav className="flex gap-8">
        <Link to="/datasets" className="text-base font-medium text-gray-500 no-underline hover:text-navy">Datasets</Link>
        <Link to="/datasets/contribute" className="text-base font-medium text-gray-500 no-underline hover:text-navy">Contribute Dataset</Link>
      </nav>
      <div className="flex items-center gap-5">
        <button type="button" className="text-xl" aria-label="Notifications">🔔</button>
        <Link to="/profile" className="w-9 h-9 rounded-full bg-gray-200" aria-label="Profile page" />
      </div>
    </header>
  );
}