import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { AuthProvider, useAuth, homeFor } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Loading } from "@/components/Shared";

const Landing = lazy(() => import("@/pages/Landing"));
const About = lazy(() => import("@/pages/About"));
const Login = lazy(() => import("@/pages/Login"));
const ResidentDashboard = lazy(() => import("@/pages/resident/Dashboard"));
const NewReport = lazy(() => import("@/pages/resident/NewReport"));
const MyReports = lazy(() => import("@/pages/resident/MyReports"));
const ResidentFinance = lazy(() => import("@/pages/resident/Finance"));
const ResidentCommunity = lazy(() => import("@/pages/resident/Community"));
const Profile = lazy(() => import("@/pages/resident/Profile"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminReports = lazy(() => import("@/pages/admin/Reports"));
const AdminResidents = lazy(() => import("@/pages/admin/Residents"));
const AdminFinance = lazy(() => import("@/pages/admin/Finance"));
const AdminAnalytics = lazy(() => import("@/pages/admin/Analytics"));
const AdminAI = lazy(() => import("@/pages/admin/AI"));
const MonthlyReport = lazy(() => import("@/pages/admin/MonthlyReport"));
const SuperAdmin = lazy(() => import("@/pages/SuperAdmin"));

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Memeriksa sesi Anda..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

const RESIDENT_ROUTES = [
  ["/resident", ResidentDashboard],
  ["/resident/report", NewReport],
  ["/resident/reports", MyReports],
  ["/resident/finance", ResidentFinance],
  ["/resident/community", ResidentCommunity],
  ["/resident/profile", Profile],
];

const ADMIN_ROUTES = [
  ["/admin", AdminDashboard],
  ["/admin/reports", AdminReports],
  ["/admin/residents", AdminResidents],
  ["/admin/finance", AdminFinance],
  ["/admin/analytics", AdminAnalytics],
  ["/admin/ai", AdminAI],
  ["/admin/reports/monthly", MonthlyReport],
];

export default function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-center" richColors />
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              {RESIDENT_ROUTES.map(([path, C]) => (
                <Route key={path} path={path} element={<Protected roles={["resident"]}><C /></Protected>} />
              ))}
              {ADMIN_ROUTES.map(([path, C]) => (
                <Route key={path} path={path} element={<Protected roles={["admin", "superadmin"]}><C /></Protected>} />
              ))}
              <Route path="/superadmin" element={<Protected roles={["superadmin"]}><SuperAdmin /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
      </ThemeProvider>
    </div>
  );
}
