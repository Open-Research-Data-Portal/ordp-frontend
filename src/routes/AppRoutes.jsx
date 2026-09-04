import { Navigate, Route, Routes, useSearchParams } from "react-router-dom";

import LandingPage from "../pages/LandingPage.jsx";
import LoginPage from "../features/accounts/pages/Login.jsx";
import RegisterPage from "../features/accounts/pages/RegisterPage.jsx";
import VerifyEmailPage from "../features/accounts/pages/VerifyEmailPage.jsx";
import EmailVerifyConfirmPage from "../features/accounts/pages/EmailVerifyConfirmPage.jsx";
import ForgotPasswordPage from "../features/accounts/pages/ForgotPassword.jsx";
import CheckEmailPage from "../features/accounts/pages/CheckEmail.jsx";
import ResetPasswordPage from "../features/accounts/pages/ResetPassword.jsx";
import ProfilePage from "../features/accounts/pages/ProfilePage.jsx";
import ResearchInterestsOnboardingPage from "../features/accounts/pages/ResearchInterestsOnboardingPage.jsx";

import DashboardRouter from "../pages/Dashboard/DashboardRouter.jsx";

import ContributeDatasetPage from "../features/datasets/pages/ContributeDatasetPage.jsx";
import DatasetManagementPage from "../features/datasets/pages/DatasetManagementPage.jsx";
import SubmissionSuccessPage from "../features/datasets/pages/SubmissionSuccessPage.jsx";
import DatasetListPage from "../features/datasets/pages/DatasetListPage.jsx";
import ResearcherDashboardPage from "../features/datasets/pages/ResearcherDashboardPage.jsx";
import AdminDashboardPage from "../features/datasets/pages/AdminDashboardPage.jsx";
import AdminAuditLogPage from "../features/datasets/pages/AdminAuditLogPage.jsx";
import ReviewerDashboardPage from "../features/datasets/pages/ReviewerDashboardPage.jsx";
import DatasetDetailPage from "../features/datasets/pages/Datasetdetailpage.jsx";
import BrowseDatasetsPage from "../pages/BrowseDatasetsPage.jsx";
import DatasetViewPage from "../pages/DatasetViewPage";
import BookmarksPage from "../features/datasets/pages/BookmarksPage";
import NotificationsPage from "../pages/NotificationsPage";

import { useAuth } from "../context/useAuth";
import { isProfileComplete } from "../utils/userRoles";
import DashboardGuard from "./DashboardGuard.jsx";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F3] text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Same as ProtectedRoute, plus a profile-completion check. Used for every
// route that leads into the dataset-upload wizard, so it can't be reached
// by direct URL, back button, or bookmark while the profile is incomplete —
// only the button-hiding on the dashboard isn't enough on its own.
function ProfileCompleteRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F3] text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isProfileComplete(user)) {
    return <Navigate to="/researcher-dashboard?incomplete=1" replace />;
  }

  return children;
}

function VerifyEmailRoute() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  if (token) return <EmailVerifyConfirmPage />;
  return <VerifyEmailPage />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailRoute />} />
      <Route path="/verify-email/confirm" element={<EmailVerifyConfirmPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/set-password" element={<ResetPasswordPage />} />
      <Route path="/activate" element={<ResetPasswordPage />} />

      {/* Public dataset browsing */}
      <Route path="/datasets" element={<BrowseDatasetsPage />} />
      <Route path="/datasets/:id" element={
        <ProtectedRoute><DatasetViewPage /></ProtectedRoute>
      } />

      {/* Protected */}
      <Route path="/research-interests-onboarding" element={
        <ProtectedRoute><ResearchInterestsOnboardingPage /></ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardRouter /></ProtectedRoute>
      } />
      {/* /user-dashboard no longer exists as its own page — redirect any
          old links/bookmarks straight to the single dashboard. */}
      <Route path="/user-dashboard" element={<Navigate to="/researcher-dashboard" replace />} />
      <Route path="/researcher-dashboard" element={
        <ProtectedRoute>
          <DashboardGuard expectedDashboard="/researcher-dashboard">
            <ResearcherDashboardPage />
          </DashboardGuard>
        </ProtectedRoute>
      } />
      <Route path="/reviewer-dashboard" element={
        <ProtectedRoute><ReviewerDashboardPage /></ProtectedRoute>
      } />
      <Route path="/admin-dashboard" element={
        <ProtectedRoute><AdminDashboardPage /></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute><ProfilePage /></ProtectedRoute>
      } />
      <Route path="/my-datasets" element={
        <ProtectedRoute><DatasetListPage /></ProtectedRoute>
      } />
      <Route path="/my-datasets/:id" element={
        <ProtectedRoute><DatasetDetailPage /></ProtectedRoute>
      } />
      <Route path="/projects" element={
        <ProtectedRoute><DatasetManagementPage /></ProtectedRoute>
      } />
      <Route path="/submissions" element={
        <ProtectedRoute><DatasetManagementPage /></ProtectedRoute>
      } />
      <Route path="/submissions/new" element={
        <ProtectedRoute><DatasetManagementPage /></ProtectedRoute>
      } />
      <Route path="/datasets/contribute" element={
        <ProfileCompleteRoute><ContributeDatasetPage /></ProfileCompleteRoute>
      } />
      <Route path="/datasets/contribute/success" element={
        <ProtectedRoute><SubmissionSuccessPage /></ProtectedRoute>
      } />
      <Route path="/bookmarks" element={
        <ProtectedRoute><BookmarksPage /></ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute><NotificationsPage /></ProtectedRoute>
      } />

      {/* Catch-all — kept last on purpose */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}