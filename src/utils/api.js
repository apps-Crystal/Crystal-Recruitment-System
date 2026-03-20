/**
 * Backend URL — set VITE_GAS_URL in recruitment-app/.env
 * Development: http://localhost:3001
 * Production:  https://your-deployed-backend.com
 */
export const GAS_URL = import.meta.env.VITE_GAS_URL;

async function gasGet(params) {
  try {
    const qs = new URLSearchParams(params).toString();
    const r  = await fetch(`${GAS_URL}?${qs}`);
    if (!r.ok) return { success: false, rows: [] };
    return r.json();
  } catch {
    return { success: false, rows: [] };
  }
}

async function gasPost(body) {
  try {
    const r = await fetch(GAS_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    if (!r.ok) return { success: false, error: `Server error: HTTP ${r.status}` };
    let json;
    try {
      json = await r.json();
    } catch {
      return { success: false, error: "Backend returned non-JSON — is the server running?" };
    }
    return json;
  } catch (err) {
    return { success: false, error: err.message || "Network error — is the backend running on port 3001?" };
  }
}

/* ── Auth ── */
export async function apiLogin(email, password) {
  return gasGet({ action: "login", email, password });
}

/* ── Requisitions ── */
export async function getRequisitions(filters = {}) {
  return gasGet({ action: "getRequisitions", ...filters });
}

export async function createRequisition(data) {
  return gasPost({ action: "createRequisition", data });
}

export async function updateRequisitionStatus(req_id, status, remarks, approval_date, performed_by) {
  return gasPost({ action: "updateRequisitionStatus", req_id, status, remarks, approval_date, performed_by });
}

export async function closeRequisition(req_id, closed_date, performed_by) {
  return gasPost({ action: "closeRequisition", req_id, closed_date, performed_by });
}

export async function assignPOC(req_id, poc, performed_by) {
  return gasPost({ action: "assignPOC", req_id, poc, performed_by });
}

/* ── Users ── */
export async function getUsers() {
  return gasGet({ action: "getUsers" });
}

export async function createUser(data) {
  return gasPost({ action: "createUser", data });
}

export async function updateUserStatus(user_id, is_active) {
  return gasPost({ action: "updateUserStatus", user_id, is_active });
}

/* ── Audit Log ── */
export async function getAuditLog(req_id) {
  return gasGet({ action: "getAuditLog", req_id });
}

/* ── Drive PDF Storage ── */
export async function savePDFToDrive(req_id, position_title, pdf_base64) {
  return gasPost({ action: "savePDF", req_id, position_title, pdf_base64 });
}

/* ── Screening ── */
export async function getScreenings(req_id) {
  return gasGet({ action: "getScreenings", ...(req_id ? { req_id } : {}) });
}

export async function submitScreening(data) {
  return gasPost({ action: "submitScreening", data });
}

/* ── Interviews ── */
export async function getInterviews(params = {}) {
  return gasGet({ action: "getInterviews", ...params });
}

export async function submitInterview(data) {
  return gasPost({ action: "submitInterview", data });
}

/* ── Offer Approvals ── */
export async function getApprovals(params = {}) {
  return gasGet({ action: "getApprovals", ...params });
}

export async function submitApproval(data) {
  return gasPost({ action: "submitApproval", data });
}

/* ── CV Data Extraction — Module 2 helper ── */
export async function extractCVData(resume_base64) {
  return gasPost({ action: "extractCVData", resume_base64 });
}

/* ── Module 3 — AI Evaluation ── */
export async function getAIEvaluation(candidate_id) {
  return gasGet({ action: "getAIEvaluation", candidate_id });
}

/* ── Module 4 — HR Decision ── */
export async function getHRDecisionCandidates(params = {}) {
  return gasGet({ action: "getHRDecisionCandidates", ...params });
}
export async function getHRDecisionHistory() {
  return gasGet({ action: "getHRDecisionHistory" });
}

export async function submitHRDecision(data) {
  return gasPost({ action: "submitHRDecision", data });
}

/* ── Module 6 — Document Collection ── */
export async function getCandidateDocuments(candidate_id) {
  return gasGet({ action: "getCandidateDocuments", candidate_id });
}

export async function sendDocumentRequest(data) {
  return gasPost({ action: "sendDocumentRequest", data });
}

export async function updateDocumentStatus(data) {
  return gasPost({ action: "updateDocumentStatus", data });
}

export async function markDocsVerified(data) {
  return gasPost({ action: "markDocsVerified", data });
}

/* ── Module 8 — Onboarding ── */
export async function getOnboardingCandidates(params = {}) {
  return gasGet({ action: "getOnboardingCandidates", ...params });
}

export async function submitOnboarding(data) {
  return gasPost({ action: "submitOnboarding", data });
}

export async function updateOnboardingDay(data) {
  return gasPost({ action: "updateOnboardingDay", data });
}

export async function completeOnboarding(data) {
  return gasPost({ action: "completeOnboarding", data });
}

/* ── Candidate Profile Hub (Section 13) ── */
export async function getCandidates(params = {}) {
  return gasGet({ action: "getCandidates", ...params });
}

export async function getCandidateProfile(candidate_id) {
  return gasGet({ action: "getCandidateProfile", candidate_id });
}
