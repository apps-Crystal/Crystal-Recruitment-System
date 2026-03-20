/**
 * Module 6 — Document Collection (SOP-HR-001 §10)
 * Senior HR Executive sends document request, verifies uploads, marks DocsVerified.
 * Stage advances to OFFER_APPROVAL only after all mandatory docs are verified.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getScreenings, getCandidateDocuments, sendDocumentRequest, updateDocumentStatus, markDocsVerified } from "../utils/api";

/* SOP §10.1 Required Documents Checklist */
const DOC_TYPES = [
  { key:"PHOTO_ID",   label:"Government-issued Photo ID",          notes:"Aadhaar / PAN / Passport — must be valid, in date and clearly legible", mandatory:true  },
  { key:"DEGREE",     label:"Highest Educational Degree Certificate", notes:"Scanned or photographed copy; original on joining day",                mandatory:true  },
  { key:"PAYSLIP_1",  label:"Payslip — Month 1",                   notes:"From current or most recent employer; must show employer name and salary", mandatory:true  },
  { key:"PAYSLIP_2",  label:"Payslip — Month 2",                   notes:"From current or most recent employer",                                    mandatory:true  },
  { key:"PAYSLIP_3",  label:"Payslip — Month 3",                   notes:"From current or most recent employer",                                    mandatory:true  },
  { key:"RELIEVING",  label:"Relieving Letter / Experience Certificate", notes:"Mandatory for all candidates with prior employment; not required for fresh graduates", mandatory:"conditional" },
  { key:"BANK",       label:"Bank Account Details",                 notes:"Cancelled cheque or passbook — required for payroll setup before Day 1", mandatory:true  },
  { key:"PHOTO",      label:"Passport-size Photograph (digital)",   notes:"For HR records, employee ID card and system profile",                    mandatory:true  },
  { key:"PAN",        label:"PAN Card Copy",                        notes:"Required for TDS calculation and payroll compliance",                    mandatory:true  },
  { key:"ESIC_PF",    label:"ESIC / PF Number from previous employer", notes:"Submitted where applicable; facilitates transfer of existing PF account", mandatory:false },
];

const STATUS_STYLES = {
  PENDING:            { bg:"#f3f4f6", color:"#6b7280", border:"#d1d5db", label:"Pending" },
  VERIFIED:           { bg:"#dcfce7", color:"#15803d", border:"#16a34a", label:"Verified ✓" },
  REJECTED:           { bg:"#fee2e2", color:"#b91c1c", border:"#dc2626", label:"Rejected ✗" },
  RESUBMIT_REQUESTED: { bg:"#fef9c3", color:"#92400e", border:"#ca8a04", label:"Resubmit Requested" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  return (
    <span style={{
      padding:"2px 8px", borderRadius:3, fontSize:10, fontWeight:700,
      background:s.bg, color:s.color, border:`1px solid ${s.border}`, whiteSpace:"nowrap",
    }}>{s.label}</span>
  );
}

export default function DocumentsPage() {
  const { user } = useAuth();

  const [candidates, setCandidates]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [docs, setDocs]               = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [search, setSearch]           = useState("");
  const [sending, setSending]         = useState(false);
  const [verifying, setVerifying]     = useState({});
  const [sendSuccess, setSendSuccess] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [error, setError]             = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    // Load candidates at DOCUMENTS stage (shortlisted + interview completed)
    const res = await getScreenings();
    const all = res?.rows || res?.screenings || [];
    // Filter candidates who need document collection
    setCandidates(all.filter(c =>
      ["DOCUMENTS","INTERVIEW"].includes(c.stage || c.Stage || "") ||
      c.fit_assessment === "Shortlisted"
    ));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function selectCandidate(c) {
    setSelected(c);
    setSendSuccess(false);
    setVerifySuccess(false);
    setError("");
    setDocsLoading(true);
    const res = await getCandidateDocuments(c.candidate_id || c.submission_id);
    setDocs(res?.documents || res?.rows || []);
    setDocsLoading(false);
  }

  async function handleSendRequest() {
    setSending(true);
    setError("");
    const res = await sendDocumentRequest({
      candidate_id: selected.candidate_id || selected.submission_id,
      candidate_email: selected.email,
      candidate_name: selected.candidate_name,
      sent_by: user?.email,
    });
    setSending(false);
    if (res?.success) setSendSuccess(true);
    else setError(res?.error || "Failed to send document request.");
  }

  async function handleDocAction(docType, action, notes = "") {
    setVerifying(prev => ({ ...prev, [docType]: true }));
    setError("");
    const res = await updateDocumentStatus({
      candidate_id: selected.candidate_id || selected.submission_id,
      doc_type: docType,
      status: action,
      verification_notes: notes,
      verified_by: user?.email,
      verified_at: new Date().toISOString(),
    });
    setVerifying(prev => ({ ...prev, [docType]: false }));
    if (res?.success) {
      setDocs(prev => prev.map(d => d.doc_type === docType ? { ...d, status: action } : d));
    } else {
      setError(res?.error || "Failed to update document status.");
    }
  }

  async function handleMarkAllVerified() {
    setError("");
    const res = await markDocsVerified({
      candidate_id: selected.candidate_id || selected.submission_id,
      verified_by: user?.email,
      verified_at: new Date().toISOString(),
    });
    if (res?.success) {
      setVerifySuccess(true);
      setCandidates(prev => prev.filter(c =>
        (c.candidate_id || c.submission_id) !== (selected.candidate_id || selected.submission_id)
      ));
      setSelected(null);
    } else {
      setError(res?.error || "Failed to mark documents verified.");
    }
  }

  const filtered = candidates.filter(c => {
    const q = search.toLowerCase();
    return !q ||
      (c.candidate_name || "").toLowerCase().includes(q) ||
      (c.submission_id || "").toLowerCase().includes(q) ||
      (c.position_title || "").toLowerCase().includes(q);
  });

  // Build doc map from loaded docs
  const docMap = {};
  docs.forEach(d => { docMap[d.doc_type] = d; });

  const mandatoryDocs = DOC_TYPES.filter(d => d.mandatory === true);
  const allMandatoryVerified = mandatoryDocs.every(d => docMap[d.key]?.status === "VERIFIED");

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden", background:"var(--color-background)" }}>

      {/* ── Left: Candidate list ─────────────────────────────── */}
      <div style={{
        width:280, flexShrink:0, borderRight:"1px solid var(--color-border)",
        display:"flex", flexDirection:"column", overflow:"hidden",
        background:"var(--color-surface)",
      }}>
        <div style={{ padding:"14px 12px 10px", borderBottom:"1px solid var(--color-border)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"var(--color-text-primary)", marginBottom:8 }}>
            Document Collection
          </div>
          <input
            placeholder="Search candidates…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width:"100%", padding:"6px 10px", borderRadius:6, border:"1px solid var(--color-border)",
              fontSize:12, background:"var(--color-background)", color:"var(--color-text-primary)",
              boxSizing:"border-box",
            }}
          />
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"6px 8px" }} className="custom-scrollbar">
          {loading ? (
            <div style={{ padding:24, textAlign:"center", fontSize:12, color:"var(--color-text-secondary)" }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:24, textAlign:"center", fontSize:12, color:"var(--color-text-secondary)" }}>
              No candidates at document stage.
            </div>
          ) : filtered.map(c => {
            const id = c.candidate_id || c.submission_id;
            const isActive = (selected?.candidate_id || selected?.submission_id) === id;
            return (
              <button
                key={id}
                onClick={() => selectCandidate(c)}
                style={{
                  width:"100%", textAlign:"left", padding:"10px 10px", borderRadius:6,
                  border:"none", cursor:"pointer", marginBottom:4,
                  background: isActive ? "rgba(200,169,81,0.14)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--color-accent-500)" : "3px solid transparent",
                }}
              >
                <div style={{ fontWeight:600, fontSize:12, color:"var(--color-text-primary)", marginBottom:2 }}>
                  {c.candidate_name || "—"}
                </div>
                <div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>
                  {c.position_title || "—"} &bull; {id}
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ padding:"8px 12px", borderTop:"1px solid var(--color-border)", fontSize:10, color:"var(--color-text-secondary)" }}>
          {filtered.length} candidate{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Right: Document checklist ────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:24 }} className="custom-scrollbar">

        {verifySuccess && (
          <div style={{ background:"#dcfce7", border:"1px solid #16a34a", borderRadius:8, padding:"12px 16px", marginBottom:20, fontSize:13, color:"#15803d" }}>
            ✓ All documents verified. Candidate advanced to Offer Approval stage.
          </div>
        )}

        {!selected ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"60%", gap:12, color:"var(--color-text-secondary)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ opacity:0.3 }}>
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
            </svg>
            <div style={{ fontSize:14, fontWeight:600 }}>Select a candidate</div>
            <div style={{ fontSize:12 }}>Review and verify uploaded documents</div>
          </div>
        ) : (
          <>
            {/* Candidate header + Send Request */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:"var(--color-text-primary)" }}>
                  {selected.candidate_name}
                </div>
                <div style={{ fontSize:12, color:"var(--color-text-secondary)", marginTop:2 }}>
                  {selected.submission_id} &bull; {selected.position_title} &bull; {selected.email}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button
                  onClick={handleSendRequest}
                  disabled={sending}
                  style={{
                    padding:"8px 16px", borderRadius:6, fontWeight:600, fontSize:12,
                    background:"var(--color-primary-700)", color:"#fff", border:"none", cursor:"pointer",
                    opacity: sending ? 0.7 : 1,
                  }}
                >
                  {sending ? "Sending…" : "Send Document Request"}
                </button>
                {allMandatoryVerified && (
                  <button
                    onClick={handleMarkAllVerified}
                    style={{
                      padding:"8px 16px", borderRadius:6, fontWeight:600, fontSize:12,
                      background:"#16a34a", color:"#fff", border:"none", cursor:"pointer",
                    }}
                  >
                    ✓ Mark All Verified — Advance to Offer
                  </button>
                )}
              </div>
            </div>

            {sendSuccess && (
              <div style={{ background:"#eff6ff", border:"1px solid #3b82f6", borderRadius:6, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#1d4ed8" }}>
                Document request sent to {selected.email}. Candidate has 3 working days to upload (SOP §16.2).
              </div>
            )}
            {error && <div style={{ color:"#dc2626", fontSize:12, marginBottom:12 }}>{error}</div>}

            {docsLoading ? (
              <div style={{ padding:24, textAlign:"center", color:"var(--color-text-secondary)", fontSize:13 }}>Loading documents…</div>
            ) : (
              <div style={{ background:"var(--color-surface)", border:"1px solid var(--color-border)", borderRadius:10, overflow:"hidden" }}>
                <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--color-border)", fontSize:12, fontWeight:700, color:"var(--color-primary-700)" }}>
                  Required Documents Checklist (SOP §10.1)
                </div>
                {DOC_TYPES.map((dt, idx) => {
                  const docRecord = docMap[dt.key];
                  const status = docRecord?.status || "PENDING";
                  const driveUrl = docRecord?.drive_url || docRecord?.DriveFileID;
                  const isVerifying = !!verifying[dt.key];
                  return (
                    <div key={dt.key} style={{
                      padding:"12px 16px",
                      borderBottom: idx < DOC_TYPES.length - 1 ? "1px solid var(--color-border)" : "none",
                      display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12,
                    }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:"var(--color-text-primary)" }}>
                            {dt.label}
                          </span>
                          <span style={{
                            fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:2,
                            background: dt.mandatory === true ? "#fee2e2" : dt.mandatory === "conditional" ? "#fef9c3" : "#f3f4f6",
                            color: dt.mandatory === true ? "#b91c1c" : dt.mandatory === "conditional" ? "#92400e" : "#6b7280",
                          }}>
                            {dt.mandatory === true ? "Mandatory" : dt.mandatory === "conditional" ? "If applicable" : "Optional"}
                          </span>
                        </div>
                        <div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>{dt.notes}</div>
                        {driveUrl && (
                          <a href={`https://drive.google.com/file/d/${driveUrl}/view`} target="_blank" rel="noreferrer"
                            style={{ fontSize:11, color:"var(--color-primary-700)", marginTop:4, display:"inline-block" }}>
                            View uploaded file ↗
                          </a>
                        )}
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                        <StatusBadge status={status}/>
                        {status !== "VERIFIED" && (
                          <div style={{ display:"flex", gap:4 }}>
                            <button
                              onClick={() => handleDocAction(dt.key, "VERIFIED")}
                              disabled={isVerifying || !driveUrl}
                              title={!driveUrl ? "No file uploaded yet" : "Mark as Verified"}
                              style={{
                                padding:"3px 8px", borderRadius:4, fontSize:10, fontWeight:600,
                                background: driveUrl ? "#dcfce7" : "#f3f4f6",
                                color: driveUrl ? "#15803d" : "#9ca3af",
                                border:`1px solid ${driveUrl ? "#16a34a" : "#e5e7eb"}`,
                                cursor: driveUrl ? "pointer" : "not-allowed",
                              }}
                            >Verify</button>
                            <button
                              onClick={() => handleDocAction(dt.key, "RESUBMIT_REQUESTED")}
                              disabled={isVerifying}
                              style={{
                                padding:"3px 8px", borderRadius:4, fontSize:10, fontWeight:600,
                                background:"#fef9c3", color:"#92400e", border:"1px solid #ca8a04", cursor:"pointer",
                              }}
                            >Resubmit</button>
                            <button
                              onClick={() => handleDocAction(dt.key, "REJECTED")}
                              disabled={isVerifying}
                              style={{
                                padding:"3px 8px", borderRadius:4, fontSize:10, fontWeight:600,
                                background:"#fee2e2", color:"#b91c1c", border:"1px solid #dc2626", cursor:"pointer",
                              }}
                            >Reject</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
