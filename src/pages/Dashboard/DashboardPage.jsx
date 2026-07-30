import Sidebar from "../../layouts/Sidebar";
import TopBar from "../../layouts/TopBar";

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex bg-[#F5F5F3]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title="Dashboard" user={{ name: "Dr. Abebe A." }} />
        <main className="flex-1 px-8 py-8">
          <div className="max-w-4xl">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-[#0B1526] mb-2">
                Welcome to your research dashboard
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Your email has been verified. From here you can manage projects, submissions,
                and access university research resources.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
