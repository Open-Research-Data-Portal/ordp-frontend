import { Link } from "react-router-dom";
import logo from "../../../assets/aastulogo.png";

export default function AuthFooter() {
  return (
    <footer className="border-t border-border bg-white w-full">
      <div className="max-w-7xl mx-auto px-6 py-8 sm:px-8">
        <blockquote className="mb-7 max-w-2xl border-l-2 border-gold pl-4 text-sm italic leading-relaxed text-slate-600">
          “Every dataset here was accessioned by the researcher who created it — searchable,
          citable, and open to the next person who needs it.”
          <cite className="mt-2 block text-xs font-semibold not-italic tracking-wide text-gold-dark">
            AASTU Open Research Data Portal
          </cite>
        </blockquote>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <img src={logo} alt="AASTU" className="h-9 w-9 object-contain" />
            <div>
              <p className="text-sm font-serif font-bold text-navy">
                AASTU Open Research Data Portal
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Addis Ababa Science and Technology University
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs text-gray-500">
            <Link to="/datasets" className="hover:text-navy">Browse Datasets</Link>
            <Link to="/datasets/contribute" className="hover:text-navy">Contribute</Link>
            <a href="/ethics" className="hover:text-navy">Ethics Committee</a>
            <a href="/data-governance" className="hover:text-navy">Data Governance</a>
            <a href="/support" className="hover:text-navy">Contact Support</a>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-6 text-center sm:text-left">
          © {new Date().getFullYear()} Addis Ababa Science and Technology University. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
