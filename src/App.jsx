import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage            from "./pages/LoginPage";
import DashboardPage        from "./pages/DashboardPage";
import RaiseRequisitionPage from "./pages/RaiseRequisitionPage";
import ApproveRequisitionPage from "./pages/ApproveRequisitionPage";
import MyRequestsPage       from "./pages/MyRequestsPage";
import ScreeningPage        from "./pages/ScreeningPage";
import InterviewPage        from "./pages/InterviewPage";
import OfferApprovalPage    from "./pages/OfferApprovalPage";

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace/> : <LoginPage/>}/>
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<DashboardPage/>}/>
              <Route path="/raise" element={<ProtectedRoute roles={["hr_manager","hr_executive","requester","admin"]}><RaiseRequisitionPage/></ProtectedRoute>}/>
              <Route path="/approve" element={<ProtectedRoute roles={["approver","admin"]}><ApproveRequisitionPage/></ProtectedRoute>}/>
              <Route path="/my-requests" element={<MyRequestsPage/>}/>
              <Route path="/requisitions" element={<DashboardPage/>}/>
              <Route path="/screening" element={<ProtectedRoute roles={["hr_manager","hr_executive","admin","recruitment_poc"]}><ScreeningPage/></ProtectedRoute>}/>
              <Route path="/interview" element={<ProtectedRoute roles={["hr_manager","hr_executive","admin","recruitment_poc"]}><InterviewPage/></ProtectedRoute>}/>
              <Route path="/offer-approval" element={<ProtectedRoute roles={["approver","hr_manager","admin"]}><OfferApprovalPage/></ProtectedRoute>}/>
              <Route path="*" element={<Navigate to="/" replace/>}/>
            </Routes>
          </Layout>
        </ProtectedRoute>
      }/>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes/>
      </AuthProvider>
    </BrowserRouter>
  );
}
