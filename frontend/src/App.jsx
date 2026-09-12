import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import Activity from "./pages/Activity";
import AddEmployee from "./pages/AddEmployee";
import Attendance from "./pages/Attendance";
import Dashboard from "./pages/Dashboard";
import EmployeeImport from "./pages/EmployeeImport";
import Employees from "./pages/Employees";
import EmployeeProfile from "./pages/EmployeeProfile";
import Login from "./pages/Login";
import Notifications from "./pages/Notifications";
import Payments from "./pages/Payments";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import Reports from "./pages/Reports";
import Salary from "./pages/Salary";
import Settings from "./pages/Settings";
import SupervisorAttendance from "./pages/SupervisorAttendance";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import AddFirm from "./pages/AddFirm";
import EditFirm from "./pages/EditFirm";
import BackupRestore from "./pages/BackupRestore";
import { EmployeeDashboard, MyAttendance, MyProfile } from "./pages/EmployeePortal";
import LeaveManagement from "./pages/LeaveManagement";
import { useFirm } from "./context/FirmContext";
import ForgotPassword from "./pages/ForgotPassword"; // adjust path to match your project
import ResetPassword from "./pages/ResetPassword";


const Page = ({ children }) => <Layout>{children}</Layout>;
function LeavePage({ portal }) {
  const { user } = useAuth();
  const { selectedFirm } = useFirm();
  return <Page><LeaveManagement key={`${portal}:${user?.id || user?.username}:${selectedFirm?.code || ""}`} portal={portal} /></Page>;
}

function HomeRedirect() {
  const { user } = useAuth();
  return (
    <Navigate
      to={user?.role === "ADMIN" ? "/dashboard" : user?.role === "EMPLOYEE" ? "/employee/dashboard" : "/supervisor-dashboard"}
      replace
    />
  );
}

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/employee" element={<Navigate to="/employee/dashboard" replace />} />
          <Route path="/employee/dashboard" element={<Page><EmployeeDashboard /></Page>} />
          <Route path="/employee/attendance" element={<Page><MyAttendance /></Page>} />
          <Route path="/employee/profile" element={<Page><MyProfile /></Page>} />
          <Route path="/employee/leaves" element={<LeavePage portal="employee" />} />
          <Route path="/profile" element={<Page><Profile /></Page>} />
          <Route path="/notifications" element={<Page><Notifications /></Page>} />
          <Route path="/employees" element={<Page><Employees /></Page>} />
          <Route path="/employees/:id" element={<Page><EmployeeProfile /></Page>} />
          <Route path="/my-profile" element={<EmployeeProfile />} />
          <Route path="/supervisor-dashboard" element={<Page><SupervisorDashboard /></Page>} />
          <Route path="/supervisor-attendance" element={<Page><SupervisorAttendance /></Page>} />
          <Route path="/supervisor/leaves" element={<LeavePage portal="supervisor" />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SUPERVISOR"]} />}>
          <Route path="/employees/add" element={<Page><AddEmployee /></Page>} />
        </Route>

        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="/register" element={<Page><Register /></Page>} />
          <Route path="/dashboard" element={<Page><Dashboard /></Page>} />
          <Route path="/leaves" element={<LeavePage portal="admin" />} />
          <Route path="/employees/:id/edit" element={<Page><AddEmployee /></Page>} />
          <Route path="/attendance" element={<Page><Attendance /></Page>} />
          <Route path="/payments" element={<Page><Payments /></Page>} />
          <Route path="/salary" element={<Page><Salary /></Page>} />
          <Route path="/reports" element={<Page><Reports /></Page>} />
          <Route path="/activity" element={<Page><Activity /></Page>} />
          <Route path="/settings" element={<Page><Settings /></Page>} />
          <Route path="/settings/employee-import" element={<Page><EmployeeImport /></Page>} />
          <Route path="/settings/backup" element={<Page><BackupRestore /></Page>} />
          <Route path="/firms/add" element={<Page><AddFirm /></Page>} />
          <Route path="/firms/edit/:id" element={<Page><EditFirm /></Page>} />
          


        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;
