import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth.js";
import { ToastProvider } from "@/hooks/useToast.js";
import { ProtectedRoute, RedirectIfAuthenticated } from "@/components/auth/ProtectedRoute.js";

// Públicas
import LandingPage from "@/pages/Landing.js";
import LoginPage from "@/pages/auth/Login.js";
import RegisterPage from "@/pages/auth/Register.js";
import ForgotPasswordPage from "@/pages/auth/ForgotPassword.js";
import ResetPasswordPage from "@/pages/auth/ResetPassword.js";
import VerifyEmailPage from "@/pages/auth/VerifyEmail.js";

// Privadas
import DashboardPage from "@/pages/Dashboard.js";
import ProjectsPage from "@/pages/Projects.js";
import ProjectDetailPage from "@/pages/ProjectDetail.js";
import NewResearchPage from "@/pages/research/NewResearch.js";
import ResearchListPage from "@/pages/research/ResearchList.js";
import ResearchDetailPage from "@/pages/research/ResearchDetail.js";
import SourceDetailPage from "@/pages/research/SourceDetail.js";
import ValidatePage from "@/pages/validation/Validate.js";
import BulkValidatePage from "@/pages/validation/BulkValidate.js";
import ValidationDetailPage from "@/pages/validation/ValidationDetail.js";
import LibraryPage from "@/pages/Library.js";
import CitationsPage from "@/pages/Citations.js";
import MatrixPage from "@/pages/Matrix.js";
import MatrixDetailPage from "@/pages/MatrixDetail.js";
import HistoryPage from "@/pages/History.js";
import SettingsPage from "@/pages/Settings.js";

// Administração
import { AdminLayout } from "@/pages/admin/AdminLayout.js";
import { AdminOverviewPage } from "@/pages/admin/AdminOverview.js";
import { AdminUsersPage, AdminResearchPage, AdminValidationPage } from "@/pages/admin/AdminTables.js";
import { AdminProvidersPage, AdminUsagePage } from "@/pages/admin/AdminProviders.js";
import { AdminLogsPage } from "@/pages/admin/AdminLogs.js";
import { AdminSettingsPage } from "@/pages/admin/AdminSettings.js";

import NotFoundPage from "@/pages/NotFound.js";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

export default function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Públicas */}
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/login"
                element={
                  <RedirectIfAuthenticated>
                    <LoginPage />
                  </RedirectIfAuthenticated>
                }
              />
              <Route
                path="/register"
                element={
                  <RedirectIfAuthenticated>
                    <RegisterPage />
                  </RedirectIfAuthenticated>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <RedirectIfAuthenticated>
                    <ForgotPasswordPage />
                  </RedirectIfAuthenticated>
                }
              />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />

              {/* Privadas */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/research/new" element={<NewResearchPage />} />
                <Route path="/research" element={<ResearchListPage />} />
                <Route path="/research/:id" element={<ResearchDetailPage />} />
                <Route path="/research/source/:id" element={<SourceDetailPage />} />
                <Route path="/validate" element={<ValidatePage />} />
                <Route path="/validate/bulk" element={<BulkValidatePage />} />
                <Route path="/validate/:id" element={<ValidationDetailPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/citations" element={<CitationsPage />} />
                <Route path="/matrix" element={<MatrixPage />} />
                <Route path="/matrix/:id" element={<MatrixDetailPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Administração (apenas role=admin) */}
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="research" element={<AdminResearchPage />} />
                  <Route path="validation" element={<AdminValidationPage />} />
                  <Route path="providers" element={<AdminProvidersPage />} />
                  <Route path="usage" element={<AdminUsagePage />} />
                  <Route path="logs" element={<AdminLogsPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
