import { Link, useSearchParams } from "react-router-dom";
import { MailCheck, ArrowLeft } from "lucide-react";
import AuthSplitCard from "../components/AuthSplitCard";

/**
 * Invite-sent page — shown right after an admin creates a reviewer in the
 * admin panel. Confirms that a "create your password" email is on its way to
 * the new reviewer's inbox.
 */
export default function InviteSentPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const fullName = searchParams.get("full_name") || "";

  return (
    <AuthSplitCard logoSize="xlarge" sidebarTitle="Reviewer Invitation Sent">
      <div className="w-16 h-16 rounded-full bg-[#F5C453]/25 flex items-center justify-center mb-5">
        <MailCheck className="w-9 h-9 text-[#B8860B]" strokeWidth={2} />
      </div>
      <h1 className="text-2xl font-bold text-[#0B1526] mb-3">
        Invitation sent
      </h1>
      <p className="text-sm text-slate-500 mb-8 leading-relaxed max-w-sm">
        {fullName ? `${fullName} will receive` : "The reviewer will receive"} an
        email at{" "}
        {email ? (
          <span className="font-medium text-slate-700">{email}</span>
        ) : (
          "their inbox"
        )}{" "}
        with a secure link to create their password. Once they set it, they can
        sign in and start reviewing datasets.
      </p>

      <div className="w-full max-w-sm border-t border-slate-100 pt-6">
        <p className="text-sm text-slate-500 mb-2">
          Didn&apos;t arrive? Double-check the email address is correct, then ask
          the reviewer to check their spam folder.
        </p>
      </div>

      <Link
        to="/admin-dashboard?tab=users"
        className="mt-8 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0B1526] transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to user management
      </Link>
    </AuthSplitCard>
  );
}