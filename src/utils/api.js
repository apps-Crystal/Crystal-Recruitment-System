/**
 * Paste your deployed GAS Web App URL here after deploying Code.gs
 * Deploy: Extensions → Apps Script → Deploy → New deployment
 *   Type: Web App | Execute as: Me | Access: Anyone
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
    // GAS doPost requires Content-Type: text/plain to avoid CORS preflight
    const r = await fetch(GAS_URL, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify(body),
    });
    if (!r.ok) return { success: false, error: `Server error: HTTP ${r.status}` };
    let json;
    try {
      json = await r.json();
    } catch {
      return { success: false, error: "GAS returned non-JSON (check deployment: Execute as Me, Access: Anyone)" };
    }
    return json;
  } catch (err) {
    return { success: false, error: err.message || "Network error — check your connection" };
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
