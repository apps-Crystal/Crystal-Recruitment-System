import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getRequisitions, getScreenings, submitScreening, getInterviews, getApprovals } from "../utils/api";

/* ─── Constants ─────────────────────────────────────────────── */

const INTERVIEWERS = [
  "Yatish Agarwal",
  "Himani Khemka",
  "Anindita Das",
  "Joyeeta Dastidar",
  "Sameeksha",
  "Nabarupa Sen",
  "Namrata Rai",
  "Sayantani Basu Roy",
];

const SOURCES = [
  "Naukri Posting",
  "Naukri Search",
  "LinkedIn",
  "Indeed",
  "Employee Reference",
  "Other",
];

const FIT_OPTIONS = [
  { value: "Shortlisted", color: "var(--color-success)",  bg: "rgba(22,163,74,0.1)"  },
  { value: "On Hold",     color: "var(--color-warning)",  bg: "rgba(217,119,6,0.1)"  },
  { value: "Rejected",    color: "var(--color-danger)",   bg: "rgba(198,40,40,0.1)"  },
];

const NOTICE_OPTIONS = ["Immediate", "15 Days", "30 Days", "60+ Days"];

const EMPTY_FORM = {
  interviewer_name: "",
  source: "",
  candidate_name: "",
  phone: "",
  candidate_email: "",
  experience_years: "",
  screening_remarks: "",
  fit_assessment: "",
  current_company: "",
  job_location: "",
  notice_period: "",
  current_ctc: "",
  expected_ctc: "",
};

const MAX_RESUME_MB    = 5;
const MAX_RECORDING_MB = 15;

/* ─── Sub-components ─────────────────────────────────────────── */

function SectionHeader({ children }) {
  return (
    <div
      className="text-xs font-bold uppercase tracking-widest px-4 py-2.5"
      style={{
        color: "var(--color-primary-700)",
        background: "var(--color-primary-50)",
        borderBottom: "1px solid var(--color-border)",
        letterSpacing: "0.08em",
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, required, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
          {label}
          {required && <span className="ml-0.5" style={{ color: "var(--color-danger)" }}>*</span>}
        </label>
        {hint && <span className="text-xs" style={{ color: "var(--color-text-secondary)", opacity: 0.7 }}>{hint}</span>}
      </div>
      {children}
      {error && (
        <span className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>
          {error}
        </span>
      )}
    </div>
  );
}

function RadioChips({ options, value, onChange, errorKey, errors }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {options.map(opt => {
        const optValue = typeof opt === "string" ? opt : opt.value;
        const optLabel = typeof opt === "string" ? opt : opt.label || opt.value;
        const selected = value === optValue;
        return (
          <button
            key={optValue}
            type="button"
            onClick={() => onChange(optValue)}
            className="px-3 py-1.5 rounded-sm text-xs font-medium transition-all select-none"
            style={{
              background: selected ? "var(--color-primary-800)" : "var(--color-surface)",
              border: `1px solid ${selected ? "var(--color-primary-700)" : "var(--color-border)"}`,
              color: selected ? "#fff" : "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            {selected && <span className="mr-1">✓</span>}
            {optLabel}
          </button>
        );
      })}
    </div>
  );
}

function FitChips({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {FIT_OPTIONS.map(opt => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="px-4 py-1.5 rounded-sm text-xs font-semibold transition-all select-none"
            style={{
              background: selected ? opt.bg : "var(--color-surface)",
              border: `1px solid ${selected ? opt.color : "var(--color-border)"}`,
              color: selected ? opt.color : "var(--color-text-secondary)",
              cursor: "pointer",
              fontWeight: selected ? 700 : 500,
            }}
          >
            {selected && <span className="mr-1">✓</span>}
            {opt.value}
          </button>
        );
      })}
    </div>
  );
}

function FitBadge({ value }) {
  const opt = FIT_OPTIONS.find(o => o.value === value);
  if (!opt) return <span>{value}</span>;
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-sm text-xs font-bold"
      style={{ background: opt.bg, color: opt.color, border: `1px solid ${opt.color}` }}
    >
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

  // Hidden input — always rendered so the label/button can trigger it
  const input = (
    <input
      id={id}
      type="file"
      accept={accept}
      className="sr-only"
      onChange={e => { if (e.target.files[0]) validateAndSet(e.target.files[0]); }}
      // Reset value so re-selecting same file still fires onChange
      onClick={e => { e.target.value = ""; }}
    />
  );

  /* ── File selected: plain div — no accidental dialog re-open ── */
  if (file) {
    return (
      <div
        className="flex items-center gap-2 rounded-sm px-3 py-3"
        style={{
          border: "1.5px solid var(--color-success)",
          background: "rgba(22,163,74,0.05)",
          minHeight: 52,
        }}
        {...dragHandlers}
      >
        {input}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ color: "var(--color-success)", flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
        <span className="text-xs font-semibold truncate flex-1" style={{ color: "var(--color-success)" }}>{file.name}</span>
        <span className="text-xs flex-shrink-0" style={{ color: "var(--color-text-secondary)" }}>
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </span>
        {/* Change link — only this triggers the dialog */}
        <label
          htmlFor={id}
          className="text-xs font-semibold flex-shrink-0 cursor-pointer"
          style={{ color: "var(--color-primary-700)", textDecoration: "underline" }}
        >
          Change
        </label>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex-shrink-0 text-xs font-bold"
          style={{ color: "var(--color-danger)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}
          title="Remove file"
        >
          ✕
        </button>
      </div>
    );
  }

  /* ── No file: full area is a label ── */
  return (
    <label
      htmlFor={id}
      className="flex flex-col items-center justify-center gap-2 rounded-sm cursor-pointer transition-all"
      style={{
        border: `1.5px dashed ${dragging ? "var(--color-primary-600)" : "var(--color-border)"}`,
        background: dragging ? "var(--color-primary-50)" : "var(--color-surface)",
        padding: "18px 16px",
        minHeight: 72,
      }}
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

/* ─── File → base64 helper ──────────────────────────────────── */
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

/* ─── ScreeningRecords component ─────────────────────────────── */

function ScreeningRecords({ screenings, interviews, approvals, loading, reqs, search, onSearch, filterReq, onFilterReq, filterFit, onFilterFit, expandedRec, onExpand }) {

  const fitColors = {
    Shortlisted: { color: "var(--color-success)",  bg: "rgba(22,163,74,0.1)"  },
    "On Hold":   { color: "var(--color-warning)",  bg: "rgba(217,119,6,0.1)"  },
    Rejected:    { color: "var(--color-danger)",   bg: "rgba(198,40,40,0.1)"  },
  };

  // Build lookup maps
  const approvalMap = {};
  [...(approvals || [])]
    .sort((a, b) => new Date(a.approved_at || 0) - new Date(b.approved_at || 0))
    .forEach(r => { approvalMap[r.screening_id] = r; });

  const intMap = {};
  (interviews || []).forEach(r => {
    if (!intMap[r.screening_id]) intMap[r.screening_id] = [];
    intMap[r.screening_id].push(r);
  });

  function getCurrentStatus(rec) {
    const apr = approvalMap[rec.submission_id];
    if (apr?.decision) return { module: "Offer Decision", label: apr.decision, color: STAGE_COLOR[apr.decision] || STAGE_COLOR["Pending"] };
    const ints = intMap[rec.submission_id] || [];
    const sorted = [...ints].sort((a, b) => {
      const n = s => parseInt((s || "").replace(/\D/g, "") || "0");
      return n(b.interview_round) - n(a.interview_round);
    });
    if (sorted.length > 0) {
      const latest = sorted[0];
      const isFinal = latest.is_final_round === true || String(latest.is_final_round).toLowerCase() === "true";
      const module = (latest.round_description || latest.interview_round || "Interview") + (isFinal ? " 🏁" : "");
      const label = latest.final_decision || "In Progress";
      return { module, label, color: STAGE_COLOR[latest.final_decision] || STAGE_COLOR["Pending"] };
    }
    return { module: "Screening", label: rec.fit_assessment || "—", color: STAGE_COLOR[rec.fit_assessment] || STAGE_COLOR["Pending"] };
  }

  /* Filter */
  const filtered = screenings.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (r.candidate_name || "").toLowerCase().includes(q) ||
      (r.phone || "").includes(q) ||
      (r.req_id || "").toLowerCase().includes(q) ||
      (r.position_title || "").toLowerCase().includes(q) ||
      (r.interviewer_name || "").toLowerCase().includes(q) ||
      (r.submission_id || "").toLowerCase().includes(q);
    const matchReq = !filterReq || r.req_id === filterReq;
    const matchFit = !filterFit || r.fit_assessment === filterFit;
    return matchSearch && matchReq && matchFit;
  });

  /* Unique reqs from screenings for dropdown */
  const reqOptions = [...new Set(screenings.map(r => r.req_id).filter(Boolean))];

  function formatDate(val) {
    if (!val) return "—";
    const d = new Date(val);
    if (isNaN(d)) return val;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* ── Filter bar ── */}
      <div
        className="flex flex-wrap items-center gap-2 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" }}
      >
        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 180, maxWidth: 300 }}>
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" width="13" height="13"
            style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)", pointerEvents: "none" }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="enterprise-input"
            style={{ paddingLeft: 28, height: 32, fontSize: 12 }}
            placeholder="Search candidate, phone, req…"
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
        </div>

        {/* Filter by Req */}
        <select
          className="enterprise-input"
          style={{ height: 32, fontSize: 12, minWidth: 160, maxWidth: 220 }}
          value={filterReq}
          onChange={e => onFilterReq(e.target.value)}
        >
          <option value="">All Requisitions</option>
          {reqOptions.map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>

        {/* Filter by Fit */}
        <select
          className="enterprise-input"
          style={{ height: 32, fontSize: 12, minWidth: 140 }}
          value={filterFit}
          onChange={e => onFilterFit(e.target.value)}
        >
          <option value="">All Assessments</option>
          <option value="Shortlisted">Shortlisted</option>
          <option value="On Hold">On Hold</option>
          <option value="Rejected">Rejected</option>
        </select>

        {/* Clear */}
        {(search || filterReq || filterFit) && (
          <button
            type="button"
            onClick={() => { onSearch(""); onFilterReq(""); onFilterFit(""); }}
            className="h-8 px-3 text-xs font-medium rounded-sm"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", cursor: "pointer" }}
          >
            Clear
          </button>
        )}

        <span className="text-xs ml-auto flex-shrink-0" style={{ color: "var(--color-text-secondary)" }}>
          {filtered.length} of {screenings.length} records
        </span>
      </div>

      {/* ── Table / Cards ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Loading screenings…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="40" height="40" style={{ color: "var(--color-border)", marginBottom: 4 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            {screenings.length === 0 ? "No screening records yet." : "No records match your filters."}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--color-surface)", borderBottom: "2px solid var(--color-border)" }}>
                    {["Sub ID", "Candidate", "Phone", "Req / Position", "Interviewer", "Exp", "Curr CTC", "Exp CTC", "Assessment", "Current Status", "Date", "Links"].map(h => (
                      <th
                        key={h}
                        style={{
                          padding: "9px 12px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--color-text-secondary)",
                          letterSpacing: "0.04em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => {
                    const fitStyle = fitColors[r.fit_assessment] || {};
                    const isExpanded = expandedRec === r.submission_id;
                    return (
                      <>
                        <tr
                          key={r.submission_id}
                          onClick={() => onExpand(isExpanded ? null : r.submission_id)}
                          style={{
                            background: isExpanded ? "var(--color-primary-50)" : idx % 2 === 0 ? "var(--color-background)" : "var(--color-surface)",
                            borderBottom: "1px solid var(--color-border)",
                            cursor: "pointer",
                            transition: "background 120ms",
                          }}
                          onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = "var(--color-primary-50)"; }}
                          onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = idx % 2 === 0 ? "var(--color-background)" : "var(--color-surface)"; }}
                        >
                          <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary-700)", whiteSpace: "nowrap", fontSize: 11 }}>
                            {r.submission_id || "—"}
                          </td>
                          <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                            {r.candidate_name || "—"}
                          </td>
                          <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                            {r.phone || "—"}
                          </td>
                          <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                            <div style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "var(--color-primary-700)" }}>{r.req_id}</div>
                            <div style={{ color: "var(--color-text-secondary)", fontSize: 11, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{r.position_title}</div>
                          </td>
                          <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                            {r.interviewer_name || "—"}
                          </td>
                          <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)", textAlign: "center" }}>
                            {r.experience_years ? `${r.experience_years} yr` : "—"}
                          </td>
                          <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)", textAlign: "right", whiteSpace: "nowrap" }}>
                            {r.current_ctc ? `₹${r.current_ctc}L` : "—"}
                          </td>
                          <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)", textAlign: "right", whiteSpace: "nowrap" }}>
                            {r.expected_ctc ? `₹${r.expected_ctc}L` : "—"}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {r.fit_assessment ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: 3,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: fitStyle.bg,
                                  color: fitStyle.color,
                                  border: `1px solid ${fitStyle.color}`,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {r.fit_assessment}
                              </span>
                            ) : "—"}
                          </td>
                          {(() => {
                            const cs = getCurrentStatus(r);
                            return (
                              <td style={{ padding: "8px 12px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  <span style={{ fontSize: 9, fontWeight: 600, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{cs.module}</span>
                                  <span style={{
                                    display: "inline-block", padding: "2px 7px", borderRadius: 3,
                                    fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
                                    background: cs.color.bg, color: cs.color.color, border: `1px solid ${cs.color.color}`,
                                  }}>
                                    {cs.label}
                                  </span>
                                </div>
                              </td>
                            );
                          })()}
                          <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)", whiteSpace: "nowrap", fontSize: 11 }}>
                            {formatDate(r.submitted_at)}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <div className="flex items-center gap-1.5">
                              {r.resume_link && (
                                <a
                                  href={r.resume_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  title="View Resume"
                                  style={{ color: "var(--color-primary-700)", display: "inline-flex" }}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                  </svg>
                                </a>
                              )}
                              {r.call_recording_link && (
                                <a
                                  href={r.call_recording_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  title="View Recording"
                                  style={{ color: "var(--color-primary-700)", display: "inline-flex" }}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                                  </svg>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${r.submission_id}-exp`} style={{ background: "var(--color-primary-50)", borderBottom: "2px solid var(--color-accent-500)" }}>
                            <td colSpan={12} style={{ padding: "10px 14px" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {/* Candidate details */}
                                <div className="grid grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2" style={{ fontSize: 11 }}>
                                  {[
                                    { label: "Email",         value: r.candidate_email || "—" },
                                    { label: "Source",        value: r.source || "—" },
                                    { label: "Company",       value: r.current_company || "—" },
                                    { label: "Notice Period", value: r.notice_period || "—" },
                                    { label: "Job Location",  value: r.job_location || "—" },
                                    { label: "Submitted By",  value: r.submitted_by || "—" },
                                  ].map(({ label, value }) => (
                                    <div key={label}>
                                      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 1 }}>{label}</div>
                                      <div style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{value}</div>
                                    </div>
                                  ))}
                                </div>
                                {/* Pipeline */}
                                <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
                                  <div style={{ fontSize: 9, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Candidate Pipeline</div>
                                  <CandidatePipelineCard
                                    cand={r}
                                    interviews={intMap[r.submission_id] || []}
                                    approval={approvalMap[r.submission_id] || null}
                                  />
                                </div>
                                {/* Screening remarks — below pipeline */}
                                {r.screening_remarks && (
                                  <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Screening Remarks</div>
                                    <div style={{ fontSize: 11, color: "var(--color-text-primary)", lineHeight: 1.5 }}>{r.screening_remarks}</div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3 p-3">
              {filtered.map(r => {
                const fitStyle = fitColors[r.fit_assessment] || {};
                const isExpanded = expandedRec === r.submission_id;
                return (
                  <div
                    key={r.submission_id}
                    className="enterprise-card overflow-hidden"
                    onClick={() => onExpand(isExpanded ? null : r.submission_id)}
                    style={{ cursor: "pointer", border: isExpanded ? "1.5px solid var(--color-accent-500)" : undefined }}
                  >
                    {/* Card header */}
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <div className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>{r.candidate_name || "—"}</div>
                          <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{r.phone || ""}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {r.fit_assessment && (
                            <span style={{ padding: "2px 8px", borderRadius: 3, fontSize: 10, fontWeight: 700, background: fitStyle.bg, color: fitStyle.color, border: `1px solid ${fitStyle.color}`, flexShrink: 0 }}>
                              {r.fit_assessment}
                            </span>
                          )}
                          {(() => {
                            const cs = getCurrentStatus(r);
                            if (cs.label !== r.fit_assessment) return (
                              <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                                <span style={{ fontSize: 8, fontWeight: 600, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{cs.module}</span>
                                <span style={{ padding: "2px 7px", borderRadius: 3, fontSize: 9, fontWeight: 700, background: cs.color.bg, color: cs.color.color, border: `1px solid ${cs.color.color}`, whiteSpace: "nowrap" }}>
                                  {cs.label}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-primary-700)", fontFamily: "monospace", fontWeight: 700 }}>{r.req_id}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{r.position_title}</div>
                      <div className="flex flex-wrap gap-2 mt-2" style={{ fontSize: 11 }}>
                        {r.experience_years && <span style={{ color: "var(--color-text-secondary)" }}>Exp: <strong>{r.experience_years} yr</strong></span>}
                        {r.current_ctc && <span style={{ color: "var(--color-text-secondary)" }}>CTC: <strong>₹{r.current_ctc}L</strong></span>}
                        {r.expected_ctc && <span style={{ color: "var(--color-text-secondary)" }}>Exp CTC: <strong>₹{r.expected_ctc}L</strong></span>}
                      </div>
                    </div>
                    {/* Expanded details + pipeline */}
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid var(--color-border)", padding: "8px 12px", background: "var(--color-primary-50)" }}>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2" style={{ fontSize: 11 }}>
                          {[
                            { label: "Interviewer", value: r.interviewer_name },
                            { label: "Source",      value: r.source },
                            { label: "Company",     value: r.current_company },
                            { label: "Notice",      value: r.notice_period },
                            { label: "Location",    value: r.job_location },
                            { label: "Email",       value: r.candidate_email },
                            { label: "Date",        value: formatDate(r.submitted_at) },
                            { label: "By",          value: r.submitted_by },
                          ].map(({ label, value }) => value ? (
                            <div key={label}>
                              <div style={{ fontWeight: 700, color: "var(--color-text-secondary)", fontSize: 9 }}>{label}</div>
                              <div style={{ color: "var(--color-text-primary)" }}>{value}</div>
                            </div>
                          ) : null)}
                        </div>
                        {/* Pipeline */}
                        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Pipeline</div>
                        <CandidatePipelineCard
                          cand={r}
                          interviews={intMap[r.submission_id] || []}
                          approval={approvalMap[r.submission_id] || null}
                        />
                        {/* Screening remarks — below pipeline */}
                        {r.screening_remarks && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--color-border)" }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Screening Remarks</div>
                            <div style={{ fontSize: 11, color: "var(--color-text-primary)", lineHeight: 1.5 }}>{r.screening_remarks}</div>
                          </div>
                        )}
                        {(r.resume_link || r.call_recording_link) && (
                          <div className="flex gap-2 mt-3">
                            {r.resume_link && (
                              <a href={r.resume_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                className="h-7 px-3 text-xs font-semibold rounded-sm flex items-center gap-1"
                                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-primary-700)", textDecoration: "none" }}>
                                📄 Resume
                              </a>
                            )}
                            {r.call_recording_link && (
                              <a href={r.call_recording_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                className="h-7 px-3 text-xs font-semibold rounded-sm flex items-center gap-1"
                                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-primary-700)", textDecoration: "none" }}>
                                🎙 Recording
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Candidate Pipeline Status ─────────────────────────────── */

const STAGE_COLOR = {
  Shortlisted:    { color: "#16a34a", bg: "rgba(22,163,74,0.12)"  },
  "On Hold":      { color: "#d97706", bg: "rgba(217,119,6,0.12)"  },
  Rejected:       { color: "#dc2626", bg: "rgba(198,40,40,0.12)"  },
  "Move Forward": { color: "#16a34a", bg: "rgba(22,163,74,0.12)"  },
  Selected:       { color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  "Not Selected": { color: "#dc2626", bg: "rgba(198,40,40,0.12)"  },
  Hold:           { color: "#d97706", bg: "rgba(217,119,6,0.12)"  },
  Approved:       { color: "#16a34a", bg: "rgba(22,163,74,0.12)"  },
  Pending:        { color: "#94a3b8", bg: "rgba(148,163,184,0.10)"},
};

function stageDot(value) {
  const s = STAGE_COLOR[value] || STAGE_COLOR["Pending"];
  return s;
}

function PipelineBadge({ label, small }) {
  const s = STAGE_COLOR[label] || STAGE_COLOR["Pending"];
  return (
    <span style={{
      display: "inline-block",
      padding: small ? "1px 5px" : "2px 7px",
      borderRadius: 3, fontSize: small ? 9 : 10,
      fontWeight: 700, background: s.bg, color: s.color,
      border: `1px solid ${s.color}`,
      whiteSpace: "nowrap",
    }}>{label || "Pending"}</span>
  );
}

function CandidatePipelineCard({ cand, interviews, approval }) {
  const rounds = [...interviews].sort((a, b) => {
    const n = s => parseInt((s || "").replace(/\D/g, "") || "0");
    return n(a.interview_round) - n(b.interview_round);
  });
  const approvalDecision = approval?.decision || null;

  // Collapse rounds into a single Interview stage
  const interviewDone = rounds.length > 0 && rounds.every(r => !!r.final_decision);
  const interviewRejected = rounds.some(r => r.final_decision === "Not Selected");
  const interviewValue = interviewRejected ? "Not Selected" : interviewDone ? "Selected" : null;

  // Build ordered stages
  const stages = [
    {
      key: "screening",
      icon: "S",
      label: "Screening",
      sublabel: null,
      value: cand.fit_assessment || null,
      done: !!cand.fit_assessment,
      rejected: cand.fit_assessment === "Rejected",
    },
    {
      key: "interview",
      icon: "I",
      label: "Interview",
      sublabel: null,
      value: interviewValue,
      done: interviewDone,
      rejected: interviewRejected,
      rounds,
    },
    {
      key: "offer",
      icon: "✓",
      label: "Offer Decision",
      sublabel: approval ? `by ${approval.approved_by}` : null,
      value: approvalDecision,
      done: !!approvalDecision,
      rejected: approvalDecision === "Rejected",
      isOffer: true,
    },
  ];

  // Determine the "active" stage index (first incomplete)
  const activeIdx = stages.findIndex(s => !s.done);

  function nodeStyle(stage, idx) {
    const isPast   = stage.done;
    const isActive = !stage.done && idx === activeIdx;
    if (stage.rejected) return { bg: "#dc2626", border: "#dc2626", text: "#fff" };
    if (isPast) {
      const c = STAGE_COLOR[stage.value] || { color: "#16a34a", bg: "#16a34a" };
      return { bg: c.color, border: c.color, text: "#fff" };
    }
    if (isActive) return { bg: "#fff", border: "var(--color-primary-700)", text: "var(--color-primary-700)" };
    return { bg: "var(--color-surface)", border: "var(--color-border)", text: "var(--color-text-secondary)" };
  }

  function lineColor(idx) {
    // line after stage idx — colored if stage idx is done
    if (stages[idx]?.done && !stages[idx]?.rejected) {
      const c = STAGE_COLOR[stages[idx].value] || { color: "#16a34a" };
      return c.color;
    }
    if (stages[idx]?.rejected) return "#dc2626";
    return "var(--color-border)";
  }

  return (
    <div style={{ width: "100%", padding: "4px 0", overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", minWidth: 280 }}>
        {stages.map((stage, idx) => {
          const ns = nodeStyle(stage, idx);
          const isLast = idx === stages.length - 1;
          const badgeStyle = STAGE_COLOR[stage.value] || STAGE_COLOR["Pending"];
          return (
            <React.Fragment key={stage.key}>
              {/* Stage node */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, minWidth: 60, maxWidth: 90 }}>
                {/* Circle */}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: ns.bg, border: `2px solid ${ns.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: stage.isOffer ? 12 : 11, fontWeight: 800,
                  color: ns.text, boxShadow: stage.done ? `0 0 0 2px ${ns.border}22` : "none",
                  flexShrink: 0, position: "relative", zIndex: 1,
                }}>
                  {stage.done && !stage.rejected
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
                    : stage.rejected
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="11" height="11"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    : stage.icon}
                </div>
                {/* Stage label */}
                <div style={{ marginTop: 5, fontSize: 9, fontWeight: 700, color: "var(--color-text-primary)", textAlign: "center", whiteSpace: "nowrap", maxWidth: 84, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {stage.label}{stage.isFinal ? " 🏁" : ""}
                </div>
                {/* Sub-label (remarks / round description / by whom) */}
                {stage.sublabel && (
                  <div style={{ fontSize: 9, color: "var(--color-text-secondary)", textAlign: "center", maxWidth: 84, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }} title={stage.sublabel}>
                    {stage.sublabel}
                  </div>
                )}
                {/* Value badge */}
                {stage.value ? (
                  <div style={{ marginTop: 3 }}>
                    <span style={{
                      display: "inline-block", padding: "1px 5px", borderRadius: 3,
                      fontSize: 9, fontWeight: 700, whiteSpace: "nowrap",
                      background: badgeStyle.bg, color: badgeStyle.color, border: `1px solid ${badgeStyle.color}`,
                    }}>{stage.value}</span>
                  </div>
                ) : (
                  <div style={{ marginTop: 3 }}>
                    <span style={{ fontSize: 9, color: "var(--color-text-secondary)", fontStyle: "italic" }}>Pending</span>
                  </div>
                )}
                {/* Rounds list — only for Interview stage */}
                {stage.rounds && stage.rounds.length > 0 && (
                  <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start", minWidth: 110, maxWidth: 160 }}>
                    {stage.rounds.map((r, i) => {
                      const isFinal = r.is_final_round === true || String(r.is_final_round).toLowerCase() === "true";
                      const rb = STAGE_COLOR[r.final_decision] || STAGE_COLOR["Pending"];
                      return (
                        <div key={r.interview_id || i} style={{ display: "flex", alignItems: "center", gap: 4, width: "100%" }}>
                          <span style={{ fontSize: 8, fontWeight: 700, color: "var(--color-text-secondary)", flexShrink: 0 }}>{i + 1}.</span>
                          <span style={{ fontSize: 9, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                            {r.round_description || r.interview_round || `Round ${i + 1}`}{isFinal ? " 🏁" : ""}
                          </span>
                          {r.final_decision && (
                            <span style={{ padding: "0 4px", borderRadius: 2, fontSize: 8, fontWeight: 700, whiteSpace: "nowrap", background: rb.bg, color: rb.color, border: `1px solid ${rb.color}`, flexShrink: 0 }}>
                              {r.final_decision}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div style={{
                  flex: 1, height: 2, marginTop: 13, borderRadius: 2,
                  background: lineColor(idx),
                  transition: "background 0.3s",
                  minWidth: 16,
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */

export default function ScreeningPage() {
  const { user } = useAuth();

  const [reqs, setReqs]                       = useState([]);
  const [loadingReqs, setLoadingReqs]         = useState(true);
  const [selected, setSelected]               = useState(null);
  const [screeningCounts, setScreeningCounts] = useState({});
  const [form, setForm]                       = useState(EMPTY_FORM);
  const [errors, setErrors]                   = useState({});
  const [saving, setSaving]                   = useState(false);
  const [success, setSuccess]                 = useState(null);
  const [submitError, setSubmitError]         = useState("");
  const [resumeFile, setResumeFile]           = useState(null);
  const [recordingFile, setRecordingFile]     = useState(null);

  const [activeTab, setActiveTab]         = useState("form");   // "form" | "records" | "status"
  const [allScreenings, setAllScreenings] = useState([]);
  const [loadingRecs, setLoadingRecs]     = useState(false);
  const [recSearch, setRecSearch]         = useState("");
  const [recFilterReq, setRecFilterReq]   = useState("");
  const [recFilterFit, setRecFilterFit]   = useState("");
  const [expandedRec, setExpandedRec]     = useState(null);

  const [allInterviews, setAllInterviews] = useState([]);
  const [allApprovals,  setAllApprovals]  = useState([]);

  /* ── Load requisitions + screening counts on mount ── */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoadingReqs(true);
    const [reqRes, scrRes] = await Promise.all([
      getRequisitions(),
      getScreenings(),
    ]);

    if (reqRes?.rows) {
      const eligible = reqRes.rows.filter(
        r => r.status === "Approved" || r.status === "Hiring in Progress"
      );
      setReqs(eligible);
    }

    if (scrRes?.rows) {
      const counts = {};
      scrRes.rows.forEach(r => {
        counts[r.req_id] = (counts[r.req_id] || 0) + 1;
      });
      setScreeningCounts(counts);
      setAllScreenings(scrRes.rows);
    }

    setLoadingReqs(false);
  }

  async function loadRecords() {
    setLoadingRecs(true);
    const [scrRes, intRes, aprRes] = await Promise.all([
      getScreenings(), getInterviews(), getApprovals(),
    ]);
    if (scrRes?.rows) {
      setAllScreenings(scrRes.rows);
      const counts = {};
      scrRes.rows.forEach(r => { counts[r.req_id] = (counts[r.req_id] || 0) + 1; });
      setScreeningCounts(counts);
    }
    if (intRes?.rows) setAllInterviews(intRes.rows);
    if (aprRes?.rows) setAllApprovals(aprRes.rows);
    setLoadingRecs(false);
  }

  /* ── Select a requisition ── */
  function handleSelectReq(req) {
    setSelected(req);
    setForm({ ...EMPTY_FORM, job_location: req.location || "" });
    setErrors({});
    setSuccess(null);
    setSubmitError("");
    setResumeFile(null);
    setRecordingFile(null);
  }

  /* ── Field setter ── */
  function setF(k, v) {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }));
  }

  /* ── Validation ── */
  function validate() {
    const e = {};
    if (!form.interviewer_name)  e.interviewer_name  = "Select an interviewer";
    if (!form.source)            e.source            = "Select a source";
    if (!form.candidate_name.trim()) e.candidate_name = "Required";
    if (!form.phone.trim())      e.phone             = "Required";
    if (!form.experience_years.trim()) e.experience_years = "Required";
    if (!form.fit_assessment)    e.fit_assessment    = "Select a fit assessment";
    if (!form.job_location.trim()) e.job_location    = "Required";
    if (!form.notice_period)     e.notice_period     = "Select notice period";
    if (!form.current_ctc.trim()) e.current_ctc      = "Required";
    if (!form.expected_ctc.trim()) e.expected_ctc    = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /* ── Submit ── */
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) {
      // Scroll to first error
      const firstErr = document.querySelector("[data-field-error]");
      if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(true);
    setSubmitError("");

    try {
      const payload = {
        req_id:           selected.req_id,
        position_title:   selected.position_title,
        interviewer_name: form.interviewer_name,
        candidate_name:   form.candidate_name.trim(),
        phone:            form.phone.trim(),
        candidate_email:  form.candidate_email.trim(),
        experience_years: form.experience_years.trim(),
        source:           form.source,
        current_company:  form.current_company.trim(),
        job_location:     form.job_location.trim(),
        notice_period:    form.notice_period,
        current_ctc:      form.current_ctc.trim(),
        expected_ctc:     form.expected_ctc.trim(),
        screening_remarks: form.screening_remarks.trim(),
        fit_assessment:   form.fit_assessment,
        submitted_by:     user?.email || "",
      };

      // Resume
      if (resumeFile) {
        payload.resume_base64 = await readFile(resumeFile);
        payload.resume_ext    = getFileExt(resumeFile);
        payload.resume_mime   = resumeFile.type || "application/octet-stream";
      }

      // Call recording
      if (recordingFile) {
        payload.recording_base64 = await readFile(recordingFile);
        payload.recording_ext    = getFileExt(recordingFile);
        payload.recording_mime   = recordingFile.type || "audio/mpeg";
      }

      const res = await submitScreening(payload);

      // Require both success:true AND a submission_id — proves the sheet row was written
      if (!res?.success || !res?.submission_id) {
        throw new Error(res?.error || "Submission failed — data was not saved to the sheet. Check GAS deployment.");
      }

      // Reload from sheet to reflect actual stored data
      const freshData = await getScreenings();
      if (freshData?.rows) {
        setAllScreenings(freshData.rows);
        const counts = {};
        freshData.rows.forEach(r => { counts[r.req_id] = (counts[r.req_id] || 0) + 1; });
        setScreeningCounts(counts);
      }

      setSuccess({
        submission_id:       res.submission_id,
        candidate_name:      form.candidate_name.trim(),
        fit_assessment:      form.fit_assessment,
        resume_link:         res.resume_link || "",
        call_recording_link: res.call_recording_link || "",
        req_id:              selected.req_id,
        position_title:      selected.position_title,
      });
    } catch (err) {
      setSubmitError(err.message || "Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Screen Another (same req) ── */
  function handleScreenAnother() {
    setSuccess(null);
    setForm({ ...EMPTY_FORM, job_location: selected?.location || "" });
    setErrors({});
    setSubmitError("");
    setResumeFile(null);
    setRecordingFile(null);
  }

  /* ─── Success screen ─────────────────────────────────────── */
  if (success) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <div
          className="flex items-center px-3 sm:px-6 flex-shrink-0"
          style={{ background: "var(--color-primary-900)", borderBottom: "1px solid rgba(255,255,255,0.07)", height: 56 }}
        >
          <h1 className="text-sm font-bold text-white">Screening Submitted</h1>
        </div>
        <div className="flex items-center justify-center p-4 sm:p-8 custom-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
          <div className="enterprise-card p-6 sm:p-10 text-center max-w-lg w-full">
            {/* Success icon */}
            <div className="flex items-center justify-center mb-4">
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 52, height: 52, background: "rgba(46,125,50,0.1)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
            <h2 className="text-lg font-bold mb-1" style={{ color: "var(--color-success)" }}>
              Screening Recorded
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
              Candidate screening has been saved successfully.
            </p>

            {/* Submission ID */}
            <div
              className="inline-block px-5 py-3 rounded-sm mb-4"
              style={{ background: "var(--color-primary-50)", border: "1px solid var(--color-border)" }}
            >
              <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-secondary)" }}>
                Submission ID
              </div>
              <div className="font-mono text-xl font-extrabold" style={{ color: "var(--color-primary-700)" }}>
                {success.submission_id}
              </div>
            </div>

            {/* Summary chips */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {[
                { l: "Candidate", v: success.candidate_name },
                { l: "Requisition", v: success.req_id },
                { l: "Position", v: success.position_title },
              ].map(({ l, v }) => (
                <div
                  key={l}
                  className="px-3 py-1.5 rounded-sm text-xs"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  <span style={{ color: "var(--color-text-secondary)" }}>{l}: </span>
                  <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Fit assessment badge */}
            <div className="flex justify-center mb-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                  Assessment:
                </span>
                <FitBadge value={success.fit_assessment} />
              </div>
            </div>

            {/* Drive links */}
            {(success.resume_link || success.call_recording_link) && (
              <div
                className="rounded-sm p-4 mb-5 flex flex-wrap justify-center gap-2"
                style={{ background: "var(--color-primary-50)", border: "1px solid var(--color-border)" }}
              >
                {success.resume_link && (
                  <a
                    href={success.resume_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-sm"
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-primary-700)",
                      textDecoration: "none",
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    View Resume
                  </a>
                )}
                {success.call_recording_link && (
                  <a
                    href={success.call_recording_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-sm"
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-primary-700)",
                      textDecoration: "none",
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    </svg>
                    View Recording
                  </a>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleScreenAnother}
                className="h-9 px-5 text-sm font-semibold rounded-sm"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                }}
              >
                Screen Another Candidate
              </button>
              <button
                onClick={() => {
                  alert(`All screenings for ${success.req_id} — ${success.position_title}\n\nSubmission ID: ${success.submission_id}\n\nRefresh the page to see updated counts in the left panel.`);
                }}
                className="h-9 px-5 text-sm font-semibold rounded-sm text-white"
                style={{ background: "var(--color-primary-800)", border: "none", cursor: "pointer" }}
              >
                View All Screenings for this Req
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Main layout ────────────────────────────────────────── */
  const inputCls    = "enterprise-input";
  const textareaCls = "enterprise-input h-auto py-2";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-3 sm:px-6 flex-shrink-0"
        style={{ background: "var(--color-primary-900)", borderBottom: "1px solid rgba(255,255,255,0.07)", height: 56 }}
      >
        {/* Left: title + tabs */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0 hidden sm:block">
            <h1 className="text-sm font-bold text-white leading-tight">Candidate Screening</h1>
          </div>
          <div className="flex items-center gap-1">
            {[
              { key: "form",    label: "New Screening" },
              { key: "records", label: "Records" },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  if (tab.key === "records") loadRecords();
                }}
                className="h-7 px-3 text-xs font-semibold rounded-sm transition-all"
                style={{
                  background: activeTab === tab.key ? "rgba(200,169,81,0.25)" : "rgba(255,255,255,0.07)",
                  color: activeTab === tab.key ? "var(--color-accent-500)" : "rgba(255,255,255,0.6)",
                  border: activeTab === tab.key ? "1px solid rgba(200,169,81,0.4)" : "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                }}
              >
                {tab.label}
                {tab.key === "records" && allScreenings.length > 0 && (
                  <span
                    className="ml-1.5 px-1 rounded-sm font-bold"
                    style={{ fontSize: 9, background: "var(--color-accent-500)", color: "#fff" }}
                  >
                    {allScreenings.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        {/* Right: refresh */}
        <button
          onClick={() => { loadData(); if (activeTab === "records") loadRecords(); }}
          className="flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-sm flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {activeTab === "form" ? (
        /* ── Two-panel layout — fills remaining viewport height ── */
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>

            {/* ── Left panel: requisition list (hidden on mobile when req selected) ── */}
            <div
              className={`flex-shrink-0 flex flex-col gap-2 custom-scrollbar ${selected ? "hidden md:flex" : "flex"}`}
              style={{
                width: "min(272px, 100%)",
                overflowY: "auto",
                borderRight: "1px solid var(--color-border)",
                padding: "14px 12px",
                background: "var(--color-background)",
              }}
            >
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <span
                  className="text-xs font-bold uppercase"
                  style={{ color: "var(--color-text-secondary)", letterSpacing: "0.08em" }}
                >
                  Approved Requisitions
                </span>
                {!loadingReqs && (
                  <span
                    className="px-1.5 py-0.5 rounded-sm font-semibold"
                    style={{
                      fontSize: 10,
                      background: "var(--color-primary-50)",
                      color: "var(--color-primary-700)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    {reqs.length} available
                  </span>
                )}
              </div>

              {loadingReqs ? (
                <div
                  className="enterprise-card p-6 text-center text-xs flex items-center justify-center gap-2"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Loading…
                </div>
              ) : reqs.length === 0 ? (
                <div
                  className="enterprise-card p-6 text-center text-xs"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <div className="text-2xl mb-2">📋</div>
                  No approved requisitions yet.
                </div>
              ) : (
                reqs.map(req => {
                  const isActive = selected?.req_id === req.req_id;
                  const count = screeningCounts[req.req_id] || 0;
                  return (
                    <button
                      key={req.req_id}
                      onClick={() => handleSelectReq(req)}
                      className="text-left rounded-sm transition-all p-3 w-full"
                      style={{
                        background: "var(--color-surface)",
                        border: `2px solid ${isActive ? "var(--color-accent-500)" : "var(--color-border)"}`,
                        boxShadow: isActive ? "0 0 0 1px var(--color-accent-500)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <div
                          className="font-mono text-xs font-bold"
                          style={{ color: "var(--color-primary-700)" }}
                        >
                          {req.req_id}
                        </div>
                        {count > 0 && (
                          <span
                            className="flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-sm"
                            style={{
                              background: "var(--color-accent-500)",
                              color: "#fff",
                              fontSize: 10,
                              lineHeight: "1.4",
                            }}
                          >
                            {count} screened
                          </span>
                        )}
                      </div>
                      <div
                        className="text-sm font-semibold leading-tight mb-0.5"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {req.position_title}
                      </div>
                      <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {req.department}{req.department && req.location ? " · " : ""}{req.location}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-sm font-medium"
                          style={{
                            background: req.status === "Approved" ? "rgba(22,163,74,0.1)" : "rgba(12,84,96,0.1)",
                            color: req.status === "Approved" ? "var(--color-success)" : "#0c5460",
                            fontSize: 10,
                          }}
                        >
                          {req.status}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* ── Right panel: form or placeholder ── */}
            <div className="flex-1 min-w-0 custom-scrollbar" style={{ overflowY: "auto", padding: "16px 20px" }}>
              {/* Mobile back button — only visible when req is selected */}
              {selected && (
                <button
                  type="button"
                  onClick={() => { setSelected(null); setForm(EMPTY_FORM); setErrors({}); setSubmitError(""); setResumeFile(null); setRecordingFile(null); }}
                  className="md:hidden flex items-center gap-1.5 text-xs font-semibold mb-3"
                  style={{ color: "var(--color-primary-700)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
                  Back to requisitions
                </button>
              )}
              {!selected ? (
                <div
                  className="enterprise-card flex flex-col items-center justify-center text-center py-20 px-8"
                  style={{ color: "var(--color-text-secondary)", minHeight: 320 }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="48"
                    height="48"
                    style={{ color: "var(--color-border)", marginBottom: 16 }}
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                    Select a requisition to begin screening
                  </p>
                  <p className="text-xs">
                    Choose an approved or in-progress requisition from the left panel.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 pb-4">

                  {/* ── Section 1: Interviewer & Req Info ── */}
                  <div className="enterprise-card overflow-hidden">
                    <SectionHeader>Screening Session Info</SectionHeader>
                    <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">

                      {/* Req ID (read-only) */}
                      <Field label="Requisition ID">
                        <div
                          className="enterprise-input text-sm font-mono font-bold"
                          style={{ color: "var(--color-primary-700)", opacity: 0.75, cursor: "not-allowed", userSelect: "none" }}
                        >
                          {selected.req_id}
                        </div>
                      </Field>

                      {/* Position (read-only) */}
                      <Field label="Position Screened For">
                        <div className="enterprise-input text-sm" style={{ opacity: 0.75, cursor: "not-allowed", userSelect: "none" }}>
                          {selected.position_title}
                        </div>
                      </Field>

                      {/* Interviewer Name (radio) */}
                      <div className="col-span-1 sm:col-span-2">
                        <Field
                          label="Interviewer Name"
                          required
                          error={errors.interviewer_name}
                        >
                          <div data-field-error={errors.interviewer_name ? "1" : undefined}>
                            <RadioChips
                              options={INTERVIEWERS}
                              value={form.interviewer_name}
                              onChange={v => setF("interviewer_name", v)}
                            />
                          </div>
                        </Field>
                      </div>

                    </div>
                  </div>

                  {/* ── Section 2: Candidate Info ── */}
                  <div className="enterprise-card overflow-hidden">
                    <SectionHeader>Candidate Information</SectionHeader>
                    <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">

                      <Field label="Candidate Name" required error={errors.candidate_name}>
                        <input
                          className={inputCls}
                          value={form.candidate_name}
                          onChange={e => setF("candidate_name", e.target.value)}
                          placeholder="Full name of candidate"
                          data-field-error={errors.candidate_name ? "1" : undefined}
                        />
                      </Field>

                      <Field label="Phone Number" required error={errors.phone}>
                        <input
                          className={inputCls}
                          value={form.phone}
                          onChange={e => setF("phone", e.target.value)}
                          placeholder="10-digit mobile number"
                          inputMode="tel"
                          data-field-error={errors.phone ? "1" : undefined}
                        />
                      </Field>

                      <Field label="Email ID" error={errors.candidate_email}>
                        <input
                          className={inputCls}
                          type="email"
                          value={form.candidate_email}
                          onChange={e => setF("candidate_email", e.target.value)}
                          placeholder="candidate@email.com"
                        />
                      </Field>

                      <Field
                        label="Total Years of Experience"
                        required
                        error={errors.experience_years}
                      >
                        <input
                          className={inputCls}
                          value={form.experience_years}
                          onChange={e => setF("experience_years", e.target.value)}
                          placeholder="e.g. 3.5"
                          data-field-error={errors.experience_years ? "1" : undefined}
                        />
                      </Field>

                      <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                        <Field label="Current Company, Designation & Working Since">
                          <textarea
                            className={textareaCls}
                            rows={2}
                            value={form.current_company}
                            onChange={e => setF("current_company", e.target.value)}
                            placeholder="e.g. ABC Logistics, Warehouse Supervisor, Jan 2022"
                          />
                        </Field>
                      </div>

                    </div>
                  </div>

                  {/* ── Section 3: Source ── */}
                  <div className="enterprise-card overflow-hidden">
                    <SectionHeader>Source of Candidate</SectionHeader>
                    <div className="p-3 md:p-4">
                      <Field label="Source" required error={errors.source}>
                        <div data-field-error={errors.source ? "1" : undefined}>
                          <RadioChips
                            options={SOURCES}
                            value={form.source}
                            onChange={v => setF("source", v)}
                          />
                        </div>
                      </Field>
                    </div>
                  </div>

                  {/* ── Section 4: Job Details ── */}
                  <div className="enterprise-card overflow-hidden">
                    <SectionHeader>Job & Compensation Details</SectionHeader>
                    <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">

                      <Field label="Job Location" required error={errors.job_location}>
                        <input
                          className={inputCls}
                          value={form.job_location}
                          readOnly
                          style={{ opacity: 0.7, cursor: "not-allowed" }}
                        />
                      </Field>

                      <Field label="Current CTC in Lakhs" required error={errors.current_ctc}>
                        <input
                          className={inputCls}
                          value={form.current_ctc}
                          onChange={e => setF("current_ctc", e.target.value)}
                          placeholder="e.g. 4.5"
                          data-field-error={errors.current_ctc ? "1" : undefined}
                        />
                      </Field>

                      <Field label="Expected CTC in Lakhs" required error={errors.expected_ctc}>
                        <input
                          className={inputCls}
                          value={form.expected_ctc}
                          onChange={e => setF("expected_ctc", e.target.value)}
                          placeholder="e.g. 6"
                          data-field-error={errors.expected_ctc ? "1" : undefined}
                        />
                      </Field>

                      {/* Notice Period */}
                      <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                        <Field label="Notice Period" required error={errors.notice_period}>
                          <div data-field-error={errors.notice_period ? "1" : undefined}>
                            <RadioChips
                              options={NOTICE_OPTIONS}
                              value={form.notice_period}
                              onChange={v => setF("notice_period", v)}
                            />
                          </div>
                        </Field>
                      </div>

                    </div>
                  </div>

                  {/* ── Section 5: Screening Outcome ── */}
                  <div className="enterprise-card overflow-hidden">
                    <SectionHeader>Screening Outcome</SectionHeader>
                    <div className="p-3 md:p-4 flex flex-col gap-4">

                      <Field label="Screening Remarks">
                        <textarea
                          className={textareaCls}
                          rows={3}
                          value={form.screening_remarks}
                          onChange={e => setF("screening_remarks", e.target.value)}
                          placeholder="Observations, strengths, concerns, notes from the screening call…"
                        />
                      </Field>

                      <Field
                        label="Overall Candidate Fit Assessment"
                        required
                        error={errors.fit_assessment}
                      >
                        <div data-field-error={errors.fit_assessment ? "1" : undefined}>
                          <FitChips
                            value={form.fit_assessment}
                            onChange={v => setF("fit_assessment", v)}
                          />
                        </div>
                      </Field>

                    </div>
                  </div>

                  {/* ── Section 6: Documents ── */}
                  <div className="enterprise-card overflow-hidden">
                    <SectionHeader>Documents (Optional)</SectionHeader>
                    <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">

                      <Field
                        label="Upload Resume"
                        hint="PDF, DOC, or DOCX · Max 5 MB"
                      >
                        <FileDropZone
                          id="resume-upload"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          maxMB={MAX_RESUME_MB}
                          file={resumeFile}
                          onChange={setResumeFile}
                          label="Click to upload Resume"
                        />
                      </Field>

                      <Field
                        label="Upload Call Recording"
                        hint="MP3, MP4, WAV or any audio · Max 15 MB"
                      >
                        <FileDropZone
                          id="recording-upload"
                          accept="audio/*,.mp3,.mp4,.wav,.m4a,.ogg"
                          maxMB={MAX_RECORDING_MB}
                          file={recordingFile}
                          onChange={setRecordingFile}
                          label="Click to upload Recording"
                        />
                      </Field>

                    </div>
                  </div>

                  {/* ── Submit bar ── */}
                  <div className="flex flex-col gap-2 pb-2">
                    {submitError && (
                      <div
                        className="text-xs px-3 py-2 rounded-sm font-medium"
                        style={{
                          background: "rgba(198,40,40,0.08)",
                          color: "var(--color-danger)",
                          border: "1px solid rgba(198,40,40,0.2)",
                        }}
                      >
                        ⚠ {submitError}
                      </div>
                    )}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => { setSelected(null); setSuccess(null); setForm(EMPTY_FORM); setErrors({}); setSubmitError(""); setResumeFile(null); setRecordingFile(null); }}
                        className="h-9 px-5 text-sm font-semibold rounded-sm"
                        style={{
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text-primary)",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="h-9 px-5 text-sm font-semibold rounded-sm text-white disabled:opacity-60"
                        style={{
                          background: "var(--color-primary-800)",
                          border: "none",
                          cursor: saving ? "not-allowed" : "pointer",
                        }}
                      >
                        {saving ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                            </svg>
                            Submitting…
                          </span>
                        ) : (
                          "Submit Screening →"
                        )}
                      </button>
                    </div>
                  </div>

                </form>
              )}
            </div>

        </div>
      ) : (
        /* ── Records tab ── */
        <ScreeningRecords
          screenings={allScreenings}
          interviews={allInterviews}
          approvals={allApprovals}
          loading={loadingRecs}
          reqs={reqs}
          search={recSearch}
          onSearch={setRecSearch}
          filterReq={recFilterReq}
          onFilterReq={setRecFilterReq}
          filterFit={recFilterFit}
          onFilterFit={setRecFilterFit}
          expandedRec={expandedRec}
          onExpand={setExpandedRec}
        />
      )}
    </div>
  );
}
