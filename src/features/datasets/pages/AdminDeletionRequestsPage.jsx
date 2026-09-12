import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import * as datasetsApi from "../hooks/datasetsApi";

export default function AdminDeletionRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await datasetsApi.getAdminDeletionQueue?.() || [];
        const list = Array.isArray(data) ? data : (data?.results || []);
        if (!cancelled) setRequests(list);
      } catch (err) {
        if (!cancelled) setError("Failed to load deletion requests.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <DashboardShell title="Dataset Deletion Requests" subtitle="Manage and review dataset deletion requests across the platform.">
      <div className="p-8 lg:p-10 bg-white min-h-full rounded-2xl border border-[#E3E1DA]">
        <button
          type="button"
          onClick={() => navigate("/admin-dashboard")}
          className="mb-4 inline-flex items-center text-xs font-semibold text-gray-500 hover:text-navy transition-colors"
        >
          ← Back to admin dashboard
        </button>
        <h1 className="text-3xl font-serif font-bold text-navy mb-6">Deletion Requests</h1>
        {error && <p className="text-danger mb-4">{error}</p>}
        {loading && <p className="text-gray-500">Loading deletion requests...</p>}
        {!loading && requests.length === 0 && (
          <div className="bg-[#F7F6F2] rounded-xl p-10 text-center border border-[#E3E1DA]">
            <p className="text-gray-500">No pending deletion requests.</p>
          </div>
        )}
        {!loading && requests.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E3E1DA] text-xs font-semibold text-gray-500 uppercase">
                  <th className="py-3 px-4">Dataset</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-navy">{req.dataset_title || req.dataset?.title || "Dataset"}</td>
                    <td className="py-3 px-4 text-gray-600">{req.requested_by || req.user || "User"}</td>
                    <td className="py-3 px-4 text-gray-600">{req.status || "Pending"}</td>
                    <td className="py-3 px-4 text-gray-500">{req.created_at ? new Date(req.created_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
