import React, { useEffect, useLayoutEffect, useContext, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutContext } from "../components/Layout";
import { getInterviews, getScreenings, submitInterview } from "../utils/api";

/* ─── Constants ─────────────────────────────────────────────── */

const FINAL_DECISION_OPTS = [
  { value: "Move Forward",  color: "#16a34a", bg: "rgba(22,163,74,0.1)"  },
  { value: "Hold",          color: "#d97706", bg: "rgba(217,119,6,0.1)"  },
  { value: "Not Selected",  color: "#dc2626", bg: "rgba(198,40,40,0.1)"  },
  { value: "Selected",      color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
];

const EMPTY_INT_FORM = {
  interviewed_by:       "",
  round_description:    "",
  interviewer_feedback: "",
  final_decision:       "",
  is_final_round:       false,
};

/* ─── Helpers ────────────────────────────────────────────────── */

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getFileExt(file) {
  return file.name.split(".").pop().toLowerCase();
}

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─── Sub-components ─────────────────────────────────────────── */

function DecisionBadge({ value }) {
  const opt = FINAL_DECISION_OPTS.find(o => o.value === value);
  if (!opt) return <span>{value || "—"}</span>;
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 3, fontSize: 11, fontWeight: 700, background: opt.bg, color: opt.color, border: `1px solid ${opt.color}` }}>
      {value}
    </span>
  );
}

function FileDropZone({ accept, maxMB, file, onChange, label, id }) {
  const [dragging, setDragging] = useState(false);

  const dragHandlers = {
    onDragOver:  e => { e.preventDefault(); setDragging(true); },
    onDragLeave: () => setDragging(false),
    onDrop:      e => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) validateAndSet(f);
    },
  };

  function validateAndSet(f) {
    if (f.size > maxMB * 1024 * 1024) {
      alert(`File too large. Maximum is ${maxMB} MB.`);
      return;
    }
    onChange(f);
  }

  const input = (
    <input
      id={id}
      type="file"
      accept={accept}
      className="sr-only"
      onChange={e => { if (e.target.files[0]) validateAndSet(e.target.files[0]); }}
      onClick={e => { e.target.value = ""; }}
    />
  );

  if (file) {
    return (
      <div
        className="flex items-center gap-2 rounded-sm px-3 py-3"
        style={{ border: "1.5px solid var(--color-success)", background: "rgba(22,163,74,0.05)", minHeight: 52 }}
        {...dragHandlers}
      >
        {input}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ color: "var(--color-success)", flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
        <span className="text-xs font-semibold truncate flex-1" style={{ color: "var(--color-success)" }}>{file.name}</span>
        <span className="text-xs flex-shrink-0" style={{ color: "var(--color-text-secondary)" }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
        <label htmlFor={id} className="text-xs font-semibold flex-shrink-0 cursor-pointer" style={{ color: "var(--color-primary-700)", textDecoration: "underline" }}>Change</label>
        <button type="button" onClick={() => onChange(null)} className="flex-shrink-0 text-xs font-bold" style={{ color: "var(--color-danger)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }} title="Remove file">✕</button>
      </div>
    );
  }

  return (
    <label
      htmlFor={id}
      className="flex flex-col items-center justify-center gap-2 rounded-sm cursor-pointer transition-all"
      style={{ border: `1.5px dashed ${dragging ? "var(--color-primary-600)" : "var(--color-border)"}`, background: dragging ? "var(--color-primary-50)" : "var(--color-surface)", padding: "18px 16px", minHeight: 72 }}
      {...dragHandlers}
    >
      {input}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" style={{ color: "var(--color-text-secondary)" }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <div className="text-center">
        <span className="text-xs font-semibold" style={{ color: "var(--color-primary-700)" }}>{label}</span>
        <span className="text-xs ml-1" style={{ color: "var(--color-text-secondary)" }}>or drag and drop</span>
        <div className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Max {maxMB} MB</div>
      </div>
    </label>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */

export default function InterviewPage() {
  const { user } = useAuth();
  const { setFullHeight } = useContext(LayoutContext);

  useLayoutEffect(() => {
    setFullHeight(true);
    return () => setFullHeight(false);
  }, [setFullHeight]);

  const [view, setView]                       = useState("form"); // "form" | "history"
  const [candidates, setCandidates]           = useState([]);
  const [loadingCands, setLoadingCands]       = useState(true);
  const [allInterviews, setAllInterviews]     = useState([]);
  const [loadingInts, setLoadingInts]         = useState(true);
  const [selectedCand, setSelectedCand]       = useState(null);
  const [intForm, setIntForm]                 = useState(EMPTY_INT_FORM);
  const [intErrors, setIntErrors]             = useState({});
  const [saving, setSaving]                   = useState(false);
  const [success, setSuccess]                 = useState(null);
  const [submitError, setSubmitError]         = useState("");
  const [recordingFile, setRecordingFile]     = useState(null);
  const [search, setSearch]                   = useState("");
  const [filterRound, setFilterRound]         = useState("");
  const [filterDecision, setFilterDecision]   = useState("");
  const [expandedRec, setExpandedRec]         = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoadingCands(true);
    setLoadingInts(true);
    const [scrRes, intRes] = await Promise.all([getScreenings(), getInterviews()]);
    if (scrRes?.rows) {
      setCandidates(scrRes.rows.filter(r => r.fit_assessment === "Shortlisted" || r.fit_assessment === "On Hold"));
    }
    if (intRes?.rows) setAllInterviews(intRes.rows);
    setLoadingCands(false);
    setLoadingInts(false);
  }

  function setIF(k, v) {
    setIntForm(f => ({ ...f, [k]: v }));
    if (intErrors[k]) setIntErrors(e => ({ ...e, [k]: null }));
  }

  function handleSelectCand(cand) {
    setSelectedCand(cand);
    setIntForm(EMPTY_INT_FORM);
    setIntErrors({});
    setSuccess(null);
    setSubmitError("");
    setRecordingFile(null);
  }

  function validate() {
    const e = {};
    if (!intForm.interviewed_by.trim())    e.interviewed_by    = "Required";
    if (!intForm.round_description.trim()) e.round_description = "Required — describe the type of interview";
    if (!intForm.final_decision)           e.final_decision    = "Select a decision";
    setIntErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) {
      const firstErr = document.querySelector("[data-field-error]");
      if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(true);
    setSubmitError("");
    try {
      const candRounds = allInterviews.filter(r => r.screening_id === selectedCand.submission_id);
      const roundNumber = candRounds.length + 1;
      const payload = {
        screening_id:         selectedCand.submission_id,
        req_id:               selectedCand.req_id,
        position_title:       selectedCand.position_title,
        candidate_name:       selectedCand.candidate_name,
        candidate_email:      selectedCand.candidate_email || "",
        interviewed_by:       intForm.interviewed_by.trim(),
        interview_round:      `Round ${roundNumber}`,
        round_description:    intForm.round_description.trim(),
        interviewer_feedback: intForm.interviewer_feedback.trim(),
        final_decision:       intForm.final_decision,
        is_final_round:       intForm.is_final_round,
        submitted_by:         user?.email || "",
      };
      if (recordingFile) {
        payload.recording_base64 = await readFile(recordingFile);
        payload.recording_ext    = getFileExt(recordingFile);
        payload.recording_mime   = recordingFile.type || "audio/mpeg";
      }
      const res = await submitInterview(payload);
      if (!res?.success || !res?.interview_id) {
        throw new Error(res?.error || "Submission failed — data was not saved to the sheet. Check GAS deployment.");
      }

      // Reload from sheet to confirm actual persistence
      const freshInt = await getInterviews();
      if (freshInt?.rows) setAllInterviews(freshInt.rows);

      setSuccess({
        interview_id:      res.interview_id,
        candidate_name:    selectedCand.candidate_name,
        position_title:    selectedCand.position_title,
        interview_round:   `Round ${candRounds.length + 1}`,
        round_description: intForm.round_description.trim(),
        final_decision:    intForm.final_decision,
        is_final_round:    intForm.is_final_round,
        recording_link:    res.recording_link || "",
      });
    } catch (err) {
      setSubmitError(err.message || "Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleAnother() {
    setSuccess(null);
    setIntForm(EMPTY_INT_FORM);
    setIntErrors({});
    setSubmitError("");
    setRecordingFile(null);
  }

  /* ── Interview counts per screening_id ── */
  const intCounts = {};
  allInterviews.forEach(r => { intCounts[r.screening_id] = (intCounts[r.screening_id] || 0) + 1; });

  /* ── Per-candidate round state ── */
  const finalRoundIds = new Set(
    allInterviews
      .filter(r => r.is_final_round === true || String(r.is_final_round).toLowerCase() === "true")
      .map(r => r.screening_id)
  );
  const candidateInterviews = selectedCand
    ? allInterviews.filter(r => r.screening_id === selectedCand.submission_id)
    : [];
  const hasFinalRound   = selectedCand ? finalRoundIds.has(selectedCand.submission_id) : false;
  const nextRoundNumber = candidateInterviews.length + 1;
  const maxRoundsReached = nextRoundNumber > 10;

  /* ── History filter ── */
  const filteredHistory = allInterviews.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (r.candidate_name || "").toLowerCase().includes(q) ||
      (r.interviewed_by || "").toLowerCase().includes(q) ||
      (r.req_id || "").toLowerCase().includes(q) ||
      (r.interview_id || "").toLowerCase().includes(q);
    const matchRound    = !filterRound    || r.interview_round === filterRound;
    const matchDecision = !filterDecision || r.final_decision  === filterDecision;
    return matchSearch && matchRound && matchDecision;
  });

  /* ─── Success screen ── */
  if (success) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <div className="flex items-center px-3 sm:px-6 flex-shrink-0" style={{ background: "var(--color-primary-900)", borderBottom: "1px solid rgba(255,255,255,0.07)", height: 56 }}>
          <h1 className="text-sm font-bold text-white">Interview Recorded</h1>
        </div>
        <div className="flex items-center justify-center p-4 sm:p-8 custom-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
          <div className="enterprise-card p-6 sm:p-10 text-center max-w-lg w-full">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: "rgba(46,125,50,0.1)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>
            <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-success)" }}>Interview Feedback Saved</h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>Interview record saved successfully.</p>
            <div className="inline-block px-5 py-3 rounded-sm mb-4" style={{ background: "var(--color-primary-50)", border: "1px solid var(--color-border)" }}>
              <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-secondary)" }}>Interview ID</div>
              <div className="font-mono text-xl font-extrabold" style={{ color: "var(--color-primary-700)" }}>{success.interview_id}</div>
            </div>
            {success.is_final_round && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm mb-3 text-xs font-bold" style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.35)" }}>
                🏁 Final Round — No further interviews for this candidate
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {[
                { l: "Candidate",   v: success.candidate_name },
                { l: "Position",    v: success.position_title },
                { l: "Round",       v: success.interview_round },
                { l: "Type",        v: success.round_description },
              ].map(({ l, v }) => (
                <div key={l} className="px-3 py-1.5 rounded-sm text-xs" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>{l}: </span>
                  <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center mb-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>Decision:</span>
                <DecisionBadge value={success.final_decision} />
              </div>
            </div>
            {success.recording_link && (
              <div className="mb-5">
                <a href={success.recording_link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-sm"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-primary-700)", textDecoration: "none" }}>
                  🎙 View Recording
                </a>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={handleAnother} className="h-9 px-5 text-sm font-semibold rounded-sm" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", cursor: "pointer" }}>
                Record Another Round
              </button>
              <button onClick={() => { setSuccess(null); setView("history"); }} className="h-9 px-5 text-sm font-semibold rounded-sm text-white" style={{ background: "var(--color-primary-800)", border: "none", cursor: "pointer" }}>
                View Interview History
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Main layout ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-6 flex-shrink-0" style={{ background: "var(--color-primary-900)", borderBottom: "1px solid rgba(255,255,255,0.07)", height: 56 }}>
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0 hidden sm:block">
            <h1 className="text-sm font-bold text-white leading-tight">Interview Pipeline</h1>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
              {view === "form" ? "Record interview feedback for shortlisted candidates" : `${allInterviews.length} interview records`}
            </p>
          </div>
          {/* Sub-tabs */}
          <div className="flex items-center gap-1">
            {[
              { k: "form",    label: "Schedule Interview" },
              { k: "history", label: "Interview History" },
            ].map(t => (
              <button key={t.k} type="button" onClick={() => setView(t.k)}
                className="h-7 px-3 text-xs font-semibold rounded-sm transition-all"
                style={{
                  background: view === t.k ? "rgba(200,169,81,0.25)" : "rgba(255,255,255,0.07)",
                  color: view === t.k ? "var(--color-accent-500)" : "rgba(255,255,255,0.6)",
                  border: view === t.k ? "1px solid rgba(200,169,81,0.4)" : "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                }}>
                {t.label}
                {t.k === "history" && allInterviews.length > 0 && (
                  <span className="ml-1.5 px-1 rounded-sm font-bold" style={{ fontSize: 9, background: "var(--color-accent-500)", color: "#fff" }}>
                    {allInterviews.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <button onClick={loadData}
          className="flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-sm flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {view === "form" ? (
        /* ── Two-panel: candidate list + form ── */
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>

          {/* Left panel: candidates */}
          <div
            className={`flex-shrink-0 flex flex-col gap-2 custom-scrollbar ${selectedCand ? "hidden md:flex" : "flex"}`}
            style={{ width: "min(272px,100%)", overflowY: "auto", borderRight: "1px solid var(--color-border)", padding: "14px 12px", background: "var(--color-background)" }}
          >
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <span className="text-xs font-bold uppercase" style={{ color: "var(--color-text-secondary)", letterSpacing: "0.08em" }}>
                Shortlisted Candidates
              </span>
              {!loadingCands && (
                <span className="px-1.5 py-0.5 rounded-sm font-semibold" style={{ fontSize: 10, background: "var(--color-primary-50)", color: "var(--color-primary-700)", border: "1px solid var(--color-border)" }}>
                  {candidates.length}
                </span>
              )}
            </div>

            {loadingCands ? (
              <div className="enterprise-card p-6 text-center text-xs flex items-center justify-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
                <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Loading…
              </div>
            ) : candidates.length === 0 ? (
              <div className="enterprise-card p-6 text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>
                <div className="text-2xl mb-2">📋</div>
                No shortlisted or on-hold candidates yet.
              </div>
            ) : (
              candidates.map(cand => {
                const isActive = selectedCand?.submission_id === cand.submission_id;
                const rounds = intCounts[cand.submission_id] || 0;
                const fitStyle = cand.fit_assessment === "Shortlisted"
                  ? { color: "var(--color-success)", bg: "rgba(22,163,74,0.1)" }
                  : { color: "var(--color-warning)", bg: "rgba(217,119,6,0.1)" };
                return (
                  <button
                    key={cand.submission_id}
                    onClick={() => handleSelectCand(cand)}
                    className="text-left rounded-sm transition-all p-3 w-full"
                    style={{
                      background: "var(--color-surface)",
                      border: `2px solid ${isActive ? "var(--color-accent-500)" : "var(--color-border)"}`,
                      boxShadow: isActive ? "0 0 0 1px var(--color-accent-500)" : "none",
                      cursor: "pointer",
                    }}
                  >
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <div className="font-semibold text-sm leading-tight" style={{ color: "var(--color-text-primary)" }}>{cand.candidate_name}</div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {rounds > 0 && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-sm" style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1", fontSize: 10 }}>
                            {rounds} round{rounds > 1 ? "s" : ""}
                          </span>
                        )}
                        {finalRoundIds.has(cand.submission_id) && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-sm" style={{ background: "rgba(99,102,241,0.22)", color: "#6366f1", fontSize: 9 }}>
                            🏁 Final
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>{cand.phone || "—"}</div>
                    <div className="font-mono text-xs font-bold mb-0.5" style={{ color: "var(--color-primary-700)" }}>{cand.req_id}</div>
                    <div className="text-xs mb-1.5" style={{ color: "var(--color-text-secondary)" }}>{cand.position_title}</div>
                    <span className="inline-block px-1.5 py-0.5 rounded-sm text-xs font-semibold" style={{ background: fitStyle.bg, color: fitStyle.color, fontSize: 10 }}>
                      {cand.fit_assessment}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Right panel: form */}
          <div className="flex-1 min-w-0 custom-scrollbar" style={{ overflowY: "auto", padding: "16px 20px" }}>
            {selectedCand && (
              <button type="button" onClick={() => setSelectedCand(null)}
                className="md:hidden flex items-center gap-1.5 text-xs font-semibold mb-3"
                style={{ color: "var(--color-primary-700)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
                Back to candidates
              </button>
            )}

            {!selectedCand ? (
              <div className="enterprise-card flex flex-col items-center justify-center text-center py-20 px-8" style={{ color: "var(--color-text-secondary)", minHeight: 320 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" width="48" height="48" style={{ color: "var(--color-border)", marginBottom: 16 }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>Select a candidate to begin</p>
                <p className="text-xs">Choose a shortlisted or on-hold candidate from the left panel.</p>
              </div>
            ) : hasFinalRound ? (
              <div className="enterprise-card flex flex-col items-center justify-center text-center py-20 px-8" style={{ minHeight: 320 }}>
                <div className="text-4xl mb-4">🏁</div>
                <p className="text-sm font-bold mb-1" style={{ color: "#6366f1" }}>Final Round Completed</p>
                <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
                  <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{selectedCand.candidate_name}</span> has completed their final interview round.
                  No further rounds can be recorded for this candidate.
                </p>
                <div className="px-4 py-3 rounded-sm text-xs" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)", color: "#6366f1", maxWidth: 340 }}>
                  {intCounts[selectedCand.submission_id] || 0} round{(intCounts[selectedCand.submission_id] || 0) !== 1 ? "s" : ""} recorded in total
                </div>
              </div>
            ) : maxRoundsReached ? (
              <div className="enterprise-card flex flex-col items-center justify-center text-center py-20 px-8" style={{ minHeight: 320 }}>
                <div className="text-4xl mb-4">🚫</div>
                <p className="text-sm font-bold mb-1" style={{ color: "var(--color-danger)" }}>Maximum Rounds Reached</p>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{selectedCand.candidate_name}</span> has already completed 10 interview rounds (the maximum allowed).
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 pb-4">

                {/* Candidate details (read-only) */}
                <div className="enterprise-card overflow-hidden">
                  <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-primary-700)", background: "var(--color-primary-50)", borderBottom: "1px solid var(--color-border)", letterSpacing: "0.08em" }}>
                    Candidate Details
                  </div>
                  <div className="p-3 md:p-4 grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ fontSize: 12 }}>
                    {[
                      { label: "Screening ID",  value: selectedCand.submission_id },
                      { label: "Candidate",     value: selectedCand.candidate_name },
                      { label: "Phone",         value: selectedCand.phone || "—" },
                      { label: "Email",         value: selectedCand.candidate_email || "—" },
                      { label: "Position",      value: selectedCand.position_title },
                      { label: "Requisition",   value: selectedCand.req_id },
                      { label: "Experience",    value: selectedCand.experience_years ? `${selectedCand.experience_years} yrs` : "—" },
                      { label: "Current CTC",   value: selectedCand.current_ctc ? `₹${selectedCand.current_ctc}L` : "—" },
                      { label: "Expected CTC",  value: selectedCand.expected_ctc ? `₹${selectedCand.expected_ctc}L` : "—" },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
                        <div style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interview session */}
                <div className="enterprise-card overflow-hidden">
                  <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-primary-700)", background: "var(--color-primary-50)", borderBottom: "1px solid var(--color-border)", letterSpacing: "0.08em" }}>
                    Interview Session
                  </div>
                  <div className="p-3 md:p-4 flex flex-col gap-4">

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                        Interviewed By <span style={{ color: "var(--color-danger)" }}>*</span>
                      </label>
                      <input
                        className="enterprise-input"
                        value={intForm.interviewed_by}
                        onChange={e => setIF("interviewed_by", e.target.value)}
                        placeholder="Name of the interviewer"
                        data-field-error={intErrors.interviewed_by ? "1" : undefined}
                      />
                      {intErrors.interviewed_by && <span className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>{intErrors.interviewed_by}</span>}
                    </div>

                    {/* Round number — auto-computed, read-only */}
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>Round</label>
                        <div className="flex items-center justify-center px-4 h-9 rounded-sm font-bold text-sm"
                          style={{ background: "var(--color-primary-50)", border: "2px solid var(--color-primary-700)", color: "var(--color-primary-700)", minWidth: 90 }}>
                          Round {nextRoundNumber}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                          Round Type / Description <span style={{ color: "var(--color-danger)" }}>*</span>
                        </label>
                        <input
                          className="enterprise-input"
                          value={intForm.round_description}
                          onChange={e => setIF("round_description", e.target.value)}
                          placeholder="e.g. Technical Assessment, HR Discussion, Culture Fit, Aptitude…"
                          data-field-error={intErrors.round_description ? "1" : undefined}
                        />
                        {intErrors.round_description && <span className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>{intErrors.round_description}</span>}
                      </div>
                    </div>

                    {/* Mark as final round */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setIF("is_final_round", !intForm.is_final_round)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-sm w-full text-left transition-all"
                        style={{
                          background: intForm.is_final_round ? "rgba(99,102,241,0.08)" : "var(--color-surface)",
                          border: `1.5px solid ${intForm.is_final_round ? "rgba(99,102,241,0.5)" : "var(--color-border)"}`,
                          cursor: "pointer",
                        }}
                      >
                        <div className="flex items-center justify-center rounded flex-shrink-0"
                          style={{ width: 18, height: 18, background: intForm.is_final_round ? "#6366f1" : "transparent", border: `2px solid ${intForm.is_final_round ? "#6366f1" : "var(--color-border)"}`, transition: "all 0.15s" }}>
                          {intForm.is_final_round && <svg viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="10" height="10"><polyline points="2 6 5 9 10 3"/></svg>}
                        </div>
                        <div>
                          <div className="text-xs font-semibold" style={{ color: intForm.is_final_round ? "#6366f1" : "var(--color-text-primary)" }}>
                            🏁 Mark as Final Round
                          </div>
                          <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                            After this round no further interviews will be allowed for this candidate
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>Interviewer Feedback</label>
                      <textarea
                        className="enterprise-input h-auto py-2"
                        rows={4}
                        value={intForm.interviewer_feedback}
                        onChange={e => setIF("interviewer_feedback", e.target.value)}
                        placeholder="Key observations, strengths, concerns from this interview round…"
                      />
                    </div>
                  </div>
                </div>

                {/* Recording */}
                <div className="enterprise-card overflow-hidden">
                  <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-primary-700)", background: "var(--color-primary-50)", borderBottom: "1px solid var(--color-border)", letterSpacing: "0.08em" }}>
                    Upload Recording <span className="normal-case font-normal" style={{ opacity: 0.6 }}>(Optional)</span>
                  </div>
                  <div className="p-3 md:p-4">
                    <FileDropZone
                      id="int-recording-upload"
                      accept="audio/*,.mp3,.mp4,.wav,.m4a,.ogg"
                      maxMB={15}
                      file={recordingFile}
                      onChange={setRecordingFile}
                      label="Click to upload Recording"
                    />
                    <p className="text-xs mt-1.5" style={{ color: "var(--color-text-secondary)" }}>MP3, MP4, WAV or any audio · Max 15 MB</p>
                  </div>
                </div>

                {/* Final decision */}
                <div className="enterprise-card overflow-hidden">
                  <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-primary-700)", background: "var(--color-primary-50)", borderBottom: "1px solid var(--color-border)", letterSpacing: "0.08em" }}>
                    Final Decision <span style={{ color: "var(--color-danger)" }}>*</span>
                  </div>
                  <div className="p-3 md:p-4 flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2" data-field-error={intErrors.final_decision ? "1" : undefined}>
                      {FINAL_DECISION_OPTS.map(opt => {
                        const sel = intForm.final_decision === opt.value;
                        return (
                          <button key={opt.value} type="button" onClick={() => setIF("final_decision", opt.value)}
                            className="px-4 py-1.5 rounded-sm text-xs font-semibold transition-all select-none"
                            style={{
                              background: sel ? opt.bg : "var(--color-surface)",
                              border: `1px solid ${sel ? opt.color : "var(--color-border)"}`,
                              color: sel ? opt.color : "var(--color-text-secondary)",
                              cursor: "pointer",
                              fontWeight: sel ? 700 : 500,
                            }}>
                            {sel && <span className="mr-1">✓</span>}{opt.value}
                          </button>
                        );
                      })}
                    </div>
                    {intErrors.final_decision && <span className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>{intErrors.final_decision}</span>}
                  </div>
                </div>

                {/* Submit bar */}
                <div className="flex flex-col gap-2 pb-2">
                  {submitError && (
                    <div className="text-xs px-3 py-2 rounded-sm font-medium" style={{ background: "rgba(198,40,40,0.08)", color: "var(--color-danger)", border: "1px solid rgba(198,40,40,0.2)" }}>
                      ⚠ {submitError}
                    </div>
                  )}
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                    <button type="button" onClick={() => setSelectedCand(null)} className="h-9 px-5 text-sm font-semibold rounded-sm"
                      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={saving} className="h-9 px-5 text-sm font-semibold rounded-sm text-white disabled:opacity-60"
                      style={{ background: "var(--color-primary-800)", border: "none", cursor: saving ? "not-allowed" : "pointer" }}>
                      {saving ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                          Saving…
                        </span>
                      ) : "Save Interview →"}
                    </button>
                  </div>
                </div>

              </form>
            )}
          </div>
        </div>
      ) : (
        /* ── Interview History ── */
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
            <div className="relative flex-1" style={{ minWidth: 180, maxWidth: 300 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"
                style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input className="enterprise-input" style={{ paddingLeft: 28, height: 32, fontSize: 12 }}
                placeholder="Search candidate, round, req…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="enterprise-input" style={{ height: 32, fontSize: 12, minWidth: 160 }} value={filterRound} onChange={e => setFilterRound(e.target.value)}>
              <option value="">All Rounds</option>
              {[...new Set(allInterviews.map(r => r.interview_round).filter(Boolean))].sort().map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select className="enterprise-input" style={{ height: 32, fontSize: 12, minWidth: 150 }} value={filterDecision} onChange={e => setFilterDecision(e.target.value)}>
              <option value="">All Decisions</option>
              {FINAL_DECISION_OPTS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
            </select>
            {(search || filterRound || filterDecision) && (
              <button type="button" onClick={() => { setSearch(""); setFilterRound(""); setFilterDecision(""); }}
                className="h-8 px-3 text-xs font-medium rounded-sm"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", cursor: "pointer" }}>
                Clear
              </button>
            )}
            <span className="text-xs ml-auto flex-shrink-0" style={{ color: "var(--color-text-secondary)" }}>
              {filteredHistory.length} of {allInterviews.length} records
            </span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingInts ? (
              <div className="flex items-center justify-center gap-2 py-20 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Loading interviews…
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                <div className="text-3xl mb-2">📋</div>
                {allInterviews.length === 0 ? "No interview records yet." : "No records match your filters."}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "var(--color-surface)", borderBottom: "2px solid var(--color-border)" }}>
                        {["Int ID", "Candidate", "Req", "Round", "Interviewed By", "Feedback", "Decision", "Date", "Rec"].map(h => (
                          <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", whiteSpace: "nowrap", letterSpacing: "0.04em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((r, idx) => {
                        const isExp = expandedRec === r.interview_id;
                        return (
                          <tr key={r.interview_id}
                            onClick={() => setExpandedRec(isExp ? null : r.interview_id)}
                            style={{
                              background: isExp ? "var(--color-primary-50)" : idx % 2 === 0 ? "var(--color-background)" : "var(--color-surface)",
                              borderBottom: "1px solid var(--color-border)",
                              cursor: "pointer",
                            }}
                            onMouseEnter={e => { if (!isExp) e.currentTarget.style.background = "var(--color-primary-50)"; }}
                            onMouseLeave={e => { if (!isExp) e.currentTarget.style.background = idx % 2 === 0 ? "var(--color-background)" : "var(--color-surface)"; }}>
                            <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary-700)", fontSize: 11, whiteSpace: "nowrap" }}>{r.interview_id || "—"}</td>
                            <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>{r.candidate_name || "—"}</td>
                            <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 11, color: "var(--color-primary-700)", whiteSpace: "nowrap" }}>{r.req_id || "—"}</td>
                            <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                              <div className="font-semibold" style={{ color: "var(--color-primary-700)", fontSize: 11 }}>{r.interview_round || "—"}</div>
                              {r.round_description && <div style={{ color: "var(--color-text-secondary)", fontSize: 10 }}>{r.round_description}</div>}
                              {(r.is_final_round === true || String(r.is_final_round).toLowerCase() === "true") && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: "#6366f1" }}>🏁 Final</span>
                              )}
                            </td>
                            <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{r.interviewed_by || "—"}</td>
                            <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.interviewer_feedback}>{r.interviewer_feedback || "—"}</td>
                            <td style={{ padding: "8px 12px" }}><DecisionBadge value={r.final_decision} /></td>
                            <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)", fontSize: 11, whiteSpace: "nowrap" }}>{formatDate(r.submitted_at)}</td>
                            <td style={{ padding: "8px 12px" }}>
                              {r.recording_link ? (
                                <a href={r.recording_link} target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  style={{ color: "var(--color-primary-700)", fontSize: 16 }} title="View Recording">🎙</a>
                              ) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden flex flex-col gap-3 p-3">
                  {filteredHistory.map(r => (
                    <div key={r.interview_id} className="enterprise-card p-3"
                      onClick={() => setExpandedRec(expandedRec === r.interview_id ? null : r.interview_id)}
                      style={{ cursor: "pointer" }}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <div className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>{r.candidate_name || "—"}</div>
                          <div className="text-xs font-mono" style={{ color: "var(--color-primary-700)" }}>{r.req_id}</div>
                        </div>
                        <DecisionBadge value={r.final_decision} />
                      </div>
                      <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        <span className="font-semibold" style={{ color: "var(--color-primary-700)" }}>{r.interview_round}</span>
                        {r.round_description && ` · ${r.round_description}`}
                        {` · ${r.interviewed_by}`}
                        {(r.is_final_round === true || String(r.is_final_round).toLowerCase() === "true") && (
                          <span className="ml-1 font-bold" style={{ color: "#6366f1" }}>🏁</span>
                        )}
                      </div>
                      {expandedRec === r.interview_id && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--color-border)", fontSize: 12 }}>
                          <div style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{r.interviewer_feedback || "—"}</div>
                          <div className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>Date: {formatDate(r.submitted_at)}</div>
                          {r.recording_link && (
                            <a href={r.recording_link} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 mt-2 h-7 px-3 text-xs font-semibold rounded-sm"
                              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-primary-700)", textDecoration: "none" }}>
                              🎙 Recording
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
