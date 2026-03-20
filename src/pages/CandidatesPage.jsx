/**
 * Section 13 — Candidate Profile & System Hub (SOP-HR-001 §13)
 * Central screen: all data collected across every stage in one place.
 * Senior HR Executive, TA Head and CHRO do not need to navigate between screens.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getCandidates, getCandidateProfile } from "../utils/api";
import { STAGES } from "../utils/rbac";

/* ── Stage timeline config ─────────────────────────────────── */
const STAGE_ORDER = ["SCREENING","AI_EVALUATION","HR_DECISION","INTERVIEW","DOCUMENTS","OFFER_APPROVAL","OFFER_RELEASED","ONBOARDING","COMPLETED"];
const STAGE_LABEL = {
  SCREENING:"Screening", AI_EVALUATION:"AI Evaluation", HR_DECISION:"HR Decision",
  INTERVIEW:"Interview", DOCUMENTS:"Documents", OFFER_APPROVAL:"Offer Approval",
  OFFER_RELEASED:"Offer Released", ONBOARDING:"Onboarding", COMPLETED:"Completed",
};

/* ── Helpers ───────────────────────────────────────────────── */
const FIT_COLOR  = { High:"#15803d", Medium:"#a16207", Low:"#b91c1c" };
const FIT_BG     = { High:"#dcfce7", Medium:"#fef9c3", Low:"#fee2e2"  };

function Badge({ text, bg, color, border, size = 10 }) {
  return (
    <span style={{
      display:"inline-block", padding:"2px 7px", borderRadius:3, fontSize:size, fontWeight:700,
      background: bg || "#f3f4f6", color: color || "#6b7280",
      border:`1px solid ${border || color || "#d1d5db"}`, whiteSpace:"nowrap",
    }}>{text}</span>
  );
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display:"flex", gap:8, paddingBottom:6 }}>
      <span style={{ fontSize:11, color:"var(--color-text-secondary)", minWidth:140, flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:11, color:"var(--color-text-primary)", fontWeight:500 }}>{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:12, fontWeight:700, color:"var(--color-primary-700)", marginBottom:10, paddingBottom:6, borderBottom:"1px solid var(--color-border)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

/* ── Stage Timeline ─────────────────────────────────────────── */
function StageTimeline({ currentStage, rejected }) {
  const current = rejected ? "REJECTED" : currentStage;
  const currentIdx = STAGE_ORDER.indexOf(current);
  return (
    <div style={{ display:"flex", gap:0, alignItems:"center", flexWrap:"wrap", padding:"8px 0" }}>
      {STAGE_ORDER.map((s, i) => {
        const done = i < currentIdx || (current === "COMPLETED" && s === "COMPLETED");
        const active = s === current;
        const locked = !done && !active;
        return (
          <React.Fragment key={s}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
              <div style={{
                width:24, height:24, borderRadius:"50%", border:"2px solid",
                borderColor: done ? "#16a34a" : active ? "var(--color-primary-700)" : "var(--color-border)",
                background: done ? "#16a34a" : active ? "var(--color-primary-700)" : "var(--color-background)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800,
                color: (done || active) ? "#fff" : "var(--color-text-secondary)",
              }}>
                {done ? "✓" : locked ? "○" : "●"}
              </div>
              <div style={{ fontSize:8, marginTop:3, color: active ? "var(--color-primary-700)" : "var(--color-text-secondary)", fontWeight: active ? 700 : 400, textAlign:"center", maxWidth:50 }}>
                {STAGE_LABEL[s]}
              </div>
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <div style={{ flex:1, height:2, background: done ? "#16a34a" : "var(--color-border)", minWidth:8, marginBottom:16 }}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Tabs ───────────────────────────────────────────────────── */
const TABS = [
  { key:"basic",    label:"Basic Info"    },
  { key:"ai",       label:"AI Insights"   },
  { key:"screening",label:"Screening"     },
  { key:"interview",label:"Interview"     },
  { key:"documents",label:"Documents"     },
  { key:"offer",    label:"Offer"         },
  { key:"onboarding",label:"Onboarding"  },
  { key:"timeline", label:"Stage Timeline"},
  { key:"audit",    label:"Audit Log"     },
];

/* ── Main Component ─────────────────────────────────────────── */
export default function CandidatesPage() {
  const { user } = useAuth();

  const [candidates, setCandidates]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [profile, setProfile]         = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [search, setSearch]           = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterFit, setFilterFit]     = useState("");
  const [activeTab, setActiveTab]     = useState("basic");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getCandidates();
    setCandidates(res?.rows || res?.candidates || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function selectCandidate(c) {
    setSelected(c);
    setActiveTab("basic");
    setProfile(null);
    setProfileLoading(true);
    const res = await getCandidateProfile(c.candidate_id || c.CandidateID || c.submission_id);
    setProfile(res?.profile || res || c);
    setProfileLoading(false);
  }

  const filtered = candidates.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      (c.candidate_name || c.FullName || "").toLowerCase().includes(q) ||
      (c.candidate_id || c.CandidateID || "").toLowerCase().includes(q) ||
      (c.position_title || c.Title || "").toLowerCase().includes(q) ||
      (c.email || c.Email || "").toLowerCase().includes(q);
    const matchStage = !filterStage || (c.stage || c.Stage || "") === filterStage;
    const matchFit = !filterFit || (c.ai_fit_level || c.AI_FitLevel || c.fit_assessment || "") === filterFit;
    return matchQ && matchStage && matchFit;
  });

  const p = profile || selected || {};
  const stage = p.stage || p.Stage || "";
  const isRejected = stage === "REJECTED";

  /* ── Render tab content ─────────────────────────────────── */
  function renderTab() {
    if (profileLoading) {
      return <div style={{ padding:40, textAlign:"center", color:"var(--color-text-secondary)", fontSize:13 }}>Loading profile…</div>;
    }
    switch (activeTab) {

      case "basic": return (
        <div>
          <Section title="Basic Information">
            <InfoRow label="Candidate ID"     value={p.candidate_id || p.CandidateID} />
            <InfoRow label="Full Name"         value={p.candidate_name || p.FullName} />
            <InfoRow label="Email"             value={p.email || p.Email} />
            <InfoRow label="Phone"             value={p.phone || p.Phone} />
            <InfoRow label="Current Location"  value={p.location || p.CurrentLocation} />
            <InfoRow label="Current Company"   value={p.current_company || p.CurrentCompany} />
            <InfoRow label="Current Role"      value={p.current_role || p.CurrentRole} />
            <InfoRow label="Total Experience"  value={p.experience_years || p.TotalExperience} />
            <InfoRow label="Applied For (JobID)" value={p.req_id || p.JobID} />
            <InfoRow label="Position"          value={p.position_title || p.Title} />
            <InfoRow label="Stage"             value={stage} />
            <InfoRow label="Submitted At"      value={p.submitted_at || p.CreatedAt} />
          </Section>
        </div>
      );

      case "ai": return (
        <div>
          <Section title="AI Insights — Module 3 Output (Google Gemini 1.5 Pro)">
            <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:12, fontStyle:"italic" }}>
              AI evaluation is automated. No HR action is required to trigger it (SOP §7). AI output is advisory only.
            </div>
            {!(p.ai_match_score || p.AI_MatchScore) ? (
              <div style={{ fontSize:12, color:"var(--color-text-secondary)" }}>AI Evaluation not yet completed for this candidate.</div>
            ) : (
              <>
                <div style={{ display:"flex", gap:16, marginBottom:16, flexWrap:"wrap" }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:28, fontWeight:800, color:"var(--color-primary-700)" }}>{p.ai_match_score || p.AI_MatchScore}%</div>
                    <div style={{ fontSize:10, color:"var(--color-text-secondary)" }}>Match Score</div>
                  </div>
                  {(p.ai_fit_level || p.AI_FitLevel) && (
                    <div style={{ display:"flex", flexDirection:"column", justifyContent:"center" }}>
                      <Badge
                        text={`${p.ai_fit_level || p.AI_FitLevel} Fit`}
                        bg={FIT_BG[p.ai_fit_level || p.AI_FitLevel] || "#f3f4f6"}
                        color={FIT_COLOR[p.ai_fit_level || p.AI_FitLevel] || "#6b7280"}
                        size={12}
                      />
                    </div>
                  )}
                  {(p.ai_decision || p.AI_Decision) && (
                    <div style={{ display:"flex", flexDirection:"column", justifyContent:"center" }}>
                      <div style={{ fontSize:10, color:"var(--color-text-secondary)", marginBottom:3 }}>AI Recommendation</div>
                      <Badge text={p.ai_decision || p.AI_Decision} bg="#eff6ff" color="#1d4ed8" size={11}/>
                      <div style={{ fontSize:9, color:"var(--color-text-secondary)", marginTop:2 }}>Advisory only</div>
                    </div>
                  )}
                </div>
                <InfoRow label="Experience Score (1–10)"      value={p.experience_score || p.ExperienceScore} />
                <InfoRow label="Communication Score (1–10)"   value={p.communication_score || p.CommunicationScore} />
                <InfoRow label="Attitude Score (1–10)"        value={p.attitude_score || p.AttitudeScore} />
                <InfoRow label="Cultural Fit Score (1–10)"    value={p.cultural_fit_score || p.CulturalFitScore} />
                <InfoRow label="AI Evaluated At"              value={p.ai_evaluated_at || p.AI_EvaluatedAt} />
                {(p.ai_summary || p.Summary) && (
                  <div style={{ marginTop:10 }}>
                    <div style={{ fontSize:11, fontWeight:600, marginBottom:4 }}>AI Summary</div>
                    <div style={{ fontSize:12, color:"var(--color-text-secondary)", lineHeight:1.6 }}>{p.ai_summary || p.Summary}</div>
                  </div>
                )}
                {(p.audio_transcript || p.AudioTranscript) && (
                  <div style={{ marginTop:10 }}>
                    <div style={{ fontSize:11, fontWeight:600, marginBottom:4 }}>Audio Transcript</div>
                    <div style={{ fontSize:11, color:"var(--color-text-secondary)", lineHeight:1.6, maxHeight:120, overflow:"auto", background:"var(--color-background)", padding:8, borderRadius:4 }}>
                      {p.audio_transcript || p.AudioTranscript}
                    </div>
                  </div>
                )}
              </>
            )}
          </Section>
          <Section title="HR Decision (Module 4)">
            <InfoRow label="HR Decision"     value={p.hr_decision || p.HR_Decision} />
            <InfoRow label="Decided By"      value={p.hr_decision_by || p.HR_DecisionBy} />
            <InfoRow label="Decided At"      value={p.hr_decision_at || p.HR_DecisionAt} />
            <InfoRow label="HR Notes"        value={p.hr_notes || p.HR_Notes} />
          </Section>
        </div>
      );

      case "screening": return (
        <Section title="Screening Data — Module 2">
          <InfoRow label="Screening Source"   value={p.source} />
          <InfoRow label="Screened By"        value={p.screened_by || p.interviewer_name} />
          <InfoRow label="Screening Remarks"  value={p.screening_remarks} />
          <InfoRow label="Fit Assessment"     value={p.fit_assessment} />
          <InfoRow label="Notice Period"      value={p.notice_period} />
          <InfoRow label="Current CTC"        value={p.current_ctc ? `₹${p.current_ctc}L` : null} />
          <InfoRow label="Expected CTC"       value={p.expected_ctc ? `₹${p.expected_ctc}L` : null} />
          <InfoRow label="Current Location"   value={p.job_location} />
          {(p.resume_link || p.CV_DriveID) && (
            <div style={{ marginTop:8 }}>
              <a href={p.resume_link || `https://drive.google.com/file/d/${p.CV_DriveID}/view`}
                target="_blank" rel="noreferrer"
                style={{ fontSize:12, color:"var(--color-primary-700)", fontWeight:600 }}>
                Download CV ↗
              </a>
            </div>
          )}
          {(p.audio_link || p.Audio_DriveID) && (
            <div style={{ marginTop:6 }}>
              <a href={p.audio_link || `https://drive.google.com/file/d/${p.Audio_DriveID}/view`}
                target="_blank" rel="noreferrer"
                style={{ fontSize:12, color:"var(--color-primary-700)", fontWeight:600 }}>
                Play Audio Introduction ↗
              </a>
            </div>
          )}
        </Section>
      );

      case "interview": return (
        <Section title="Interview Records — Module 5">
          {(p.interviews || []).length === 0 ? (
            <div style={{ fontSize:12, color:"var(--color-text-secondary)" }}>No interview records yet.</div>
          ) : (p.interviews || []).map((iv, i) => (
            <div key={i} style={{ marginBottom:14, padding:12, background:"var(--color-background)", borderRadius:6, border:"1px solid var(--color-border)" }}>
              <div style={{ fontWeight:600, fontSize:12, marginBottom:6 }}>
                Round {i+1}{iv.is_final_round ? " 🏁 (Final)" : ""} — {iv.round_description || ""}
              </div>
              <InfoRow label="Interviewer"        value={iv.interviewer_name} />
              <InfoRow label="Technical/Role (1–5)" value={iv.technical_rating} />
              <InfoRow label="Problem-Solving (1–5)" value={iv.problem_solving_rating} />
              <InfoRow label="Communication (1–5)" value={iv.communication_rating} />
              <InfoRow label="Culture Fit (1–5)"   value={iv.culture_fit_rating} />
              <InfoRow label="Overall Rating (1–5)" value={iv.overall_rating || iv.final_decision_rating} />
              <InfoRow label="Recommendation"      value={iv.recommendation || iv.final_decision} />
              <InfoRow label="Strengths Observed"  value={iv.strengths_observed} />
              <InfoRow label="Concerns Raised"     value={iv.concerns_raised} />
              <InfoRow label="Detailed Feedback"   value={iv.detailed_feedback} />
              <InfoRow label="Interviewed At"      value={iv.interviewed_at} />
            </div>
          ))}
        </Section>
      );

      case "documents": return (
        <Section title="Document Status — Module 6">
          {(p.documents || []).length === 0 ? (
            <div style={{ fontSize:12, color:"var(--color-text-secondary)" }}>No documents uploaded yet.</div>
          ) : (p.documents || []).map((d, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid var(--color-border)" }}>
              <div>
                <div style={{ fontSize:12, fontWeight:500 }}>{d.doc_type}</div>
                <div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>{d.uploaded_at || ""}</div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <Badge
                  text={d.status || "PENDING"}
                  bg={d.status === "VERIFIED" ? "#dcfce7" : d.status === "REJECTED" ? "#fee2e2" : "#fef9c3"}
                  color={d.status === "VERIFIED" ? "#15803d" : d.status === "REJECTED" ? "#b91c1c" : "#92400e"}
                />
                {d.drive_url && (
                  <a href={`https://drive.google.com/file/d/${d.drive_url}/view`} target="_blank" rel="noreferrer"
                    style={{ fontSize:11, color:"var(--color-primary-700)" }}>View ↗</a>
                )}
              </div>
            </div>
          ))}
          <div style={{ marginTop:10 }}>
            <InfoRow label="Docs Verified"     value={p.docs_verified || p.DocsVerified} />
            <InfoRow label="Verified By"        value={p.docs_verified_by || p.DocsVerifiedBy} />
            <InfoRow label="Verified At"        value={p.docs_verified_at || p.DocsVerifiedAt} />
          </div>
        </Section>
      );

      case "offer": return (
        <Section title="Offer Details — Module 7">
          <InfoRow label="Offered Salary"      value={p.offered_salary || p.OfferedSalary ? `₹${p.offered_salary || p.OfferedSalary}` : null} />
          <InfoRow label="Designation"         value={p.offer_designation} />
          <InfoRow label="Proposed Joining Date" value={p.proposed_joining_date} />
          <InfoRow label="Offer Status"        value={p.offer_status || p.OfferStatus} />
          <InfoRow label="Approved By"         value={p.offer_approved_by} />
          <InfoRow label="Approved At"         value={p.offer_approved_at} />
          <InfoRow label="Offer Sent At"       value={p.offer_sent_at || p.OfferSentAt} />
          <InfoRow label="Candidate Response"  value={p.candidate_response || p.CandidateResponse} />
          <InfoRow label="Responded At"        value={p.offer_responded_at || p.OfferRespondedAt} />
          {(p.offer_drive_id || p.Offer_DriveID) && (
            <div style={{ marginTop:8 }}>
              <a href={`https://drive.google.com/file/d/${p.offer_drive_id || p.Offer_DriveID}/view`}
                target="_blank" rel="noreferrer"
                style={{ fontSize:12, color:"var(--color-primary-700)", fontWeight:600 }}>
                View Offer Letter ↗
              </a>
            </div>
          )}
        </Section>
      );

      case "onboarding": return (
        <Section title="Onboarding — Module 8">
          <InfoRow label="Employee ID"        value={p.employee_id || p.EmployeeID} />
          <InfoRow label="Joining Date"       value={p.joining_date || p.JoiningDate} />
          <InfoRow label="Final Designation"  value={p.final_designation} />
          <InfoRow label="Department"         value={p.department} />
          <InfoRow label="Reporting Manager"  value={p.reporting_manager} />
          <InfoRow label="Confirmed Salary"   value={p.confirmed_salary ? `₹${p.confirmed_salary}` : null} />
          <InfoRow label="PF Enrolled"        value={p.pf_enrolled != null ? (p.pf_enrolled ? "Yes" : "No") : null} />
          <InfoRow label="ESIC Enrolled"      value={p.esic_enrolled != null ? (p.esic_enrolled ? "Yes" : "No") : null} />
          <InfoRow label="ID Card Issued"     value={p.id_card_issued != null ? (p.id_card_issued ? "Yes" : "No") : null} />
          <InfoRow label="Onboarding Complete" value={p.onboarding_complete != null ? (p.onboarding_complete ? "Yes" : "No") : null} />
          <InfoRow label="Completed By"       value={p.onboarding_completed_by} />
          <InfoRow label="Completed At"       value={p.onboarding_completed_at} />
        </Section>
      );

      case "timeline": return (
        <Section title="Stage Timeline">
          <StageTimeline currentStage={stage} rejected={isRejected}/>
          {isRejected && (
            <div style={{ marginTop:12, padding:10, background:"#fee2e2", borderRadius:6, fontSize:12, color:"#b91c1c" }}>
              Candidate was rejected. Record archived (SOP §8.1).
            </div>
          )}
        </Section>
      );

      case "audit": return (
        <Section title="Audit Log (SOP §16 — Append-Only)">
          <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:10, fontStyle:"italic" }}>
            Every action is logged with user identity, timestamp and remarks. Entries cannot be modified or deleted.
          </div>
          {(p.audit_log || []).length === 0 ? (
            <div style={{ fontSize:12, color:"var(--color-text-secondary)" }}>No audit log entries available.</div>
          ) : (p.audit_log || []).map((entry, i) => (
            <div key={i} style={{ padding:"8px 0", borderBottom:"1px solid var(--color-border)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                <span style={{ fontSize:11, fontWeight:600, color:"var(--color-text-primary)" }}>{entry.action_type}</span>
                <span style={{ fontSize:10, color:"var(--color-text-secondary)" }}>{entry.timestamp}</span>
              </div>
              <div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>By: {entry.user_name} ({entry.user_role})</div>
              {entry.remarks && <div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>Notes: {entry.remarks}</div>}
            </div>
          ))}
        </Section>
      );

      default: return null;
    }
  }

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden", background:"var(--color-background)" }}>

      {/* ── Left: Candidate list ─────────────────────────────── */}
      <div style={{
        width:300, flexShrink:0, borderRight:"1px solid var(--color-border)",
        display:"flex", flexDirection:"column", overflow:"hidden",
        background:"var(--color-surface)",
      }}>
        {/* Search + Filters */}
        <div style={{ padding:"14px 12px 10px", borderBottom:"1px solid var(--color-border)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"var(--color-text-primary)", marginBottom:8 }}>Candidate Hub</div>
          <input
            placeholder="Search name, ID, position…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width:"100%", padding:"6px 10px", borderRadius:6, border:"1px solid var(--color-border)",
              fontSize:12, background:"var(--color-background)", color:"var(--color-text-primary)",
              boxSizing:"border-box", marginBottom:6,
            }}
          />
          <div style={{ display:"flex", gap:6 }}>
            <select
              value={filterStage}
              onChange={e => setFilterStage(e.target.value)}
              style={{
                flex:1, padding:"5px 6px", borderRadius:6, border:"1px solid var(--color-border)",
                fontSize:11, background:"var(--color-background)", color:"var(--color-text-primary)",
              }}
            >
              <option value="">All Stages</option>
              {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
              <option value="REJECTED">Rejected</option>
            </select>
            <select
              value={filterFit}
              onChange={e => setFilterFit(e.target.value)}
              style={{
                flex:1, padding:"5px 6px", borderRadius:6, border:"1px solid var(--color-border)",
                fontSize:11, background:"var(--color-background)", color:"var(--color-text-primary)",
              }}
            >
              <option value="">All Fit Levels</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:"auto", padding:"6px 8px" }} className="custom-scrollbar">
          {loading ? (
            <div style={{ padding:24, textAlign:"center", fontSize:12, color:"var(--color-text-secondary)" }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:24, textAlign:"center", fontSize:12, color:"var(--color-text-secondary)" }}>No candidates found.</div>
          ) : filtered.map(c => {
            const id = c.candidate_id || c.CandidateID || c.submission_id;
            const isActive = (selected?.candidate_id || selected?.CandidateID || selected?.submission_id) === id;
            const fit = c.ai_fit_level || c.AI_FitLevel || c.fit_assessment || "";
            const stage = c.stage || c.Stage || "";
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
                  {c.candidate_name || c.FullName || "—"}
                </div>
                <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:4 }}>
                  {c.position_title || c.Title || "—"} &bull; {id}
                </div>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {stage && <Badge text={STAGE_LABEL[stage] || stage} bg="#eff6ff" color="#1d4ed8" size={9}/>}
                  {fit && FIT_COLOR[fit] && (
                    <Badge text={fit} bg={FIT_BG[fit]} color={FIT_COLOR[fit]} size={9}/>
                  )}
                  {c.ai_match_score != null && (
                    <Badge text={`${c.ai_match_score}%`} bg="#f3f4f6" color="#374151" size={9}/>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ padding:"8px 12px", borderTop:"1px solid var(--color-border)", fontSize:10, color:"var(--color-text-secondary)" }}>
          {filtered.length} candidate{filtered.length !== 1 ? "s" : ""} &bull; {candidates.length} total
        </div>
      </div>

      {/* ── Right: Profile tabs ──────────────────────────────── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {!selected ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:12, color:"var(--color-text-secondary)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="56" height="56" style={{ opacity:0.25 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <div style={{ fontSize:15, fontWeight:600 }}>Select a candidate to view full profile</div>
            <div style={{ fontSize:12 }}>All data collected across every stage in one place (SOP §13)</div>
          </div>
        ) : (
          <>
            {/* Profile header */}
            <div style={{
              padding:"14px 20px", borderBottom:"1px solid var(--color-border)",
              background:"var(--color-surface)", flexShrink:0,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:"var(--color-text-primary)" }}>
                    {p.candidate_name || p.FullName}
                  </div>
                  <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginTop:2 }}>
                    {p.candidate_id || p.CandidateID} &bull; {p.position_title || p.Title} &bull; {p.req_id || p.JobID}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {stage && <Badge text={STAGE_LABEL[stage] || stage} bg="#eff6ff" color="#1d4ed8" size={10}/>}
                  {(p.ai_fit_level || p.AI_FitLevel) && (
                    <Badge
                      text={`${p.ai_fit_level || p.AI_FitLevel} Fit`}
                      bg={FIT_BG[p.ai_fit_level || p.AI_FitLevel]}
                      color={FIT_COLOR[p.ai_fit_level || p.AI_FitLevel]}
                      size={10}
                    />
                  )}
                  {(p.ai_match_score || p.AI_MatchScore) && (
                    <Badge text={`Match: ${p.ai_match_score || p.AI_MatchScore}%`} bg="#f3f4f6" color="#374151" size={10}/>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              display:"flex", gap:0, borderBottom:"1px solid var(--color-border)",
              background:"var(--color-surface)", flexShrink:0, overflowX:"auto",
            }} className="custom-scrollbar">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    padding:"9px 14px", border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
                    background:"transparent", whiteSpace:"nowrap",
                    borderBottom: activeTab === t.key ? "2px solid var(--color-accent-500)" : "2px solid transparent",
                    color: activeTab === t.key ? "var(--color-accent-500)" : "var(--color-text-secondary)",
                  }}
                >{t.label}</button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex:1, overflowY:"auto", padding:20 }} className="custom-scrollbar">
              {renderTab()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
