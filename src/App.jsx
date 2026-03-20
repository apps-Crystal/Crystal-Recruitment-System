import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import LoginPage              from "./pages/LoginPage";
import DashboardPage          from "./pages/DashboardPage";
import RaiseRequisitionPage   from "./pages/RaiseRequisitionPage";
import AllRequisitionsPage    from "./pages/AllRequisitionsPage";
import ApproveRequisitionPage from "./pages/ApproveRequisitionPage";
import MyRequestsPage         from "./pages/MyRequestsPage";
import ScreeningPage          from "./pages/ScreeningPage";
import HRDecisionPage         from "./pages/HRDecisionPage";
import InterviewPage          from "./pages/InterviewPage";
import CandidatesPage         from "./pages/CandidatesPage";
import DocumentsPage          from "./pages/DocumentsPage";
import OfferApprovalPage      from "./pages/OfferApprovalPage";
import OnboardingPage         from "./pages/OnboardingPage";

/* SOP-HR-001 role groups */
const R = {
  raiseReq:     ["ta_head","senior_hr_exec","admin"],
  approveReq:   ["chro","ta_head","admin"],
  viewAll:      ["chro","ta_head","management","admin"],
  recruitment:  ["senior_hr_exec","ta_head","chro","admin"],
  interview:    ["senior_hr_exec","ta_head","admin"],
  candidates:   ["ta_head","chro","senior_hr_exec","admin"],
  offerApproval:["management","chro","admin"],
  onboarding:   ["senior_hr_exec","ta_head","chro","admin"],
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace/> : <LoginPage/>}/>
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              {/* Dashboard */}
              <Route path="/" element={<DashboardPage/>}/>

              {/* Module 1 — Job Requisition */}
              <Route path="/raise"          element={<ProtectedRoute roles={R.raiseReq}><RaiseRequisitionPage/></ProtectedRoute>}/>
              <Route path="/approve"        element={<ProtectedRoute roles={R.approveReq}><ApproveRequisitionPage/></ProtectedRoute>}/>
              <Route path="/requisitions"   element={<ProtectedRoute roles={R.viewAll}><AllRequisitionsPage/></ProtectedRoute>}/>
              <Route path="/my-requests"    element={<MyRequestsPage/>}/>

              {/* Module 2 — Candidate Screening & Entry */}
              <Route path="/screening"      element={<ProtectedRoute roles={R.recruitment}><ScreeningPage/></ProtectedRoute>}/>

              {/* Module 4 — HR Decision (after AI Evaluation) */}
              <Route path="/hr-decision"    element={<ProtectedRoute roles={R.recruitment}><HRDecisionPage/></ProtectedRoute>}/>

              {/* Module 5 — Interview */}
              <Route path="/interview"      element={<ProtectedRoute roles={R.interview}><InterviewPage/></ProtectedRoute>}/>

              {/* Section 13 — Candidate Profile Hub */}
              <Route path="/candidates"     element={<ProtectedRoute roles={R.candidates}><CandidatesPage/></ProtectedRoute>}/>

              {/* Module 6 — Document Collection */}
              <Route path="/documents"      element={<ProtectedRoute roles={R.recruitment}><DocumentsPage/></ProtectedRoute>}/>

              {/* Module 7 — Offer Approval & Release */}
              <Route path="/offer-approval" element={<ProtectedRoute roles={R.offerApproval}><OfferApprovalPage/></ProtectedRoute>}/>

              {/* Module 8 — Onboarding */}
              <Route path="/onboarding"     element={<ProtectedRoute roles={R.onboarding}><OnboardingPage/></ProtectedRoute>}/>

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
