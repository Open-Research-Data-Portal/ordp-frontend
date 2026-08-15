export default function Footer() {
  return (
    <footer className="flex flex-wrap items-start justify-between gap-3 px-8 py-8 bg-[#EFEDE7] mt-10">
      <div>
        <p className="text-lg font-bold text-navy mb-1.5">AASTU Research Portal</p>
        <p className="text-sm text-gray-500 m-0">
          © 2026 Addis Ababa Science and Technology University (AASTU). All Rights Reserved.
        </p>
      </div>
      <nav className="flex gap-6">
        <a href="/institutional-repository" className="text-sm font-medium text-gray-500 no-underline hover:text-navy">Institutional Repository</a>
        <a href="/research-policy" className="text-sm font-medium text-gray-500 no-underline hover:text-navy">Research Policy</a>
        <a href="/privacy-center" className="text-sm font-medium text-gray-500 no-underline hover:text-navy">Privacy Center</a>
        <a href="/contact-support" className="text-sm font-medium text-gray-500 no-underline hover:text-navy">Contact Support</a>
      </nav>
    </footer>
  );
}