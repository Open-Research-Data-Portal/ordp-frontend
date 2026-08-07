import { ArrowRight, Database, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../layouts/Sidebar";
import TopBar from "../../layouts/TopBar";
import Button from "../../components/ui/Button";
import { useAuth } from "../../context/useAuth";

function getDisplayName(user) {
  const full =
    user?.full_name ??
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  return full || user?.username || user?.email || "";
}

export default function DashboardPage() {
  const navigate = useNavigate();
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
                  <h2 className="text-xl font-serif font-bold text-navy mb-2">
                    Welcome to your research dashboard
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    From here you can manage projects, submissions, and access university research
                    resources.
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <Button
                    variant="gold"
                    fullWidth={false}
                    icon={ArrowRight}
                    onClick={() => navigate("/data-upload")}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Data Upload
                    </span>
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth={false}
                    icon={ArrowRight}
                    onClick={() => navigate("/profile")}
                  >
                    <span className="inline-flex items-center gap-2">
                      <UserRound className="w-4 h-4" />
                      Profile
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
