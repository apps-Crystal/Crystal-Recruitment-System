/**
 * Module 2 — Candidate Screening & Entry (SOP-HR-001 §6)
 * Senior HR Executive records candidate details after telephonic screening.
 * Advances candidate to AI_EVALUATION stage on submission.
 *
 * Fields per SOP §6.2:
 *   Candidate info, source, experience, CTC, notice period,
 *   resume (PDF ≤5MB), optional screening recording (≤15MB),
 *   fit assessment (Shortlisted / On Hold / Rejected), remarks.
 */
import React, { useEffect, useState, useCallback, useLayoutEffect, useContext } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { LayoutContext } from "../components/Layout";
import { getRequisitions, getScreenings, submitScreening, extractCVData } from "../utils/api";
import {
  PageHeader, Button, Badge, ReqStatusBadge,
  RadioChips, LoadingPane, EmptyState,
  PipelineTracker, Divider, Alert, Card,
} from "../components/ui";

/* ── Constants ───────────────────────────────────────────────── */
const SOURCES = [
  "Naukri Posting", "Naukri Search", "LinkedIn",
  "Indeed", "Employee Reference", "Other",
];

const NOTICE_OPTIONS = ["Immediate", "15 Days", "30 Days", "60+ Days"];

const FIT_OPTIONS = [
  { value: "Shortlisted", label: "✓ Shortlist" },
  { value: "On Hold",     label: "⏸ Hold"      },
  { value: "Rejected",    label: "✕ Reject"     },
];

const FIT_COLOR = {
  "Shortlisted": { bg: "#dcfce7", color: "#15803d", border: "#16a34a" },
  "On Hold":     { bg: "#fef9c3", color: "#92400e", border: "#ca8a04" },
  "Rejected":    { bg: "#fee2e2", color: "#991b1b", border: "#dc2626" },
};

const MAX_RESUME_MB    = 5;
const MAX_RECORDING_MB = 15;

const EMPTY_FORM = {
  candidate_name:    "",
  phone:             "",
  candidate_email:   "",
  source:            "",
  current_company:   "",
  job_location:      "",
  experience_years:  "",
  notice_period:     "",
  current_ctc:       "",
  expected_ctc:      "",
  fit_assessment:    "",
  screening_remarks: "",
};

/* ── Helpers ─────────────────────────────────────────────────── */
function readFileAsBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onloadend = () => res(reader.result.split(",")[1]);
    reader.onerror   = rej;
    reader.readAsDataURL(file);
  });
}

function fmtDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d) ? val : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* ── Req Card (left panel) ───────────────────────────────────── */
function ReqCard({ req, isActive, onClick, candidateCount }) {
  return (
    <button
      type="button"
      onClick={() => onClick(req)}
      style={{
        width: "100%", textAlign: "left", padding: "10px 12px",
        borderRadius: 6, border: "none", cursor: "pointer", marginBottom: 2,
        background: isActive ? "rgba(200,169,81,0.12)" : "transparent",
        borderLeft: `3px solid ${isActive ? "var(--color-accent-500)" : "transparent"}`,
        transition: "background 150ms",
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: "var(--color-text-primary)", marginBottom: 2, lineHeight: 1.3 }}>
            {req.position_title || "—"}
          </div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{req.req_id}</span>
            {req.department && ` · ${req.department}`}
          </div>
        </div>
        <ReqStatusBadge status={req.status} />
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
        {candidateCount > 0 && (
          <Badge color="#6366f1" bg="rgba(99,102,241,0.08)">{candidateCount} screened</Badge>
        )}
        {req.location && (
          <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>📍 {req.location}</span>
        )}
      </div>
    </button>
  );
}

/* ── Candidate Row (screened list) ───────────────────────────── */
function CandidateRow({ c, onSelect }) {
  const fit  = c.fit_assessment || c.FitAssessment || "";
  const fcfg = FIT_COLOR[fit] || null;
  return (
    <button
      type="button"
      onClick={() => onSelect(c)}
      style={{
        width: "100%", textAlign: "left", padding: "9px 12px",
        borderRadius: 6, border: "none", cursor: "pointer", marginBottom: 2,
        background: "transparent", borderLeft: "3px solid transparent",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ fontWeight: 600, fontSize: 12, color: "var(--color-text-primary)", marginBottom: 2 }}>
        {c.candidate_name || c.FullName || "—"}
      </div>
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 3 }}>
        {c.phone || "—"} · {c.experience_years ? `${c.experience_years} yrs` : "—"} exp
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {fit && fcfg && (
          <span style={{ padding: "1px 7px", borderRadius: 3, fontSize: 9, fontWeight: 700, background: fcfg.bg, color: fcfg.color }}>
            {fit}
          </span>
        )}
        {c.source && <span style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{c.source}</span>}
      </div>
    </button>
  );
}

/* ── Candidate Detail (right panel after clicking a screened candidate) */
function CandidateDetail({ candidate, onBack }) {
  const c    = candidate;
  const fit  = c.fit_assessment || c.FitAssessment || "";
  const fcfg = FIT_COLOR[fit] || { bg: "#f3f4f6", color: "#6b7280", border: "#d1d5db" };

  return (
    <div style={{ padding: 20 }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16,
          background: "none", border: "none", cursor: "pointer",
          fontSize: 12, color: "var(--color-text-secondary)", padding: 0,
        }}
      >
        ← Back
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
          background: "var(--color-primary-100)", display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700, color: "var(--color-primary-700)",
        }}>
          {(c.candidate_name || "?")[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>
            {c.candidate_name || "—"}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
            {c.candidate_email || "—"} · {c.phone || "—"}
          </div>
          <div style={{ marginTop: 6 }}>
            {fit && (
              <span style={{
                padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                background: fcfg.bg, color: fcfg.color, border: `1px solid ${fcfg.border}`,
              }}>
                {fit}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <Card style={{ padding: "12px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)", marginBottom: 10 }}>
          Hiring Pipeline
        </div>
        <PipelineTracker currentStage={c.stage || "SCREENING"} />
      </Card>

      {/* Info grid */}
      <Card style={{ padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)", marginBottom: 12 }}>
          Screening Details
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
          {[
            ["Current Company", c.current_company],
            ["Location",        c.job_location],
            ["Experience",      c.experience_years ? `${c.experience_years} yrs` : "—"],
            ["Notice Period",   c.notice_period],
            ["Current CTC",     c.current_ctc ? `₹${c.current_ctc} LPA` : "—"],
            ["Expected CTC",    c.expected_ctc ? `₹${c.expected_ctc} LPA` : "—"],
            ["Source",          c.source],
            ["Screened By",     c.screened_by || c.interviewer_name],
            ["Screened On",     fmtDate(c.screened_at || c.timestamp)],
            ["Req ID",          c.req_id],
          ].map(([lbl, val]) => (
            <div key={lbl}>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 2 }}>{lbl}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>{val || "—"}</div>
            </div>
          ))}
        </div>
      </Card>

      {(c.screening_remarks || c.remarks) && (
        <Card style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)", marginBottom: 8 }}>
            Remarks
          </div>
          <p style={{ fontSize: 12, color: "var(--color-text-primary)", lineHeight: 1.7, margin: 0 }}>
            {c.screening_remarks || c.remarks}
          </p>
        </Card>
      )}
    </div>
  );
}

/* ── Screening Form ──────────────────────────────────────────── */
function ScreeningForm({ req, onSuccess }) {
  const { user }     = useAuth();
  const { addToast } = useToast();

  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [errors, setErrors]         = useState({});
  const [resume, setResume]         = useState(null);
  const [recording, setRecording]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);  // CV extraction loading state
  const [cvFilled, setCvFilled]     = useState([]);      // list of fields auto-filled from CV

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  }

  function validate() {
    const e = {};
    if (!form.candidate_name.trim())    e.candidate_name    = "Required";
    if (!form.phone.trim())             e.phone             = "Required";
    if (!form.candidate_email.trim())   e.candidate_email   = "Required";
    if (!form.source)                   e.source            = "Select a source";
    if (!form.experience_years)         e.experience_years  = "Required";
    if (!form.fit_assessment)           e.fit_assessment    = "Select a fit assessment";
    if (!form.screening_remarks.trim()) e.screening_remarks = "Remarks are required (SOP §6.4)";
    if (!resume)                        e.resume            = "Resume is required";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const resumeB64    = await readFileAsBase64(resume);
      const recordingB64 = recording ? await readFileAsBase64(recording) : null;

      const res = await submitScreening({
        ...form,
        req_id:             req.req_id,
        position_title:     req.position_title,
        screened_by:        user?.name || user?.email,
        screened_at:        new Date().toISOString(),
        resume_base64:      resumeB64,
        resume_filename:    resume.name,
        recording_base64:   recordingB64,
        recording_filename: recording?.name || null,
        stage:              "SCREENING",
      });

      if (res?.success) {
        addToast(`${form.candidate_name} added to screening queue.`, "success");
        setForm({ ...EMPTY_FORM });
        setResume(null);
        setRecording(null);
        setCvFilled([]);
        onSuccess?.();
      } else {
        addToast(res?.error || "Submission failed. Please try again.", "error");
      }
    } catch {
      addToast("Unexpected error. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResume(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.name.split(".").pop().toLowerCase() !== "pdf") {
      setErrors(p => ({ ...p, resume: "Only PDF files accepted" })); return;
    }
    if (f.size > MAX_RESUME_MB * 1024 * 1024) {
      setErrors(p => ({ ...p, resume: `Max ${MAX_RESUME_MB}MB` })); return;
    }
    setResume(f);
    setErrors(p => ({ ...p, resume: null }));

    /* ── Auto-extract CV data ── */
    setExtracting(true);
    setCvFilled([]);
    try {
      const base64 = await readFileAsBase64(f);
      const res    = await extractCVData(base64);

      if (res?.success && res.data) {
        const d = res.data;

        // Map extracted fields → only fill fields that are currently empty
        const FIELD_LABELS = {
          candidate_name:   "Name",
          phone:            "Phone",
          candidate_email:  "Email",
          current_company:  "Current Company",
          job_location:     "Location",
          experience_years: "Experience",
          current_ctc:      "Current CTC",
          expected_ctc:     "Expected CTC",
          notice_period:    "Notice Period",
        };

        const mapping = {
          candidate_name:   d.name,
          phone:            d.phone,
          candidate_email:  d.email,
          current_company:  d.current_company,
          job_location:     d.job_location,
          experience_years: d.experience_years,
          current_ctc:      d.current_ctc,
          expected_ctc:     d.expected_ctc,
          notice_period:    d.notice_period,
        };

        const filled = [];
        setForm(prev => {
          const next = { ...prev };
          Object.entries(mapping).forEach(([key, val]) => {
            if (val && String(val).trim() && !prev[key]) {
              next[key] = String(val).trim();
              filled.push(FIELD_LABELS[key]);
            }
          });
          return next;
        });
        setCvFilled(filled);

        if (filled.length > 0) {
          addToast(`CV parsed — auto-filled: ${filled.join(", ")}`, "success");
          // Clear validation errors for filled fields
          setErrors(prev => {
            const next = { ...prev };
            filled.forEach(label => {
              const key = Object.entries(FIELD_LABELS).find(([, v]) => v === label)?.[0];
              if (key) delete next[key];
            });
            return next;
          });
        } else {
          addToast("CV parsed but no new fields to fill. Check form below.", "info");
        }
      } else {
        // Non-fatal — let user fill manually
        addToast("CV auto-fill unavailable. Fill the form manually.", "warning");
      }
    } catch {
      addToast("CV parsing error. Fill the form manually.", "warning");
    } finally {
      setExtracting(false);
    }
  }

  function handleRecording(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_RECORDING_MB * 1024 * 1024) {
      setErrors(p => ({ ...p, recording: `Max ${MAX_RECORDING_MB}MB` })); return;
    }
    setRecording(f);
    setErrors(p => ({ ...p, recording: null }));
  }

  const inp = (error) => ({
    width: "100%", padding: "7px 10px", borderRadius: 6, fontSize: 12,
    border: `1px solid ${error ? "#dc2626" : "var(--color-border)"}`,
    background: "var(--color-background)", color: "var(--color-text-primary)",
    boxSizing: "border-box", outline: "none",
  });
  const lbl = { fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)" };

  /* Helper: is this field auto-filled from CV? */
  const isCV = (fieldLabel) => cvFilled.includes(fieldLabel);
  const cvBorder = "1.5px solid #2563eb";
  const cvBg     = "rgba(37,99,235,0.04)";

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 2 }}>
        Add Candidate — {req.position_title}
      </div>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 16 }}>
        {req.req_id} · {req.department}{req.location ? ` · ${req.location}` : ""}
      </div>

      {/* ── Step 1: Resume Upload (first) ── */}
      <Divider label="Step 1 — Upload Resume" />
      <div style={{ margin: "10px 0 16px" }}>
        <label style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 8, padding: "18px 20px", borderRadius: 8, cursor: extracting ? "not-allowed" : "pointer",
          border: `2px dashed ${errors.resume ? "#dc2626" : resume ? "#16a34a" : "var(--color-primary-300)"}`,
          background: resume ? "rgba(22,163,74,0.04)" : extracting ? "rgba(37,99,235,0.04)" : "var(--color-background)",
          transition: "all 200ms",
        }}>
          {extracting ? (
            <>
              <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" width="24" height="24">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#2563eb" }}>Reading CV with AI…</span>
              <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Extracting candidate details automatically</span>
            </>
          ) : resume ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" width="22" height="22">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="9" y1="13" x2="15" y2="13"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#15803d" }}>✓ {resume.name}</span>
              {cvFilled.length > 0 && (
                <span style={{ fontSize: 10, color: "#2563eb", fontWeight: 600 }}>
                  ✨ Auto-filled: {cvFilled.join(", ")}
                </span>
              )}
              <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Click to replace</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="1.75" width="28" height="28">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary-700)" }}>
                Upload Resume PDF
              </span>
              <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                AI will auto-fill name, phone, email, company, experience & CTC · Max {MAX_RESUME_MB}MB
              </span>
            </>
          )}
          <input type="file" accept=".pdf" onChange={handleResume} disabled={extracting} style={{ display: "none" }} />
        </label>
        {errors.resume && <span style={{ fontSize: 10, color: "#dc2626", marginTop: 4, display: "block" }}>{errors.resume}</span>}
      </div>

      {/* ── Step 2: Candidate Info (shown always, highlighted if CV-filled) ── */}
      <Divider label="Step 2 — Candidate Information" />
      {cvFilled.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.2)",
          borderRadius: 6, padding: "7px 12px", margin: "8px 0 10px", fontSize: 11, color: "#1d4ed8",
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
          Fields highlighted in blue were auto-filled from the CV. Verify and correct if needed.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "10px 0 14px" }}>
        {[
          { key: "candidate_name",   label: "Full Name",                  req: true,  type: "text",   placeholder: "As on resume",           cvLabel: "Name"     },
          { key: "phone",            label: "Phone",                      req: true,  type: "tel",    placeholder: "10-digit mobile",        cvLabel: "Phone"    },
          { key: "candidate_email",  label: "Email",                      req: true,  type: "email",  placeholder: "candidate@email.com",    cvLabel: "Email"    },
          { key: "current_company",  label: "Current Company",            req: false, type: "text",   placeholder: "Current employer",       cvLabel: "Current Company" },
          { key: "job_location",     label: "Location",                   req: false, type: "text",   placeholder: "City / Remote",          cvLabel: "Location" },
          { key: "experience_years", label: "Total Experience (years)",   req: true,  type: "number", placeholder: "e.g. 4.5",               cvLabel: "Experience", extra: { min: "0", max: "50", step: "0.5" } },
        ].map(f => (
          <div key={f.key}>
            <label style={lbl}>
              {f.label}
              {f.req && <span style={{ color: "#dc2626" }}> *</span>}
              {isCV(f.cvLabel) && (
                <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#2563eb", background: "rgba(37,99,235,0.1)", padding: "1px 5px", borderRadius: 3 }}>
                  AI
                </span>
              )}
            </label>
            <input
              value={form[f.key]}
              onChange={e => setField(f.key, e.target.value)}
              placeholder={f.placeholder}
              type={f.type}
              {...(f.extra || {})}
              style={{
                ...inp(errors[f.key]), marginTop: 4,
                border: isCV(f.cvLabel) ? cvBorder : inp(errors[f.key]).border,
                background: isCV(f.cvLabel) ? cvBg : "var(--color-background)",
              }}
            />
            {errors[f.key] && <span style={{ fontSize: 10, color: "#dc2626" }}>{errors[f.key]}</span>}
          </div>
        ))}
      </div>

      {/* Compensation */}
      <Divider label="Compensation & Availability" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, margin: "10px 0 14px" }}>
        <div>
          <label style={lbl}>
            Current CTC (LPA)
            {isCV("Current CTC") && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#2563eb", background: "rgba(37,99,235,0.1)", padding: "1px 5px", borderRadius: 3 }}>AI</span>}
          </label>
          <input value={form.current_ctc} onChange={e => setField("current_ctc", e.target.value)} placeholder="e.g. 8.5" style={{ ...inp(false), marginTop: 4, border: isCV("Current CTC") ? cvBorder : inp(false).border, background: isCV("Current CTC") ? cvBg : "var(--color-background)" }} />
        </div>
        <div>
          <label style={lbl}>
            Expected CTC (LPA)
            {isCV("Expected CTC") && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#2563eb", background: "rgba(37,99,235,0.1)", padding: "1px 5px", borderRadius: 3 }}>AI</span>}
          </label>
          <input value={form.expected_ctc} onChange={e => setField("expected_ctc", e.target.value)} placeholder="e.g. 12" style={{ ...inp(false), marginTop: 4, border: isCV("Expected CTC") ? cvBorder : inp(false).border, background: isCV("Expected CTC") ? cvBg : "var(--color-background)" }} />
        </div>
        <div>
          <label style={lbl}>
            Notice Period
            {isCV("Notice Period") && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#2563eb", background: "rgba(37,99,235,0.1)", padding: "1px 5px", borderRadius: 3 }}>AI</span>}
          </label>
          <select value={form.notice_period} onChange={e => setField("notice_period", e.target.value)} style={{ ...inp(false), marginTop: 4, border: isCV("Notice Period") ? cvBorder : inp(false).border, background: isCV("Notice Period") ? cvBg : "var(--color-background)" }}>
            <option value="">Select…</option>
            {NOTICE_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Source */}
      <Divider label="Source" />
      <div style={{ margin: "10px 0 14px" }}>
        <label style={lbl}>Candidate Source <span style={{ color: "#dc2626" }}>*</span></label>
        <RadioChips options={SOURCES} value={form.source} onChange={v => setField("source", v)} />
        {errors.source && <span style={{ fontSize: 10, color: "#dc2626", marginTop: 4, display: "block" }}>{errors.source}</span>}
      </div>

      {/* Recording */}
      <Divider label="Screening Recording (optional)" />
      <div style={{ margin: "10px 0 14px" }}>
        <label style={{
          display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 6,
          cursor: "pointer", border: `1.5px dashed ${errors.recording ? "#dc2626" : "var(--color-border)"}`,
          background: "var(--color-background)", fontSize: 11,
          color: recording ? "#15803d" : "var(--color-text-secondary)",
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="16" height="16">
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
          </svg>
          {recording ? `✓ ${recording.name}` : `Upload call recording · Max ${MAX_RECORDING_MB}MB (audio or video)`}
          <input type="file" accept="audio/*,video/*" onChange={handleRecording} style={{ display: "none" }} />
        </label>
        {errors.recording && <span style={{ fontSize: 10, color: "#dc2626" }}>{errors.recording}</span>}
      </div>

      {/* Fit Assessment */}
      <Divider label="Screening Assessment" />
      <div style={{ margin: "10px 0 14px" }}>
        <label style={lbl}>Fit Assessment <span style={{ color: "#dc2626" }}>*</span></label>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          {FIT_OPTIONS.map(opt => {
            const sel = form.fit_assessment === opt.value;
            const cfg = FIT_COLOR[opt.value];
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setField("fit_assessment", opt.value)}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 6, cursor: "pointer",
                  fontWeight: 700, fontSize: 12, border: "2px solid",
                  borderColor: sel ? cfg.border : "var(--color-border)",
                  background: sel ? cfg.bg : "transparent",
                  color: sel ? cfg.color : "var(--color-text-secondary)",
                  transition: "all 150ms",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {errors.fit_assessment && <span style={{ fontSize: 10, color: "#dc2626" }}>{errors.fit_assessment}</span>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={lbl}>Screening Remarks <span style={{ color: "#dc2626" }}>*</span></label>
        <textarea
          value={form.screening_remarks}
          onChange={e => setField("screening_remarks", e.target.value)}
          rows={4}
          placeholder="Summarise the screening call — communication, attitude, suitability, any concerns…"
          style={{
            ...inp(errors.screening_remarks), marginTop: 4,
            resize: "vertical", lineHeight: 1.6,
          }}
        />
        {errors.screening_remarks && <span style={{ fontSize: 10, color: "#dc2626" }}>{errors.screening_remarks}</span>}
      </div>

      <Alert type="info" style={{ marginBottom: 16, fontSize: 11 }}>
        <strong>SOP §6.4</strong> — After submission the candidate enters the AI Evaluation queue automatically.
        AI scoring is advisory only; the final decision is made by the Senior HR Executive in Module 4.
      </Alert>

      <Button type="submit" variant="primary" size="lg" loading={submitting} style={{ width: "100%" }}>
        {submitting ? "Submitting…" : "Submit Screening"}
      </Button>
    </form>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function ScreeningPage() {
  const { setFullHeight } = useContext(LayoutContext);

  useLayoutEffect(() => {
    setFullHeight(true);
    return () => setFullHeight(false);
  }, [setFullHeight]);

  const [reqs, setReqs]               = useState([]);
  const [screenings, setScreenings]   = useState([]);
  const [reqLoading, setReqLoading]   = useState(true);
  const [scrLoading, setScrLoading]   = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [rightView, setRightView]     = useState("form");
  const [selectedCand, setSelectedCand] = useState(null);
  const [reqSearch, setReqSearch]     = useState("");

  const loadReqs = useCallback(async () => {
    setReqLoading(true);
    const res = await getRequisitions();
    setReqs((res?.rows || []).filter(r => ["Approved", "Hiring in Progress"].includes(r.status)));
    setReqLoading(false);
  }, []);

  const loadScreenings = useCallback(async (reqId) => {
    setScrLoading(true);
    const res = await getScreenings(reqId);
    setScreenings(res?.rows || []);
    setScrLoading(false);
  }, []);

  useEffect(() => { loadReqs(); }, [loadReqs]);

  function selectReq(req) {
    setSelectedReq(req);
    setRightView("form");
    setSelectedCand(null);
    loadScreenings(req.req_id);
  }

  const filteredReqs  = reqs.filter(r => {
    const q = reqSearch.toLowerCase();
    return !q ||
      (r.req_id        || "").toLowerCase().includes(q) ||
      (r.position_title|| "").toLowerCase().includes(q) ||
      (r.department    || "").toLowerCase().includes(q);
  });

  const reqScreenings = screenings.filter(s => s.req_id === selectedReq?.req_id);
  const candCount     = (reqId) => screenings.filter(s => s.req_id === reqId).length;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "var(--color-background)" }}>

      {/* ── Left: Requisition list ─────────────────────────────── */}
      <div style={{
        width: 280, flexShrink: 0,
        borderRight: "1px solid var(--color-border)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        background: "var(--color-surface)",
      }}>
        <div style={{ padding: "14px 12px 10px", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 8 }}>
            Open Positions
          </div>
          <input
            placeholder="Search…"
            value={reqSearch}
            onChange={e => setReqSearch(e.target.value)}
            style={{
              width: "100%", padding: "6px 10px", borderRadius: 6, fontSize: 11,
              border: "1px solid var(--color-border)",
              background: "var(--color-background)", color: "var(--color-text-primary)",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }} className="custom-scrollbar">
          {reqLoading ? <LoadingPane text="Loading…" /> :
            filteredReqs.length === 0 ? (
              <EmptyState title="No open requisitions" body="Approved or Hiring in Progress requisitions appear here." />
            ) : filteredReqs.map(req => (
              <ReqCard
                key={req.req_id}
                req={req}
                isActive={selectedReq?.req_id === req.req_id}
                onClick={selectReq}
                candidateCount={candCount(req.req_id)}
              />
            ))
          }
        </div>

        <div style={{ padding: "8px 12px", borderTop: "1px solid var(--color-border)", fontSize: 10, color: "var(--color-text-secondary)" }}>
          {filteredReqs.length} position{filteredReqs.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Right ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!selectedReq ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="56" height="56">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            }
            title="Select a position"
            body="Choose an open requisition from the left panel to begin candidate screening"
          />
        ) : (
          <>
            {/* Tabs */}
            <div style={{
              display: "flex", borderBottom: "1px solid var(--color-border)",
              background: "var(--color-surface)", flexShrink: 0, padding: "0 16px",
            }}>
              {[
                { id: "form", label: "Add Candidate" },
                { id: "list", label: `Screened (${reqScreenings.length})` },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setRightView(t.id); setSelectedCand(null); }}
                  style={{
                    padding: "10px 16px", border: "none", borderRadius: 0,
                    background: "transparent", cursor: "pointer", fontSize: 12,
                    fontWeight: rightView === t.id ? 700 : 500,
                    color: rightView === t.id ? "var(--color-primary-800)" : "var(--color-text-secondary)",
                    borderBottom: rightView === t.id ? "2px solid var(--color-primary-700)" : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto" }} className="custom-scrollbar">
              {rightView === "form" && (
                <ScreeningForm
                  req={selectedReq}
                  onSuccess={() => loadScreenings(selectedReq.req_id)}
                />
              )}
              {rightView === "list" && (
                <div style={{ padding: "12px" }}>
                  {scrLoading ? <LoadingPane text="Loading candidates…" /> :
                    reqScreenings.length === 0 ? (
                      <EmptyState
                        title="No candidates yet"
                        body="Use Add Candidate to record the first screening for this position."
                        action={<Button variant="secondary" size="sm" onClick={() => setRightView("form")}>Add Candidate</Button>}
                      />
                    ) : selectedCand ? (
                      <CandidateDetail candidate={selectedCand} onBack={() => setSelectedCand(null)} />
                    ) : (
                      <>
                        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8, fontWeight: 600 }}>
                          {reqScreenings.length} candidate{reqScreenings.length !== 1 ? "s" : ""} — {selectedReq.position_title}
                        </div>
                        {reqScreenings.map((c, i) => (
                          <CandidateRow key={c.submission_id || i} c={c} onSelect={setSelectedCand} />
                        ))}
                      </>
                    )
                  }
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
