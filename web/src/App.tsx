import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Center, Loader } from "@mantine/core";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
// Kiosk pulls in the heavy html5-qrcode scanner — load it only when the route is opened.
const Kiosk = lazy(() => import("./pages/Kiosk"));
import Payroll from "./pages/Payroll";
import Salaries from "./pages/Salaries";
import Leave from "./pages/Leave";
import Reports from "./pages/Reports";
import Shifts from "./pages/Shifts";
import Settings from "./pages/Settings";
import Audit from "./pages/Audit";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="shifts" element={<Shifts />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="kiosk" element={
              <Suspense fallback={<Center h="60vh"><Loader /></Center>}><Kiosk /></Suspense>
            } />
            <Route path="payroll" element={<Payroll />} />
            <Route path="salaries" element={<Salaries />} />
            <Route path="leave" element={<Leave />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="audit" element={<Audit />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
