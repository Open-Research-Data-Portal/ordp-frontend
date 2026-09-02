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
import DatasetViewPage from "../pages/DatasetViewPage";
import BookmarksPage from "../features/datasets/pages/BookmarksPage";

import { useAuth } from "../context/useAuth";
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

      {/* Public dataset browsing */}
      <Route path="/datasets" element={<BrowseDatasetsPage />} />
      <Route path="/datasets/:id" element={<DatasetViewPage />} />

      {/* Protected */}
      <Route path="/research-interests-onboarding" element={
        <ProtectedRoute><ResearchInterestsOnboardingPage /></ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardRouter /></ProtectedRoute>
      } />
      <Route path="/user-dashboard" element={
        <ProtectedRoute>
          <DashboardGuard expectedDashboard="/user-dashboard">
            <UserDashboardPage />
          </DashboardGuard>
        </ProtectedRoute>
      } />
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
      <Route path="/data-upload" element={
        <ProtectedRoute><DataUploadPage /></ProtectedRoute>
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
        <ProtectedRoute><ContributeDatasetPage /></ProtectedRoute>
      } />
      <Route path="/datasets/contribute/success" element={
        <ProtectedRoute><SubmissionSuccessPage /></ProtectedRoute>
      } />
      <Route path="/bookmarks" element={
        <ProtectedRoute><BookmarksPage /></ProtectedRoute>
      } />

      {/* Catch-all — kept last on purpose */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}