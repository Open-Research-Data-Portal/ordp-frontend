import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import LoginPage from "./features/accounts/pages/Login.jsx";
import RegisterPage from "./features/accounts/pages/RegisterPage.jsx";
import VerifyEmailPage from "./features/accounts/pages/VerifyEmailPage.jsx";
import EmailVerifyConfirmPage from "./features/accounts/pages/EmailVerifyConfirmPage.jsx";
import ForgotPasswordPage from "./features/accounts/pages/ForgotPassword.jsx";
import CheckEmailPage from "./features/accounts/pages/CheckEmail.jsx";
import ResetPasswordPage from "./features/accounts/pages/ResetPassword.jsx";
import DashboardPage from "./pages/Dashboard/DashboardPage.jsx";
import ProfilePage from "./features/accounts/pages/ProfilePage.jsx";
import DataUploadPage from "./pages/DataUpload/DataUploadPage";
import ResearchInterestsOnboardingPage from "./features/accounts/pages/ResearchInterestsOnboardingPage.jsx";
import DatasetListPage from "./features/datasets/pages/DatasetListPage.jsx";
import ResearcherDashboardPage from "./features/datasets/pages/ResearcherDashboardPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";

function VerifyEmailRoute() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  if (uid && token) return <EmailVerifyConfirmPage />;
  return <VerifyEmailPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailRoute />} />
        <Route path="/verify-email/confirm" element={<EmailVerifyConfirmPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/research-interests-onboarding" element={<ResearchInterestsOnboardingPage />} />
        <Route path="/data-upload" element={<DataUploadPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/datasets" element={<DatasetListPage />} />
        <Route path="/researcher-dashboard" element={<ResearcherDashboardPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}