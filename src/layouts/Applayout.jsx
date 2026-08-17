import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <TopBar />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <main className="px-8 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}