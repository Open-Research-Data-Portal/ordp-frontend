import TopNav from "./TopNav";
import AuthFooter from "./AuthFooter";

export default function AuthLayout({
  left,
  children,
  showChrome = false,
  variant = "login",
}) {
  const leftWidth = variant === "register" ? "md:w-[58%]" : "md:w-[58%]";
  const rightWidth = variant === "register" ? "md:w-[42%]" : "md:w-[42%]";

  const panels = (
    <div className="flex-1 flex flex-col md:flex-row min-h-0">
      <div
        className={`relative ${leftWidth} bg-[#0B1526] text-white flex flex-col justify-center px-10 py-16 md:py-20 overflow-hidden min-h-[280px] md:min-h-0`}
      >
        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle,white_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="relative z-10 max-w-lg mx-auto md:mx-0 w-full">{left}</div>
      </div>
      <div
        className={`${rightWidth} bg-[#F0F0EE] flex items-center justify-center px-6 py-12 md:py-16 min-h-[480px] md:min-h-screen`}
      >
        <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_40px_rgba(11,21,38,0.08)] border border-slate-100 p-8 flex flex-col justify-center my-auto">
          {children}
        </div>
      </div>
    </div>
  );

  if (!showChrome) {
    return <div className="min-h-screen w-full flex flex-col">{panels}</div>;
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      <TopNav />
      {panels}
      <AuthFooter />
    </div>
  );
}
