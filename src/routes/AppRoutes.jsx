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
import ReviewerDashboardPage from "../features/datasets/pages/ReviewerDashboardPage.jsx";
import UserDashboardPage from "../features/datasets/pages/UserDashboardPage.jsx";
import DatasetDetailPage from "../features/datasets/pages/Datasetdetailpage.jsx";
import BrowseDatasetsPage from "../pages/BrowseDatasetsPage.jsx";
import DatasetViewPage from "../pages/DatasetViewPage";
import BookmarksPage from "../features/datasets/pages/BookmarksPage";

function VerifyEmailRoute() {
  const [searchParams] = useSearchParams();

  // The backend's verification emails link to
  //   {FRONTEND_URL}/verify-email?token=<uuid>
  // (confirmed from ordp-backend apps/accounts/views.py RegisterView), so the
  // presence of the `token` query param means the user clicked the link in
  // their email → show the confirming page. The bare /verify-email path
  // (right after registration) is the "check your email" page.
  const token = searchParams.get("token");

  if (token) return <EmailVerifyConfirmPage />;
  return <VerifyEmailPage />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailRoute />} />
      <Route path="/verify-email/confirm" element={<EmailVerifyConfirmPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Onboarding */}
      <Route path="/research-interests-onboarding" element={<ResearchInterestsOnboardingPage />} />

      {/* Dashboards — role-specific */}
      <Route path="/dashboard" element={<DashboardRouter />} />
      <Route path="/user-dashboard" element={<UserDashboardPage />} />
      <Route path="/researcher-dashboard" element={<ResearcherDashboardPage />} />
      <Route path="/reviewer-dashboard" element={<ReviewerDashboardPage />} />
      <Route path="/admin-dashboard" element={<AdminDashboardPage />} />

      {/* Profile */}
      <Route path="/profile" element={<ProfilePage />} />

      {/* Datasets — public browsing */}
      <Route path="/datasets" element={<BrowseDatasetsPage />} />
      <Route path="/datasets/:id" element={<DatasetViewPage />} />

      {/* Datasets — the researcher's own (upload/draft/manage) */}
      <Route path="/my-datasets" element={<DatasetListPage />} />
      <Route path="/my-datasets/:id" element={<DatasetDetailPage />} />
      <Route path="/projects" element={<DatasetManagementPage />} />
      <Route path="/submissions" element={<DatasetManagementPage />} />
      <Route path="/submissions/new" element={<DatasetManagementPage />} />
      <Route path="/datasets/contribute" element={<ContributeDatasetPage />} />
      <Route path="/datasets/contribute/success" element={<SubmissionSuccessPage />} />
      <Route path="/bookmarks" element={<BookmarksPage />} />

      {/* Catch-all — kept last on purpose */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}