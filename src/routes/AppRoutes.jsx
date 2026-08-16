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

import ContributeDatasetPage from "../features/datasets/pages/ContributeDatasetPage.jsx";
import SubmissionSuccessPage from "../features/datasets/pages/SubmissionSuccessPage.jsx";
import DatasetListPage from "../features/datasets/pages/DatasetListPage.jsx";
import ResearcherDashboardPage from "../features/datasets/pages/ResearcherDashboardPage.jsx";
import DatasetDetailPage from "../features/datasets/pages/DatasetDetailPage";
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
      <Route path="/datasets" element={<BrowseDatasetsPage />} />

      {/* Dashboard */}
      <Route path="/dashboard" element={<ResearcherDashboardPage />} />

      {/* Profile */}
      <Route path="/profile" element={<ProfilePage />} />

      {/* Data upload request (researcher/uploader access) */}
      <Route path="/data-upload" element={<DataUploadPage />} />

      {/* Datasets */}
      <Route path="/my-datasets" element={<DatasetListPage />} />
      <Route path="/datasets/contribute" element={<ContributeDatasetPage />} />
      <Route path="/datasets/contribute/success" element={<SubmissionSuccessPage />} />
      <Route path="/datasets/:id" element={<DatasetDetailPage />} />

      {/* Catch-all — kept last on purpose */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}