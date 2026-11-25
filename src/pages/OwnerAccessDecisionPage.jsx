import { Navigate, useParams, useSearchParams } from "react-router-dom";

/**
 * Legacy owner/share decision URLs soft-redirect into Access Management V2.
 */
export default function OwnerAccessDecisionPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const reqId =
    params.id ||
    params.requestId ||
    searchParams.get("request_id") ||
    searchParams.get("id");

  if (reqId) {
    return <Navigate to={`/access-management/requests/${reqId}`} replace />;
  }
  return <Navigate to="/access-management?tab=Access%20Requests" replace />;
}
