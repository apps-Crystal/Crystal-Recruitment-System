import React, { useEffect, useLayoutEffect, useContext, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LayoutContext } from "../components/Layout";
import { getScreenings, getInterviews, getApprovals, submitApproval } from "../utils/api";

/* ─── Constants ─────────────────────────────────────────────── */

const DECISION_OPTS = [
  { value: "Approved", color: "#16a34a", bg: "rgba(22,163,74,0.12)",  icon: "✓" },
  { value: "Hold",     color: "#d97706", bg: "rgba(217,119,6,0.12)",   icon: "⏸" },
  { value: "Rejected", color: "#dc2626", bg: "rgba(198,40,40,0.12)",   icon: "✕" },
];

const INT_DEC_STYLE = {
  "Move Forward": { color: "#16a34a", bg: "rgba(22,163,74,0.1)" },
  "Hold":         { color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  "Not Selected": { color: "#dc2626", bg: "rgba(198,40,40,0.1)" },
  "Selected":     { color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
};

const APPROVAL_STYLE = {
  "Approved": { color: "#16a34a", bg: "rgba(22,163,74,0.1)" },
  "Hold":     { color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  "Rejected": { color: "#dc2626", bg: "rgba(198,40,40,0.1)" },
  "Pending":  { color: "#64748b", bg: "rgba(100,116,139,0.08)" },
};

/* ─── Helpers ────────────────────────────────────────────────── */

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d) ? val : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(val) {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d) ? val :
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) + " · " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

/* ─── Sub-components ─────────────────────────────────────────── */

function IntDecBadge({ value, small }) {
  const s = INT_DEC_STYLE[value];
  if (!s) return <span style={{ color: "var(--color-text-secondary)", fontSize: small ? 10 : 11 }}>{value || "—"}</span>;
  return (
    <span style={{
      display: "inline-block", padding: small ? "1px 5px" : "2px 8px",
      borderRadius: 3, fontSize: small ? 10 : 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.color}`,
    }}>{value}</span>
  );
}

function AprBadge({ value }) {
  const s = APPROVAL_STYLE[value] || APPROVAL_STYLE["Pending"];
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 3,
      fontSize: 10, fontWeight: 700, background: s.bg, color: s.color,
      border: `1px solid ${s.color}`,
    }}>{value}</span>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */

export default function OfferApprovalPage() {
  const { user } = useAuth();
  const { setFullHeight } = useContext(LayoutContext);

  useLayoutEffect(() => {
    setFullHeight(true);
    return () => setFullHeight(false);
  }, [setFullHeight]);

  const [allScreenings, setAllScreenings] = useState([]);
  const [allInterviews, setAllInterviews] = useState([]);
  const [allApprovals,  setAllApprovals]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedCand,  setSelectedCand]  = useState(null);
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [decision,      setDecision]      = useState("");
  const [remarks,       setRemarks]       = useState("");
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState("");
  const [saveSuccess,   setSaveSuccess]   = useState("");
  const [expandedRound, setExpandedRound] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [scrRes, intRes, aprRes] = await Promise.all([
      getScreenings(), getInterviews(), getApprovals(),
    ]);
    if (scrRes?.rows) setAllScreenings(scrRes.rows);
    if (intRes?.rows) setAllInterviews(intRes.rows);
    if (aprRes?.rows) setAllApprovals(aprRes.rows);
    setLoading(false);
  }

  /* ── Derived data ── */

  // Latest approval per screening_id
  const approvalMap = {};
  [...allApprovals]
    .sort((a, b) => new Date(a.approved_at || 0) - new Date(b.approved_at || 0))
    .forEach(r => { approvalMap[r.screening_id] = r; });

  // Only candidates who have completed their Final Round are eligible for approval
  const finalRoundIds = new Set(
    allInterviews
      .filter(r => r.is_final_round === true || String(r.is_final_round).toLowerCase() === "true")
      .map(r => r.screening_id)
  );
  const approvalCandidates = allScreenings.filter(s => finalRoundIds.has(s.submission_id));

  function getCandInterviews(screening_id) {
    return [...allInterviews.filter(r => r.screening_id === screening_id)].sort((a, b) => {
      const n = str => parseInt((str || "").replace(/\D/g, "") || "0");
      return n(a.interview_round) - n(b.interview_round);
    });
  }

  function getStatus(screening_id) {
    return approvalMap[screening_id]?.decision || "Pending";
  }

  const counts = {
    all:      approvalCandidates.length,
    pending:  approvalCandidates.filter(c => getStatus(c.submission_id) === "Pending").length,
    Approved: approvalCandidates.filter(c => getStatus(c.submission_id) === "Approved").length,
    Hold:     approvalCandidates.filter(c => getStatus(c.submission_id) === "Hold").length,
    Rejected: approvalCandidates.filter(c => getStatus(c.submission_id) === "Rejected").length,
  };

  const filteredCandidates = approvalCandidates.filter(c => {
    if (statusFilter === "all")     return true;
    if (statusFilter === "pending") return getStatus(c.submission_id) === "Pending";
    return getStatus(c.submission_id) === statusFilter;
  });

  /* ── Selection ── */
  function handleSelectCand(cand) {
    setSelectedCand(cand);
    const apr = approvalMap[cand.submission_id];
    setDecision(apr?.decision || "");
    setRemarks(apr?.remarks   || "");
    setSaveError("");
    setSaveSuccess("");
    setExpandedRound(null);
  }

  /* ── Submit ── */
  async function handleSubmit(e) {
    e.preventDefault();
    if (!decision) { setSaveError("Select a decision before submitting."); return; }
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const res = await submitApproval({
        screening_id:    selectedCand.submission_id,
        req_id:          selectedCand.req_id,
        position_title:  selectedCand.position_title,
        candidate_name:  selectedCand.candidate_name,
        candidate_email: selectedCand.candidate_email || "",
        decision,
        remarks:         remarks.trim(),
        approved_by:     user?.name || user?.email || "",
      });
      if (!res?.success || !res?.approval_id) {
        throw new Error(res?.error || "Submission failed — check GAS deployment.");
      }
      const aprRes = await getApprovals();
      if (aprRes?.rows) setAllApprovals(aprRes.rows);
      setSaveSuccess(`Decision "${decision}" recorded successfully.`);
    } catch (err) {
      setSaveError(err.message || "Could not save. Check connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Selected candidate computed ── */
  const candInterviews   = selectedCand ? getCandInterviews(selectedCand.submission_id) : [];
  const hasFinalRound    = candInterviews.some(r => r.is_final_round === true || String(r.is_final_round).toLowerCase() === "true");
  const existingApproval = selectedCand ? approvalMap[selectedCand.submission_id] : null;

  const FILTER_TABS = [
    { key: "all",      label: "All" },
    { key: "pending",  label: "Pending" },
    { key: "Approved", label: "Approved" },
    { key: "Hold",     label: "Hold" },
    { key: "Rejected", label: "Rejected" },
  ];

  /* ─── Render ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-6 flex-shrink-0"
        style={{ background: "var(--color-primary-900)", borderBottom: "1px solid rgba(255,255,255,0.07)", height: 56 }}>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white leading-tight">Offer Approval Panel</h1>
          <p className="text-xs hidden sm:block" style={{ color: "rgba(255,255,255,0.45)" }}>
            CHRO / Management — Review all interview data and record final hiring decision
          </p>
        </div>
        <button onClick={loadAll}
          className="flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-sm flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Two-panel body */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>

        {/* ── Left panel: candidate list ── */}
        <div
          className={`flex-shrink-0 flex flex-col custom-scrollbar ${selectedCand ? "hidden md:flex" : "flex"}`}
          style={{ width: "min(284px,100%)", overflowY: "auto", borderRight: "1px solid var(--color-border)", background: "var(--color-background)" }}
        >
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1 p-2 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
            {FILTER_TABS.map(t => (
              <button key={t.key} type="button" onClick={() => setStatusFilter(t.key)}
                className="flex items-center gap-1 h-6 px-2 rounded-sm text-xs font-semibold transition-all"
                style={{
                  background: statusFilter === t.key ? "var(--color-primary-800)" : "transparent",
                  color:      statusFilter === t.key ? "#fff" : "var(--color-text-secondary)",
                  border:     `1px solid ${statusFilter === t.key ? "var(--color-primary-700)" : "var(--color-border)"}`,
                  cursor: "pointer",
                }}>
                {t.label}
                <span style={{ fontSize: 9, opacity: 0.75, marginLeft: 2 }}>({counts[t.key] || 0})</span>
              </button>
            ))}
          </div>

          {/* Candidate cards */}
          <div className="flex flex-col gap-2 p-2">
            {loading ? (
              <div className="enterprise-card p-6 text-center text-xs flex items-center justify-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
                <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Loading…
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="enterprise-card p-6 text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>
                <div className="text-2xl mb-2">📋</div>
                {approvalCandidates.length === 0
                  ? "No candidates have completed their Final Round yet. Approval is only available after the Final Round is marked in the Interview module."
                  : "No candidates match this filter."}
              </div>
            ) : (
              filteredCandidates.map(cand => {
                const isActive   = selectedCand?.submission_id === cand.submission_id;
                const candInts   = getCandInterviews(cand.submission_id);
                const finalDone  = candInts.some(r => r.is_final_round === true || String(r.is_final_round).toLowerCase() === "true");
                const latestInt  = candInts[candInts.length - 1];
                const status     = getStatus(cand.submission_id);
                const ss         = APPROVAL_STYLE[status] || APPROVAL_STYLE["Pending"];

                return (
                  <button key={cand.submission_id} onClick={() => handleSelectCand(cand)}
                    className="text-left rounded-sm p-3 w-full transition-all"
                    style={{
                      background: "var(--color-surface)",
                      border:     `2px solid ${isActive ? "var(--color-accent-500)" : "var(--color-border)"}`,
                      boxShadow:  isActive ? "0 0 0 1px var(--color-accent-500)" : "none",
                      cursor:     "pointer",
                    }}>
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <div className="font-semibold text-sm leading-tight" style={{ color: "var(--color-text-primary)" }}>
                        {cand.candidate_name}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 3, background: ss.bg, color: ss.color, border: `1px solid ${ss.color}`, flexShrink: 0 }}>
                        {status}
                      </span>
                    </div>
                    <div className="text-xs mb-0.5 truncate" style={{ color: "var(--color-text-secondary)" }}>{cand.position_title}</div>
                    <div className="font-mono text-xs font-bold mb-1.5" style={{ color: "var(--color-primary-700)" }}>{cand.req_id}</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                        {candInts.length} round{candInts.length !== 1 ? "s" : ""}
                      </span>
                      {finalDone && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#6366f1" }}>🏁 Final</span>
                      )}
                      {latestInt && (() => {
                        const ds = INT_DEC_STYLE[latestInt.final_decision] || {};
                        return (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: ds.bg || "rgba(100,116,139,0.1)", color: ds.color || "#64748b", border: `1px solid ${ds.color || "#64748b"}` }}>
                            {latestInt.final_decision || "—"}
                          </span>
                        );
                      })()}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 min-w-0 custom-scrollbar" style={{ overflowY: "auto" }}>
          {selectedCand && (
            <button type="button" onClick={() => setSelectedCand(null)}
              className="md:hidden flex items-center gap-1.5 text-xs font-semibold m-3"
              style={{ color: "var(--color-primary-700)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>
          )}

          {!selectedCand ? (
            <div className="enterprise-card flex flex-col items-center justify-center text-center py-20 px-8 m-4"
              style={{ color: "var(--color-text-secondary)", minHeight: 320 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" width="52" height="52"
                style={{ color: "var(--color-border)", marginBottom: 16 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
              </svg>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>Select a candidate to review</p>
              <p className="text-xs">Only candidates who have completed their <span style={{ fontWeight: 600, color: "#6366f1" }}>Final Round</span> appear here. Select one to review their full profile and record a hiring decision.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-3 md:p-4 pb-8">

              {/* ── Candidate Profile ── */}
              <div className="enterprise-card overflow-hidden">
                <div className="px-4 py-2.5 flex items-center justify-between flex-wrap gap-2"
                  style={{ background: "var(--color-primary-50)", borderBottom: "1px solid var(--color-border)" }}>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-primary-700)", letterSpacing: "0.08em" }}>
                    Candidate Profile
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-sm"
                      style={{
                        background: selectedCand.fit_assessment === "Shortlisted" ? "rgba(22,163,74,0.1)" : "rgba(217,119,6,0.1)",
                        color:      selectedCand.fit_assessment === "Shortlisted" ? "#16a34a" : "#d97706",
                        border:     `1px solid ${selectedCand.fit_assessment === "Shortlisted" ? "#16a34a" : "#d97706"}`,
                        fontSize: 10,
                      }}>
                      {selectedCand.fit_assessment}
                    </span>
                    {selectedCand.resume_link && (
                      <a href={selectedCand.resume_link} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-semibold px-2 py-0.5 rounded-sm"
                        style={{ background: "var(--color-primary-800)", color: "#fff", textDecoration: "none", fontSize: 10 }}>
                        View CV ↗
                      </a>
                    )}
                    {selectedCand.call_recording_link && (
                      <a href={selectedCand.call_recording_link} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-semibold px-2 py-0.5 rounded-sm"
                        style={{ background: "var(--color-surface)", color: "var(--color-primary-700)", textDecoration: "none", border: "1px solid var(--color-border)", fontSize: 10 }}>
                        🎙 Screening Call
                      </a>
                    )}
                  </div>
                </div>
                <div className="p-3 md:p-4 grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ fontSize: 12 }}>
                  {[
                    { label: "Candidate",       value: selectedCand.candidate_name },
                    { label: "Phone",           value: selectedCand.phone || "—" },
                    { label: "Email",           value: selectedCand.candidate_email || "—" },
                    { label: "Position",        value: selectedCand.position_title },
                    { label: "Requisition",     value: selectedCand.req_id },
                    { label: "Screening ID",    value: selectedCand.submission_id },
                    { label: "Experience",      value: selectedCand.experience_years ? `${selectedCand.experience_years} yrs` : "—" },
                    { label: "Current CTC",     value: selectedCand.current_ctc  ? `₹${selectedCand.current_ctc}L`  : "—" },
                    { label: "Expected CTC",    value: selectedCand.expected_ctc ? `₹${selectedCand.expected_ctc}L` : "—" },
                    { label: "Current Company", value: selectedCand.current_company || "—" },
                    { label: "Notice Period",   value: selectedCand.notice_period   || "—" },
                    { label: "Source",          value: selectedCand.source          || "—" },
                    { label: "Location",        value: selectedCand.job_location    || "—" },
                    { label: "Screened By",     value: selectedCand.interviewer_name || "—" },
                    { label: "Screened On",     value: formatDate(selectedCand.submitted_at) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
                      <div style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{value}</div>
                    </div>
                  ))}
                  {selectedCand.screening_remarks && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Screening Remarks</div>
                      <div style={{ color: "var(--color-text-primary)", fontWeight: 500, lineHeight: 1.5 }}>{selectedCand.screening_remarks}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Interview Rounds ── */}
              <div className="enterprise-card overflow-hidden">
                <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap"
                  style={{ background: "var(--color-primary-50)", borderBottom: "1px solid var(--color-border)" }}>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-primary-700)", letterSpacing: "0.08em" }}>
                    Interview Rounds
                  </span>
                  <span className="px-1.5 py-0.5 rounded-sm text-xs font-bold"
                    style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1", fontSize: 10 }}>
                    {candInterviews.length} Round{candInterviews.length !== 1 ? "s" : ""}
                  </span>
                  {hasFinalRound && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-sm"
                      style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1", fontSize: 10, border: "1px solid rgba(99,102,241,0.3)" }}>
                      🏁 Final Round Completed
                    </span>
                  )}
                </div>

                {candInterviews.length === 0 ? (
                  <div className="p-6 text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    No interview records found.
                  </div>
                ) : (
                  <div>
                    {candInterviews.map((r, idx) => {
                      const isFinal = r.is_final_round === true || String(r.is_final_round).toLowerCase() === "true";
                      const isExp   = expandedRound === r.interview_id;
                      return (
                        <div key={r.interview_id}
                          onClick={() => setExpandedRound(isExp ? null : r.interview_id)}
                          style={{
                            cursor: "pointer",
                            padding: "12px 16px",
                            borderBottom: idx < candInterviews.length - 1 ? "1px solid var(--color-border)" : "none",
                            background: isExp ? "var(--color-primary-50)" : "transparent",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={e => { if (!isExp) e.currentTarget.style.background = "var(--color-surface)"; }}
                          onMouseLeave={e => { if (!isExp) e.currentTarget.style.background = "transparent"; }}>

                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              {/* Round bubble */}
                              <div className="flex items-center justify-center rounded-full flex-shrink-0 font-bold"
                                style={{
                                  width: 32, height: 32,
                                  background: isFinal ? "rgba(99,102,241,0.15)" : "var(--color-primary-50)",
                                  color: isFinal ? "#6366f1" : "var(--color-primary-700)",
                                  border: `2px solid ${isFinal ? "#6366f1" : "var(--color-primary-700)"}`,
                                  fontSize: 12,
                                }}>
                                {idx + 1}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <span className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>
                                    {r.interview_round}
                                  </span>
                                  {r.round_description && (
                                    <span className="text-xs px-2 py-0.5 rounded-sm"
                                      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                                      {r.round_description}
                                    </span>
                                  )}
                                  {isFinal && (
                                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                                      🏁 Final
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                  By <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{r.interviewed_by || "—"}</span>
                                  {" · "}{formatDate(r.submitted_at)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <IntDecBadge value={r.final_decision} small />
                              {r.recording_link && (
                                <a href={r.recording_link} target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  style={{ fontSize: 16, textDecoration: "none" }} title="View Recording">🎙</a>
                              )}
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"
                                style={{ color: "var(--color-text-secondary)", transform: isExp ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                            </div>
                          </div>

                          {isExp && (
                            <div className="mt-3" style={{ marginLeft: 44, paddingLeft: 12, borderLeft: "3px solid var(--color-primary-700)" }}>
                              {r.interviewer_feedback ? (
                                <>
                                  <div className="text-xs font-bold uppercase mb-1" style={{ color: "var(--color-text-secondary)", letterSpacing: "0.06em" }}>Interviewer Feedback</div>
                                  <div className="text-sm" style={{ color: "var(--color-text-primary)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{r.interviewer_feedback}</div>
                                </>
                              ) : (
                                <div className="text-xs italic" style={{ color: "var(--color-text-secondary)" }}>No feedback recorded.</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Existing Decision (if any) ── */}
              {existingApproval && (
                <div className="enterprise-card overflow-hidden">
                  <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest"
                    style={{ color: "var(--color-primary-700)", background: "var(--color-primary-50)", borderBottom: "1px solid var(--color-border)", letterSpacing: "0.08em" }}>
                    Current Decision on Record
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <AprBadge value={existingApproval.decision} />
                      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        by <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{existingApproval.approved_by}</span>
                        {" · "}{formatDateTime(existingApproval.approved_at)}
                      </span>
                    </div>
                    {existingApproval.remarks && (
                      <div className="text-sm px-3 py-2 rounded-sm"
                        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", lineHeight: 1.55 }}>
                        "{existingApproval.remarks}"
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Approval Decision Form — locked if decision already recorded ── */}
              {existingApproval ? (
                <div className="enterprise-card overflow-hidden">
                  <div className="px-4 py-2.5 flex items-center gap-2"
                    style={{ background: "rgba(22,163,74,0.06)", borderBottom: "1px solid rgba(22,163,74,0.2)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#16a34a", letterSpacing: "0.08em" }}>
                      Decision Finalised — No Further Changes Allowed
                    </span>
                  </div>
                  <div className="p-4 text-xs" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
                    The hiring decision for <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{selectedCand.candidate_name}</span> has been
                    recorded as <AprBadge value={existingApproval.decision} /> by <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{existingApproval.approved_by}</span> on {formatDateTime(existingApproval.approved_at)}.
                    <br/>This decision is locked and cannot be modified.
                  </div>
                </div>
              ) : (
                <div className="enterprise-card overflow-hidden">
                  <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest"
                    style={{ color: "var(--color-primary-700)", background: "var(--color-primary-50)", borderBottom: "1px solid var(--color-border)", letterSpacing: "0.08em" }}>
                    Record Hiring Decision
                  </div>
                  <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">

                    {/* Decision chips */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                        Final Hiring Decision <span style={{ color: "var(--color-danger)" }}>*</span>
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {DECISION_OPTS.map(opt => {
                          const sel = decision === opt.value;
                          return (
                            <button key={opt.value} type="button" onClick={() => { setDecision(opt.value); setSaveError(""); setSaveSuccess(""); }}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-sm font-semibold text-sm transition-all select-none"
                              style={{
                                background: sel ? opt.bg : "var(--color-surface)",
                                border:     `2px solid ${sel ? opt.color : "var(--color-border)"}`,
                                color:      sel ? opt.color : "var(--color-text-secondary)",
                                cursor:     "pointer",
                                fontWeight: sel ? 700 : 500,
                              }}>
                              <span className="font-bold" style={{ fontSize: 15 }}>{opt.icon}</span>
                              {opt.value}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Remarks */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                        Remarks{" "}
                        {decision === "Rejected" || decision === "Hold"
                          ? <span style={{ color: "var(--color-danger)" }}>*</span>
                          : <span style={{ opacity: 0.6 }}>(Optional)</span>}
                      </label>
                      <textarea
                        className="enterprise-input h-auto py-2"
                        rows={3}
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        placeholder={
                          decision === "Approved" ? "Offer package, joining date, any special notes…" :
                          decision === "Hold"     ? "Reason for deferring — what needs to be confirmed before proceeding…" :
                          decision === "Rejected" ? "Reason for rejection (internal notes — not shared with candidate)…" :
                          "Any remarks, conditions, or notes for this decision…"
                        }
                      />
                    </div>

                    {/* Feedback */}
                    {saveError && (
                      <div className="text-xs px-3 py-2 rounded-sm font-medium"
                        style={{ background: "rgba(198,40,40,0.08)", color: "var(--color-danger)", border: "1px solid rgba(198,40,40,0.2)" }}>
                        ⚠ {saveError}
                      </div>
                    )}
                    {saveSuccess && (
                      <div className="text-xs px-3 py-2 rounded-sm font-medium"
                        style={{ background: "rgba(22,163,74,0.08)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.2)" }}>
                        ✓ {saveSuccess}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                      <button type="button"
                        onClick={() => { setDecision(""); setRemarks(""); setSaveError(""); setSaveSuccess(""); }}
                        className="h-9 px-4 text-sm font-semibold rounded-sm"
                        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", cursor: "pointer" }}>
                        Reset
                      </button>
                      <button type="submit" disabled={saving || !decision}
                        className="h-9 px-5 text-sm font-semibold rounded-sm text-white disabled:opacity-60"
                        style={{ background: "var(--color-primary-800)", border: "none", cursor: saving || !decision ? "not-allowed" : "pointer" }}>
                        {saving ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                            Saving…
                          </span>
                        ) : "Record Decision →"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
