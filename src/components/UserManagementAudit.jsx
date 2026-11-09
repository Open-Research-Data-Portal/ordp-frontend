import { useEffect, useState } from "react";
import { getUserManagementAudit } from "../api/accessControl";

export default function UserManagementAudit() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getUserManagementAudit()
      .then((rows) => { if (active) setEvents(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (active) setError("Could not load user management activity."); });
    return () => { active = false; };
  }, []);

  return <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
    <h2 className="text-lg font-bold text-navy">Access and user activity</h2>
    <p className="mt-1 text-sm text-gray-600">Account, role, group, permission, and request decisions.</p>
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    {!error && !events.length && <p className="mt-4 text-sm text-gray-600">No activity to show.</p>}
    <div className="mt-4 divide-y divide-gray-100">
      {events.map((event) => <div key={event.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 text-sm">
        <div><strong className="text-navy">{event.action.replaceAll("_", " ").replaceAll(".", " ")}</strong>
          <span className="text-gray-600"> · {event.actor} · {event.target || "System"}</span>
          {event.detail && <span className="text-gray-500"> · {event.detail}</span>}
        </div>
        <time className="text-gray-500" dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleString()}</time>
      </div>)}
    </div>
  </section>;
}
