import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRequisitions, updateRequisitionStatus } from "../utils/api";

const DECISIONS = [
  { value: "Approved",          label: "Approve",         bg: "var(--color-success)", color: "#fff" },
  { value: "Rejected",          label: "Reject",          bg: "var(--color-danger)",  color: "#fff" },
  { value: "Changes Requested", label: "Request Changes", bg: "var(--color-warning)", color: "#fff" },
];


function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)", fontSize: 10 }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{value || "—"}</span>
    </div>
  );
}

export default function ApproveRequisitionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requisitions, setRequisitions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPending(); }, []);

  async function loadPending() {
    setLoading(true);
    const res = await getRequisitions();
    if (res?.rows) {
      setRequisitions(res.rows.filter(r => String(r.status).trim() === "Pending Approval"));
    }
    setLoading(false);
  }

  async function handleDecision(e) {
    e.preventDefault();
    if (!decision || !selected) return;
    setSaving(true);
    const approval_date = decision === "Approved" ? new Date().toLocaleDateString("en-IN") : "";
    await updateRequisitionStatus(selected.req_id, decision, remarks, approval_date);
    setSaving(false);
    setDone({ req_id: selected.req_id, decision });
    setSelected(null); setDecision(""); setRemarks("");
    await loadPending();
  }

  /* ── Done screen ── */
  if (done) return (
    <div>
      <div className="sticky top-0 z-10 flex items-center px-3 sm:px-6" style={{ background: "var(--color-primary-900)", borderBottom: "1px solid rgba(255,255,255,0.07)", height: 56 }}>
        <h1 className="text-sm font-bold text-white">Decision Recorded</h1>
      </div>
      <div className="flex items-center justify-center p-4 sm:p-8" style={{ minHeight: "calc(100vh - 56px)" }}>
        <div className="enterprise-card p-8 sm:p-10 text-center max-w-md w-full">
          <div className="text-4xl mb-4">{done.decision === "Approved" ? "✅" : done.decision === "Rejected" ? "❌" : "🔄"}</div>
          <h2 className="text-lg font-bold mb-2 font-mono" style={{ color: "var(--color-primary-700)" }}>{done.req_id}</h2>
          <p className="text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
            Status updated to <strong>{done.decision}</strong>
          </p>
          {done.decision === "Approved" && (
            <p className="text-xs mb-4" style={{ color: "var(--color-success)" }}>TAT tracking has started from today's date.</p>
          )}
          <div className="flex gap-3 justify-center mt-4">
            <button onClick={() => setDone(null)} className="h-8 px-4 text-xs font-semibold rounded-sm" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", cursor: "pointer" }}>
              Review Another
            </button>
            <button onClick={() => navigate("/")} className="h-8 px-4 text-xs font-semibold rounded-sm text-white" style={{ background: "var(--color-primary-800)", border: "none", cursor: "pointer" }}>
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-3 sm:px-6" style={{ background: "var(--color-primary-900)", borderBottom: "1px solid rgba(255,255,255,0.07)", height: 56 }}>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white leading-tight">Approve Requisitions</h1>
          <p className="text-xs hidden sm:block" style={{ color: "rgba(255,255,255,0.45)" }}>
            {requisitions.length} pending · Approver: {user?.name}
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-sm flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}
        >
          ← Back
        </button>
      </div>

      <div className="p-3 md:p-6">
        {loading ? (
          <div className="enterprise-card p-10 sm:p-12 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
            <svg className="animate-spin inline mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            Loading pending approvals…
          </div>
        ) : requisitions.length === 0 ? (
          <div className="enterprise-card p-10 sm:p-12 text-center">
            <div className="text-3xl mb-3">🎉</div>
            <p className="font-semibold" style={{ color: "var(--color-success)" }}>All caught up! No pending approvals.</p>
          </div>
        ) : (
          /* Stacked on mobile, side-by-side on lg+ */
          <div className="flex flex-col lg:flex-row gap-4">

            {/* ── Requisition list ── */}
            <div
              className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-2 overflow-y-auto custom-scrollbar"
              style={{ maxHeight: "calc(50vh - 56px)", minHeight: "10rem" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest px-1 mb-0.5" style={{ color: "var(--color-text-secondary)", letterSpacing: "0.08em" }}>
                Select Requisition
                <span className="ml-1.5 normal-case font-medium" style={{ fontSize: 10 }}>({requisitions.length} pending)</span>
              </p>
              {requisitions.map(r => {
                const isActive = selected?.req_id === r.req_id;
                return (
                  <button
                    key={r.req_id}
                    onClick={() => { setSelected(r); setDecision(""); setRemarks(""); }}
                    className="text-left rounded-sm transition-all p-3 w-full"
                    style={{
                      background: "var(--color-surface)",
                      border: `1px solid ${isActive ? "var(--color-primary-600)" : "var(--color-border)"}`,
                      boxShadow: isActive ? "0 0 0 1px var(--color-primary-600)" : "none",
                      cursor: "pointer",
                    }}
                  >
                    <div className="font-mono text-xs font-bold mb-0.5" style={{ color: "var(--color-primary-700)" }}>{r.req_id}</div>
                    <div className="text-sm font-semibold leading-tight mb-0.5" style={{ color: "var(--color-text-primary)" }}>{r.position_title}</div>
                    <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{r.department} · {r.location}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{r.total_nos} position(s) · {r.raised_at}</div>
                  </button>
                );
              })}
            </div>

            {/* ── Detail + Decision panel ── */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              {!selected ? (
                <div
                  className="enterprise-card flex items-center justify-center text-sm py-16"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <span className="hidden lg:inline">← </span>Select a requisition to review
                </div>
              ) : (
                <>
                  {/* Details card */}
                  <div className="enterprise-card overflow-hidden">
                    <div
                      className="text-xs font-bold uppercase tracking-widest px-4 py-2.5"
                      style={{ background: "var(--color-primary-50)", borderBottom: "1px solid var(--color-border)", color: "var(--color-primary-700)", letterSpacing: "0.08em" }}
                    >
                      Requisition Details — {selected.req_id}
                    </div>
                    <div className="p-3 md:p-4 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                      <DetailRow label="Position"     value={selected.position_title} />
                      <DetailRow label="Department"   value={selected.department} />
                      <DetailRow label="Location"     value={selected.location} />
                      <DetailRow label="Total Nos"    value={selected.total_nos} />
                      <DetailRow label="Salary Range" value={selected.salary_range || "Not specified"} />
                      <DetailRow label="Experience"   value={selected.experience || "Not specified"} />
                      <DetailRow label="Education"    value={selected.education || "Not specified"} />
                      <DetailRow label="POC Assigned" value={selected.poc} />
                      <DetailRow label="Raised By"    value={selected.raised_by} />
                    </div>
                    {selected.responsibilities && (
                      <div className="px-3 md:px-4 pb-3">
                        <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-secondary)", fontSize: 10 }}>Responsibilities</p>
                        <p className="text-sm leading-relaxed px-3 py-2 rounded-sm" style={{ background: "var(--color-primary-50)", color: "var(--color-text-primary)" }}>{selected.responsibilities}</p>
                      </div>
                    )}
                    {selected.key_skills && (
                      <div className="px-3 md:px-4 pb-4">
                        <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-secondary)", fontSize: 10 }}>Key Skills</p>
                        <p className="text-sm leading-relaxed px-3 py-2 rounded-sm" style={{ background: "var(--color-primary-50)", color: "var(--color-text-primary)" }}>{selected.key_skills}</p>
                      </div>
                    )}
                  </div>

                  {/* Decision card */}
                  <div className="enterprise-card overflow-hidden">
                    <div
                      className="text-xs font-bold uppercase tracking-widest px-4 py-2.5"
                      style={{ background: "var(--color-primary-50)", borderBottom: "1px solid var(--color-border)", color: "var(--color-primary-700)", letterSpacing: "0.08em" }}
                    >
                      Approval Decision
                    </div>
                    <form onSubmit={handleDecision} className="p-3 md:p-4 flex flex-col gap-4">
                      <div>
                        <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--color-text-secondary)" }}>
                          Decision <span style={{ color: "var(--color-danger)" }}>*</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {DECISIONS.map(d => (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => setDecision(d.value)}
                              className="h-8 px-4 text-xs font-semibold rounded-sm transition-all"
                              style={{
                                background: decision === d.value ? d.bg : "var(--color-surface)",
                                color: decision === d.value ? d.color : "var(--color-text-secondary)",
                                border: `1px solid ${decision === d.value ? d.bg : "var(--color-border)"}`,
                                cursor: "pointer",
                                opacity: decision && decision !== d.value ? 0.5 : 1,
                              }}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                        {decision && (
                          <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-sm" style={{ background: "var(--color-primary-50)", color: "var(--color-primary-700)", border: "1px solid var(--color-border)" }}>
                            Selected: {decision}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>
                          Remarks / Comments
                          {(decision === "Rejected" || decision === "Changes Requested") && (
                            <span className="ml-0.5" style={{ color: "var(--color-danger)" }}>*</span>
                          )}
                        </label>
                        <textarea
                          className="enterprise-input h-auto py-2"
                          rows={3}
                          value={remarks}
                          onChange={e => setRemarks(e.target.value)}
                          placeholder="Add your remarks, reason for rejection, or changes needed…"
                        />
                      </div>

                      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => setSelected(null)}
                          className="h-8 px-4 text-xs font-semibold rounded-sm"
                          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!decision || saving}
                          className="h-8 px-4 text-xs font-semibold rounded-sm text-white disabled:opacity-50"
                          style={{ background: "var(--color-primary-800)", border: "none", cursor: !decision || saving ? "not-allowed" : "pointer" }}
                        >
                          {saving ? "Saving…" : "Submit Decision"}
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
