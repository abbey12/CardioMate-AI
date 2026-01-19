import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminFacilities } from "./pages/admin/AdminFacilities";
import { AdminReports } from "./pages/admin/AdminReports";
import { AdminReport } from "./pages/admin/AdminReport";
import { AdminRevenue } from "./pages/admin/AdminRevenue";
import { AdminAnalytics } from "./pages/admin/AdminAnalytics";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { AdminCountryPricing } from "./pages/admin/AdminCountryPricing";
import { AdminAuditLogs } from "./pages/admin/AdminAuditLogs";
import { AdminPaymentOps } from "./pages/admin/AdminPaymentOps";
import { AdminOpsStatus } from "./pages/admin/AdminOpsStatus";
import { FacilityDashboard } from "./pages/facility/FacilityDashboard";
import { FacilityUpload } from "./pages/facility/FacilityUpload";
import { FacilityPatients } from "./pages/facility/FacilityPatients";
import { FacilityPatientHistory } from "./pages/facility/FacilityPatientHistory";
import { FacilityReport } from "./pages/facility/FacilityReport";
import { FacilitySettings } from "./pages/facility/FacilitySettings";
import { FacilityAnalytics } from "./pages/facility/FacilityAnalytics";
import { FacilityAllReports } from "./pages/facility/FacilityAllReports";
import { FacilityReferrals } from "./pages/facility/FacilityReferrals";
import { FacilityWallet } from "./pages/facility/FacilityWallet";

export function App() {
  const { isAuthenticated, isAdmin, isFacility } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            isAdmin ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <Navigate to="/facility/dashboard" replace />
            )
          ) : (
            <Login />
          )
        }
      />
      <Route path="/facility/login" element={<Navigate to="/login" replace />} />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Admin routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/facilities"
        element={
          <ProtectedRoute requireAdmin>
            <AdminFacilities />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute requireAdmin>
            <AdminReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports/:id"
        element={
          <ProtectedRoute requireAdmin>
            <AdminReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/revenue"
        element={
          <ProtectedRoute requireAdmin>
            <AdminRevenue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute requireAdmin>
            <AdminAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute requireAdmin>
            <AdminPaymentOps />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/ops"
        element={
          <ProtectedRoute requireAdmin>
            <AdminOpsStatus />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute requireAdmin>
            <AdminAuditLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute requireAdmin>
            <AdminSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/country-pricing"
        element={
          <ProtectedRoute requireAdmin>
            <AdminCountryPricing />
          </ProtectedRoute>
        }
      />

      {/* Facility routes */}
      <Route
        path="/facility/dashboard"
        element={
          <ProtectedRoute requireFacility>
            <FacilityDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facility/upload"
        element={
          <ProtectedRoute requireFacility>
            <FacilityUpload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facility/patients"
        element={
          <ProtectedRoute requireFacility>
            <FacilityPatients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facility/patients/:patientId"
        element={
          <ProtectedRoute requireFacility>
            <FacilityPatientHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facility/reports/:id"
        element={
          <ProtectedRoute requireFacility>
            <FacilityReport />
          </ProtectedRoute>
        }
      />
          <Route
            path="/facility/analytics"
            element={
              <ProtectedRoute requireFacility>
                <FacilityAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facility/referrals"
            element={
              <ProtectedRoute requireFacility>
                <FacilityReferrals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facility/reports"
            element={
              <ProtectedRoute requireFacility>
                <FacilityAllReports />
              </ProtectedRoute>
            }
          />
      <Route
        path="/facility/wallet"
        element={
          <ProtectedRoute requireFacility>
            <FacilityWallet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facility/settings"
        element={
          <ProtectedRoute requireFacility>
            <FacilitySettings />
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            isAdmin ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <Navigate to="/facility/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

