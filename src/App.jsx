import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import LoginPage from "./pages/Login/LoginPage";
import RegisterPage from "./pages/Register/RegisterPage";
import VerifyEmailPage from "./pages/Register/VerifyEmailPage";
import EmailVerifyConfirmPage from "./pages/Register/EmailVerifyConfirmPage";
import ForgotPasswordPage from "./pages/ForgotPassword/ForgotPasswordPage";
import CheckEmailPage from "./pages/ForgotPassword/CheckEmailPage";
import ResetPasswordPage from "./pages/ForgotPassword/ResetPasswordPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import ProfilePage from "./pages/Profile/ProfilePage";

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
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailRoute />} />
          <Route path="/verify-email/confirm" element={<EmailVerifyConfirmPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/check-email" element={<CheckEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
