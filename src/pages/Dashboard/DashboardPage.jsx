import Sidebar from "../../layouts/Sidebar";
import TopBar from "../../layouts/TopBar";
import { useAuth } from "../../context/useAuth";

function getDisplayName(user) {
  const full =
    user?.full_name ??
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  return full || user?.username || user?.email || "";
}

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex bg-[#F5F5F3]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title="Dashboard" user={{ name: getDisplayName(user) }} />
        <main className="flex-1 px-8 py-8">
          <div className="max-w-4xl">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#0B1526] mb-2">
                    Welcome to your research dashboard
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Your email has been verified. From here you can manage projects, submissions,
                    and access university research resources.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}