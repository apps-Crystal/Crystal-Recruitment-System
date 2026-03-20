/**
 * Module 4 — HR Decision (SOP-HR-001 §8)
 * Senior HR Executive reviews AI Evaluation output and records Shortlist / Hold / Reject.
 * AI recommendation is advisory only — final decision is always human.
 * Remarks are mandatory for Hold and Reject.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getHRDecisionCandidates, getAIEvaluation, submitHRDecision } from "../utils/api";

/* ── Colour tokens ─────────────────────────────────────────── */
const FIT_COLOR = {
  High:   { bg:"#dcfce7", color:"#15803d", border:"#15803d" },
  Medium: { bg:"#fef9c3", color:"#a16207", border:"#a16207" },
  Low:    { bg:"#fee2e2", color:"#b91c1c", border:"#b91c1c" },
};
const DEC_COLOR = {
  Shortlist: { bg:"#dcfce7", color:"#15803d" },
  Hold:      { bg:"#fef9c3", color:"#a16207" },
  Reject:    { bg:"#fee2e2", color:"#b91c1c" },
};

function ScoreBar({ label, value, max = 10 }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 70 ? "#16a34a" : pct >= 40 ? "#ca8a04" : "#dc2626";
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
        <span style={{ color:"var(--color-text-secondary)" }}>{label}</span>
        <span style={{ fontWeight:700, color }}>{value ?? "—"}/10</span>
      </div>
      <div style={{ height:5, borderRadius:3, background:"var(--color-border)" }}>
        <div style={{ height:"100%", borderRadius:3, background:color, width:`${pct}%`, transition:"width 0.4s" }}/>
      </div>
    </div>
  );
}

function Badge({ text, style = {} }) {
  return (
    <span style={{
      display:"inline-block", padding:"2px 8px", borderRadius:3,
      fontSize:10, fontWeight:700, whiteSpace:"nowrap", ...style,
    }}>{text}</span>
  );
}

export default function HRDecisionPage() {
  const { user } = useAuth();

  const [candidates, setCandidates]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [aiData, setAiData]           = useState(null);
  const [aiLoading, setAiLoading]     = useState(false);
  const [decision, setDecision]       = useState("");
  const [remarks, setRemarks]         = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [success, setSuccess]         = useState(null);
  const [error, setError]             = useState("");
  const [search, setSearch]           = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getHRDecisionCandidates();
    setCandidates(res?.rows || res?.candidates || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function selectCandidate(c) {
    setSelected(c);
    setDecision("");
    setRemarks("");
    setSuccess(null);
    setError("");
    setAiData(null);
    setAiLoading(true);
    const res = await getAIEvaluation(c.candidate_id || c.CandidateID || c.submission_id);
    setAiData(res?.evaluation || res || null);
    setAiLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!decision) { setError("Please select a decision."); return; }
    if ((decision === "Hold" || decision === "Reject") && !remarks.trim()) {
      setError("Remarks are mandatory for Hold and Reject decisions (SOP §8)."); return;
    }
    setSubmitting(true);
    setError("");
    const res = await submitHRDecision({
      candidate_id: selected.candidate_id || selected.CandidateID || selected.submission_id,
      decision,
      remarks: remarks.trim(),
      decided_by: user?.email,
      decided_at: new Date().toISOString(),
    });
    setSubmitting(false);
    if (res?.success) {
      setSuccess({ decision, name: selected.candidate_name || selected.FullName });
      setCandidates(prev => prev.filter(c =>
        (c.candidate_id || c.CandidateID || c.submission_id) !==
        (selected.candidate_id || selected.CandidateID || selected.submission_id)
      ));
      setSelected(null);
    } else {
      setError(res?.error || "Failed to record decision. Please try again.");
    }
  }

  const filtered = candidates.filter(c => {
    const q = search.toLowerCase();
    return !q ||
      (c.candidate_name || c.FullName || "").toLowerCase().includes(q) ||
      (c.candidate_id || c.CandidateID || "").toLowerCase().includes(q) ||
      (c.position_title || c.Title || "").toLowerCase().includes(q);
  });

  const ai = aiData || {};
  const fitStyle = FIT_COLOR[ai.fitLevel || ai.FitLevel] || { bg:"#f3f4f6", color:"#6b7280", border:"#d1d5db" };

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden", background:"var(--color-background)" }}>

      {/* ── Left: Candidate list ─────────────────────────────── */}
      <div style={{
        width:300, flexShrink:0, borderRight:"1px solid var(--color-border)",
        display:"flex", flexDirection:"column", overflow:"hidden",
        background:"var(--color-surface)",
      }}>
        <div style={{ padding:"14px 12px 10px", borderBottom:"1px solid var(--color-border)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"var(--color-text-primary)", marginBottom:8 }}>
            HR Decision Queue
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
              {candidates.length === 0 ? "No candidates awaiting HR Decision." : "No results found."}
            </div>
          ) : filtered.map(c => {
            const id = c.candidate_id || c.CandidateID || c.submission_id;
            const isActive = (selected?.candidate_id || selected?.CandidateID || selected?.submission_id) === id;
            const fit = c.ai_fit_level || c.AI_FitLevel || "";
            const score = c.ai_match_score ?? c.AI_MatchScore ?? null;
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
                  {c.position_title || c.Title || "—"} &bull; {c.candidate_id || c.CandidateID || ""}
                </div>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {score != null && (
                    <Badge text={`Match: ${score}%`} style={{ background:"#eff6ff", color:"#1d4ed8", fontSize:9 }}/>
                  )}
                  {fit && (
                    <Badge text={fit} style={{ background: FIT_COLOR[fit]?.bg || "#f3f4f6", color: FIT_COLOR[fit]?.color || "#6b7280", fontSize:9 }}/>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ padding:"8px 12px", borderTop:"1px solid var(--color-border)", fontSize:10, color:"var(--color-text-secondary)" }}>
          {filtered.length} candidate{filtered.length !== 1 ? "s" : ""} awaiting decision
        </div>
      </div>

      {/* ── Right: AI Insights + Decision form ──────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:24 }} className="custom-scrollbar">

        {success && (
          <div style={{
            background: success.decision === "Shortlist" ? "#dcfce7" : success.decision === "Hold" ? "#fef9c3" : "#fee2e2",
            border:`1px solid ${success.decision === "Shortlist" ? "#16a34a" : success.decision === "Hold" ? "#ca8a04" : "#dc2626"}`,
            borderRadius:8, padding:"14px 18px", marginBottom:20, fontSize:13,
            color: success.decision === "Shortlist" ? "#15803d" : success.decision === "Hold" ? "#92400e" : "#991b1b",
          }}>
            <strong>{success.decision === "Shortlist" ? "✓ Shortlisted" : success.decision === "Hold" ? "⏸ Held" : "✗ Rejected"}</strong>
            {" — "}{success.name} has been {success.decision === "Shortlist" ? "shortlisted for interview" : success.decision === "Hold" ? "placed on hold" : "rejected and notified"}.
          </div>
        )}

        {!selected ? (
          <div style={{
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            height:"60%", gap:12, color:"var(--color-text-secondary)",
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ opacity:0.3 }}>
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <div style={{ fontSize:14, fontWeight:600 }}>Select a candidate to review</div>
            <div style={{ fontSize:12 }}>Review AI evaluation and record HR Decision</div>
          </div>
        ) : aiLoading ? (
          <div style={{ padding:40, textAlign:"center", color:"var(--color-text-secondary)", fontSize:13 }}>
            Loading AI evaluation…
          </div>
        ) : (
          <>
            {/* Candidate header */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:18, fontWeight:700, color:"var(--color-text-primary)" }}>
                {selected.candidate_name || selected.FullName}
              </div>
              <div style={{ fontSize:12, color:"var(--color-text-secondary)", marginTop:2 }}>
                {selected.candidate_id || selected.CandidateID} &bull; Applied for: {selected.position_title || selected.Title} &bull; {selected.req_id || selected.JobID}
              </div>
              <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginTop:2 }}>
                {selected.email || selected.Email} &bull; {selected.phone || selected.Phone}
              </div>
            </div>

            {/* AI Insights Panel (SOP §7.2) */}
            <div style={{
              background:"var(--color-surface)", border:"1px solid var(--color-border)",
              borderRadius:10, padding:18, marginBottom:20,
            }}>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--color-primary-700)", marginBottom:14, display:"flex", alignItems:"center", gap:6 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                AI Insights Panel — Module 3 Output
              </div>

              {!ai.matchScore && !ai.MatchScore ? (
                <div style={{ fontSize:12, color:"var(--color-text-secondary)", fontStyle:"italic" }}>
                  AI Evaluation not yet available for this candidate. (AI pipeline runs automatically after candidate submission via GAS backend.)
                </div>
              ) : (
                <>
                  {/* Match Score + Fit Level */}
                  <div style={{ display:"flex", gap:16, marginBottom:16, flexWrap:"wrap" }}>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:28, fontWeight:800, color:"var(--color-primary-700)" }}>
                        {ai.matchScore ?? ai.MatchScore ?? "—"}%
                      </div>
                      <div style={{ fontSize:10, color:"var(--color-text-secondary)" }}>Match Score</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", justifyContent:"center" }}>
                      <span style={{
                        padding:"3px 12px", borderRadius:4, fontWeight:700, fontSize:12,
                        background:fitStyle.bg, color:fitStyle.color, border:`1px solid ${fitStyle.border}`,
                      }}>
                        {ai.fitLevel || ai.FitLevel || "—"} Fit
                      </span>
                      <div style={{ fontSize:10, color:"var(--color-text-secondary)", marginTop:3, textAlign:"center" }}>
                        Fit Level
                      </div>
                    </div>
                    {(ai.recommendedDecision || ai.RecommendedDecision) && (
                      <div style={{ display:"flex", flexDirection:"column", justifyContent:"center" }}>
                        <span style={{
                          padding:"3px 12px", borderRadius:4, fontWeight:700, fontSize:12,
                          background: DEC_COLOR[ai.recommendedDecision || ai.RecommendedDecision]?.bg || "#f3f4f6",
                          color: DEC_COLOR[ai.recommendedDecision || ai.RecommendedDecision]?.color || "#6b7280",
                        }}>
                          AI: {ai.recommendedDecision || ai.RecommendedDecision}
                        </span>
                        <div style={{ fontSize:9, color:"var(--color-text-secondary)", marginTop:3, textAlign:"center" }}>Advisory only</div>
                      </div>
                    )}
                  </div>

                  {/* Individual Scores */}
                  <div style={{ marginBottom:14 }}>
                    <ScoreBar label="Experience" value={ai.experienceScore ?? ai.ExperienceScore} />
                    <ScoreBar label="Communication" value={ai.communicationScore ?? ai.CommunicationScore} />
                    <ScoreBar label="Attitude" value={ai.attitudeScore ?? ai.AttitudeScore} />
                    <ScoreBar label="Cultural Fit" value={ai.culturalFitScore ?? ai.CulturalFitScore} />
                  </div>

                  {/* Summary */}
                  {(ai.summary || ai.Summary) && (
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:600, marginBottom:4, color:"var(--color-text-primary)" }}>AI Summary</div>
                      <div style={{ fontSize:12, color:"var(--color-text-secondary)", lineHeight:1.6 }}>
                        {ai.summary || ai.Summary}
                      </div>
                    </div>
                  )}

                  {/* Strengths / Weaknesses / Risk Flags */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:"#15803d", marginBottom:4 }}>Strengths</div>
                      {(JSON.parse(ai.strengths || ai.Strengths || "[]")).map((s, i) => (
                        <div key={i} style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:2 }}>• {s}</div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:"#b45309", marginBottom:4 }}>Weaknesses</div>
                      {(JSON.parse(ai.weaknesses || ai.Weaknesses || "[]")).map((w, i) => (
                        <div key={i} style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:2 }}>• {w}</div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:"#b91c1c", marginBottom:4 }}>Risk Flags</div>
                      {(JSON.parse(ai.riskFlags || ai.RiskFlags || "[]")).length === 0
                        ? <div style={{ fontSize:11, color:"#16a34a" }}>None detected</div>
                        : (JSON.parse(ai.riskFlags || ai.RiskFlags || "[]")).map((r, i) => (
                            <div key={i} style={{ fontSize:11, color:"#dc2626", marginBottom:2 }}>⚠ {r}</div>
                          ))
                      }
                    </div>
                  </div>

                  {/* Matched / Missing Skills */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12 }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:"#15803d", marginBottom:4 }}>Matched Skills</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {(JSON.parse(ai.matchedSkills || ai.MatchedSkills || "[]")).map((s, i) => (
                          <Badge key={i} text={s} style={{ background:"#dcfce7", color:"#15803d", fontSize:9 }}/>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:"#b91c1c", marginBottom:4 }}>Missing Skills</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {(JSON.parse(ai.missingSkills || ai.MissingSkills || "[]")).map((s, i) => (
                          <Badge key={i} text={s} style={{ background:"#fee2e2", color:"#b91c1c", fontSize:9 }}/>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* HR Decision Form (SOP §8) */}
            <form onSubmit={handleSubmit}>
              <div style={{
                background:"var(--color-surface)", border:"1px solid var(--color-border)",
                borderRadius:10, padding:18,
              }}>
                <div style={{ fontSize:12, fontWeight:700, color:"var(--color-primary-700)", marginBottom:14 }}>
                  Record HR Decision
                </div>

                <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:12, fontStyle:"italic" }}>
                  Important: AI recommendation is advisory only. The Senior HR Executive retains full authority over all screening decisions (SOP §7.2).
                </div>

                {/* Decision buttons */}
                <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                  {["Shortlist","Hold","Reject"].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => { setDecision(d); setError(""); }}
                      style={{
                        flex:1, padding:"10px 0", borderRadius:6, cursor:"pointer",
                        fontWeight:700, fontSize:13, border:"2px solid",
                        borderColor: decision === d
                          ? (d === "Shortlist" ? "#16a34a" : d === "Hold" ? "#ca8a04" : "#dc2626")
                          : "var(--color-border)",
                        background: decision === d
                          ? (d === "Shortlist" ? "#dcfce7" : d === "Hold" ? "#fef9c3" : "#fee2e2")
                          : "transparent",
                        color: decision === d
                          ? (d === "Shortlist" ? "#15803d" : d === "Hold" ? "#92400e" : "#991b1b")
                          : "var(--color-text-secondary)",
                      }}
                    >{d === "Shortlist" ? "✓ Shortlist" : d === "Hold" ? "⏸ Hold" : "✗ Reject"}</button>
                  ))}
                </div>

                {/* Remarks */}
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontSize:12, fontWeight:600, display:"block", marginBottom:4, color:"var(--color-text-primary)" }}>
                    Remarks {(decision === "Hold" || decision === "Reject") ? <span style={{ color:"#dc2626" }}>*</span> : "(optional for Shortlist)"}
                  </label>
                  <textarea
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    rows={3}
                    placeholder={
                      decision === "Reject" ? "Provide reason for rejection (mandatory)…"
                      : decision === "Hold" ? "Provide reason for hold (mandatory)…"
                      : "Optional notes for shortlist…"
                    }
                    style={{
                      width:"100%", padding:"8px 10px", borderRadius:6,
                      border:`1px solid ${error && (decision === "Hold" || decision === "Reject") && !remarks.trim() ? "#dc2626" : "var(--color-border)"}`,
                      fontSize:12, background:"var(--color-background)", color:"var(--color-text-primary)",
                      resize:"vertical", boxSizing:"border-box",
                    }}
                  />
                </div>

                {error && <div style={{ color:"#dc2626", fontSize:12, marginBottom:10 }}>{error}</div>}

                <button
                  type="submit"
                  disabled={submitting || !decision}
                  style={{
                    padding:"10px 24px", borderRadius:6, fontWeight:700, fontSize:13,
                    background: decision
                      ? (decision === "Shortlist" ? "#16a34a" : decision === "Hold" ? "#ca8a04" : "#dc2626")
                      : "var(--color-border)",
                    color:"#fff", border:"none", cursor: decision ? "pointer" : "not-allowed",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Recording…" : `Confirm ${decision || "Decision"}`}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
