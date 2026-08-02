import logo from "../../../assets/aastulogo.png";

/**
 * Split-card layout used on check-email, verify-email, and reset-password pages.
 */
export default function AuthSplitCard({
  sidebarTitle = "Research Excellence",
  sidebarSubtitle = "Addis Ababa Science & Technology University Research Portal",
  children,
  logoSize = "large",
}) {
  const isXLarge = logoSize === "xlarge";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F0F0EE] px-4 py-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-[0_8px_40px_rgba(11,21,38,0.1)] overflow-hidden flex flex-col md:flex-row">
        <div className="md:w-[38%] bg-[#0B1526] text-white p-8 md:p-10 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[300px]">
          <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="relative z-10">
            <div
              className={`bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                isXLarge ? "w-44 h-44 p-5" : "w-28 h-28 p-3"
              }`}
            >
              <img
                src={logo}
                alt="AASTU"
                className={`object-contain ${isXLarge ? "w-36 h-36" : "w-20 h-20"}`}
              />
            </div>
            <h2 className="text-lg font-bold mb-2">{sidebarTitle}</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-[220px] mx-auto">
              {sidebarSubtitle}
            </p>
          </div>
        </div>

        <div className="md:w-[62%] p-8 md:p-12 flex flex-col items-center text-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
