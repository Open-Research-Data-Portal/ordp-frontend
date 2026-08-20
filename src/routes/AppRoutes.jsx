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

import DataUploadPage from "../pages/DataUpload/DataUploadPage.jsx";
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

function VerifyEmailRoute() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  if (uid && token) return <EmailVerifyConfirmPage />;
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

      {/* Data upload request (researcher/uploader access) */}
      <Route path="/data-upload" element={<DataUploadPage />} />

      {/* Datasets */}
      <Route path="/datasets" element={<BrowseDatasetsPage />} />
      <Route path="/my-datasets" element={<DatasetListPage />} />
      <Route path="/projects" element={<DatasetManagementPage />} />
      <Route path="/submissions" element={<DatasetManagementPage />} />
      <Route path="/submissions/new" element={<DatasetManagementPage />} />
      <Route path="/datasets/contribute" element={<ContributeDatasetPage />} />
      <Route path="/datasets/contribute/success" element={<SubmissionSuccessPage />} />
      <Route path="/datasets/:id" element={<DatasetDetailPage />} />

      {/* Catch-all — kept last on purpose */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
