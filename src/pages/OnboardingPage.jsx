/**
 * Module 8 — Onboarding (SOP-HR-001 §12)
 * Senior HR Executive completes onboarding form and tracks Day 1–6 induction.
 * Onboarding marked complete after Day 6 sign-off. Stage → COMPLETED.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getOnboardingCandidates, submitOnboarding, updateOnboardingDay, completeOnboarding } from "../utils/api";

/* SOP §12.1 Day 1–6 Onboarding Checklist */
const INDUCTION_DAYS = [
  {
    day: 1,
    activities: [
      { key:"day1_welcome",  label:"Welcome meeting with Senior HR Executive; employee ID card issued; system access provisioned", responsible:"Senior HR Executive" },
      { key:"day1_intro",    label:"Introduction to reporting manager; workstation, uniform or equipment assigned",                 responsible:"Senior HR Executive + Manager" },
    ],
  },
  {
    day: 2,
    activities: [
      { key:"day2_culture",  label:"Company overview, values and code of conduct briefing; safety induction (if applicable to role)", responsible:"Senior HR Executive" },
    ],
  },
  {
    day: 3,
    activities: [
      { key:"day3_training", label:"Department-specific process training — SOPs, tools, workflows and systems walkthrough",          responsible:"Talent Acquisition Head / Dept Head" },
    ],
  },
  {
    day: 4,
    activities: [
      { key:"day4_shadow",   label:"On-the-job shadowing — employee observes tasks with a buddy or senior team member",              responsible:"Reporting Manager" },
    ],
  },
  {
    day: 5,
    activities: [
      { key:"day5_tasks",    label:"Supervised task performance — employee performs assigned tasks with manager oversight",          responsible:"Reporting Manager" },
    ],
  },
  {
    day: 6,
    activities: [
      { key:"day6_signoff",  label:"Performance check-in with reporting manager; induction sign-off; onboarding marked complete by HR", responsible:"Senior HR Executive + Manager" },
    ],
  },
];

const ALL_ACTIVITY_KEYS = INDUCTION_DAYS.flatMap(d => d.activities.map(a => a.key));

const EMPTY_FORM = {
  joining_date: "",
  final_designation: "",
  department: "",
  reporting_manager: "",
  confirmed_salary: "",
  pf_enrolled: false,
  esic_enrolled: false,
  id_card_issued: false,
  system_access_granted: false,
};

export default function OnboardingPage() {
  const { user } = useAuth();

  const [candidates, setCandidates]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [search, setSearch]           = useState("");
  const [form, setForm]               = useState(EMPTY_FORM);
  const [checklist, setChecklist]     = useState({});
  const [formMode, setFormMode]       = useState("details"); // "details" | "induction"
  const [submitting, setSubmitting]   = useState(false);
  const [completing, setCompleting]   = useState(false);
  const [success, setSuccess]         = useState(null);
  const [error, setError]             = useState("");
  const [errors, setErrors]           = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getOnboardingCandidates();
    setCandidates(res?.rows || res?.candidates || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function selectCandidate(c) {
    setSelected(c);
    setForm({ ...EMPTY_FORM, ...(c.onboarding || {}) });
    setChecklist(c.induction_checklist || {});
    setFormMode("details");
    setSuccess(null);
    setError("");
    setErrors({});
  }

  function validate() {
    const e = {};
    if (!form.joining_date)      e.joining_date = "Required";
    if (!form.final_designation) e.final_designation = "Required";
    if (!form.department)        e.department = "Required";
    if (!form.reporting_manager) e.reporting_manager = "Required";
    if (!form.confirmed_salary)  e.confirmed_salary = "Required";
    return e;
  }

  async function handleSubmitDetails(e) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setSubmitting(true);
    setError("");
    const res = await submitOnboarding({
      candidate_id: selected.candidate_id || selected.CandidateID,
      ...form,
      prepared_by: user?.email,
      created_at: new Date().toISOString(),
    });
    setSubmitting(false);
    if (res?.success) {
      setFormMode("induction");
      setSuccess("Details saved. Proceed with Day 1–6 induction tracking.");
    } else {
      setError(res?.error || "Failed to save onboarding details.");
    }
  }

  async function handleDayToggle(key, value) {
    const newChecklist = { ...checklist, [key]: value };
    setChecklist(newChecklist);
    await updateOnboardingDay({
      candidate_id: selected.candidate_id || selected.CandidateID,
      activity_key: key,
      completed: value,
      updated_by: user?.email,
      updated_at: new Date().toISOString(),
    });
  }

  async function handleComplete() {
    if (!ALL_ACTIVITY_KEYS.every(k => checklist[k])) {
      setError("All induction activities must be completed before marking onboarding complete (SOP §12)."); return;
    }
    setCompleting(true);
    setError("");
    const res = await completeOnboarding({
      candidate_id: selected.candidate_id || selected.CandidateID,
      completed_by: user?.email,
      completed_at: new Date().toISOString(),
    });
    setCompleting(false);
    if (res?.success) {
      setSuccess("Onboarding complete. CHRO and TA Head have been notified. Candidate journey is closed.");
      setCandidates(prev => prev.filter(c =>
        (c.candidate_id || c.CandidateID) !== (selected.candidate_id || selected.CandidateID)
      ));
      setSelected(null);
    } else {
      setError(res?.error || "Failed to complete onboarding.");
    }
  }

  const filtered = candidates.filter(c => {
    const q = search.toLowerCase();
    return !q ||
      (c.candidate_name || c.FullName || "").toLowerCase().includes(q) ||
      (c.candidate_id || c.CandidateID || "").toLowerCase().includes(q);
  });

  const allDone = ALL_ACTIVITY_KEYS.every(k => checklist[k]);
  const F = (field, label, type = "text") => (
    <div>
      <label style={{ fontSize:12, fontWeight:600, display:"block", marginBottom:4, color:"var(--color-text-primary)" }}>
        {label} <span style={{ color:"#dc2626" }}>*</span>
      </label>
      <input
        type={type}
        value={form[field]}
        onChange={e => { setForm(p => ({ ...p, [field]: e.target.value })); setErrors(p => ({ ...p, [field]: "" })); }}
        style={{
          width:"100%", padding:"7px 10px", borderRadius:6,
          border:`1px solid ${errors[field] ? "#dc2626" : "var(--color-border)"}`,
          fontSize:12, background:"var(--color-background)", color:"var(--color-text-primary)",
          boxSizing:"border-box",
        }}
      />
      {errors[field] && <div style={{ color:"#dc2626", fontSize:10, marginTop:2 }}>{errors[field]}</div>}
    </div>
  );
  const Chk = (field, label) => (
    <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:12, color:"var(--color-text-primary)" }}>
      <input
        type="checkbox"
        checked={!!form[field]}
        onChange={e => setForm(p => ({ ...p, [field]: e.target.checked }))}
        style={{ width:14, height:14 }}
      />
      {label}
    </label>
  );

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
            Onboarding
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
              No candidates at onboarding stage.
            </div>
          ) : filtered.map(c => {
            const id = c.candidate_id || c.CandidateID;
            const isActive = (selected?.candidate_id || selected?.CandidateID) === id;
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
                  {c.candidate_name || c.FullName}
                </div>
                <div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>
                  {c.position_title || c.Title || "—"} &bull; {id}
                </div>
                {c.joining_date && (
                  <div style={{ fontSize:10, color:"#15803d", marginTop:2 }}>Joining: {c.joining_date}</div>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ padding:"8px 12px", borderTop:"1px solid var(--color-border)", fontSize:10, color:"var(--color-text-secondary)" }}>
          {filtered.length} candidate{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Right: Onboarding details + Induction tracker ────── */}
      <div style={{ flex:1, overflowY:"auto", padding:24 }} className="custom-scrollbar">

        {success && (
          <div style={{ background:"#dcfce7", border:"1px solid #16a34a", borderRadius:8, padding:"12px 16px", marginBottom:20, fontSize:13, color:"#15803d" }}>
            ✓ {success}
          </div>
        )}

        {!selected ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"60%", gap:12, color:"var(--color-text-secondary)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ opacity:0.3 }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            <div style={{ fontSize:14, fontWeight:600 }}>Select a candidate</div>
            <div style={{ fontSize:12 }}>Complete onboarding form and Day 1–6 induction tracking</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:18, fontWeight:700, color:"var(--color-text-primary)" }}>
                {selected.candidate_name || selected.FullName}
              </div>
              <div style={{ fontSize:12, color:"var(--color-text-secondary)", marginTop:2 }}>
                {selected.candidate_id || selected.CandidateID} &bull; {selected.position_title || selected.Title}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:"1px solid var(--color-border)" }}>
              {["details","induction"].map(t => (
                <button
                  key={t}
                  onClick={() => setFormMode(t)}
                  style={{
                    padding:"8px 18px", border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                    background:"transparent",
                    borderBottom: formMode === t ? "2px solid var(--color-accent-500)" : "2px solid transparent",
                    color: formMode === t ? "var(--color-accent-500)" : "var(--color-text-secondary)",
                  }}
                >
                  {t === "details" ? "Onboarding Details" : "Day 1–6 Induction"}
                </button>
              ))}
            </div>

            {error && <div style={{ color:"#dc2626", fontSize:12, marginBottom:14 }}>{error}</div>}

            {/* ── Tab: Onboarding Details form ─────────────── */}
            {formMode === "details" && (
              <form onSubmit={handleSubmitDetails}>
                <div style={{
                  background:"var(--color-surface)", border:"1px solid var(--color-border)",
                  borderRadius:10, padding:20,
                }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--color-primary-700)", marginBottom:16 }}>
                    Joining Details (SOP §12, F8 — Onboarding Form)
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                    {F("joining_date",      "Confirmed Joining Date",   "date")}
                    {F("final_designation", "Final Designation")}
                    {F("department",        "Department")}
                    {F("reporting_manager", "Reporting Manager")}
                    {F("confirmed_salary",  "Confirmed Monthly Salary (₹)")}
                  </div>
                  <div style={{ display:"flex", gap:20, flexWrap:"wrap", marginBottom:20 }}>
                    {Chk("pf_enrolled",           "PF Enrolled")}
                    {Chk("esic_enrolled",          "ESIC Enrolled")}
                    {Chk("id_card_issued",         "ID Card Issued")}
                    {Chk("system_access_granted",  "System Access Granted")}
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding:"10px 24px", borderRadius:6, fontWeight:700, fontSize:13,
                      background:"var(--color-primary-700)", color:"#fff", border:"none",
                      cursor:"pointer", opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting ? "Saving…" : "Save & Proceed to Induction Tracker"}
                  </button>
                </div>
              </form>
            )}

            {/* ── Tab: Day 1–6 Induction Tracker ──────────── */}
            {formMode === "induction" && (
              <div>
                <div style={{
                  background:"var(--color-surface)", border:"1px solid var(--color-border)",
                  borderRadius:10, overflow:"hidden", marginBottom:16,
                }}>
                  <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--color-border)", fontSize:12, fontWeight:700, color:"var(--color-primary-700)" }}>
                    Day 1–6 Induction Checklist (SOP §12.1)
                  </div>
                  {INDUCTION_DAYS.map(({ day, activities }) => (
                    <div key={day} style={{ borderBottom:"1px solid var(--color-border)" }}>
                      <div style={{
                        padding:"8px 16px", background:"var(--color-background)",
                        fontSize:11, fontWeight:700, color:"var(--color-text-secondary)",
                        display:"flex", alignItems:"center", gap:8,
                      }}>
                        <span style={{
                          width:22, height:22, borderRadius:"50%", background:"var(--color-primary-700)",
                          color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center",
                          fontSize:10, fontWeight:800, flexShrink:0,
                        }}>D{day}</span>
                        Day {day}
                      </div>
                      {activities.map(act => (
                        <label key={act.key} style={{
                          display:"flex", alignItems:"flex-start", gap:10, padding:"10px 16px",
                          cursor:"pointer",
                          background: checklist[act.key] ? "rgba(22,163,74,0.05)" : "transparent",
                        }}>
                          <input
                            type="checkbox"
                            checked={!!checklist[act.key]}
                            onChange={e => handleDayToggle(act.key, e.target.checked)}
                            style={{ width:15, height:15, marginTop:1, flexShrink:0 }}
                          />
                          <div>
                            <div style={{ fontSize:12, color:"var(--color-text-primary)", lineHeight:1.5 }}>{act.label}</div>
                            <div style={{ fontSize:10, color:"var(--color-text-secondary)", marginTop:2 }}>
                              Responsible: {act.responsible}
                            </div>
                          </div>
                          {checklist[act.key] && (
                            <span style={{ marginLeft:"auto", fontSize:10, color:"#16a34a", fontWeight:700, flexShrink:0 }}>✓ Done</span>
                          )}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Progress summary */}
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                  <div style={{
                    flex:1, height:6, borderRadius:3, background:"var(--color-border)", overflow:"hidden",
                  }}>
                    <div style={{
                      height:"100%", borderRadius:3, background:"#16a34a",
                      width:`${Math.round((ALL_ACTIVITY_KEYS.filter(k => checklist[k]).length / ALL_ACTIVITY_KEYS.length) * 100)}%`,
                      transition:"width 0.4s",
                    }}/>
                  </div>
                  <span style={{ fontSize:12, color:"var(--color-text-secondary)", whiteSpace:"nowrap" }}>
                    {ALL_ACTIVITY_KEYS.filter(k => checklist[k]).length} / {ALL_ACTIVITY_KEYS.length} activities
                  </span>
                </div>

                <button
                  onClick={handleComplete}
                  disabled={completing || !allDone}
                  title={!allDone ? "Complete all induction activities first" : ""}
                  style={{
                    padding:"10px 24px", borderRadius:6, fontWeight:700, fontSize:13,
                    background: allDone ? "#16a34a" : "var(--color-border)",
                    color: allDone ? "#fff" : "var(--color-text-secondary)",
                    border:"none", cursor: allDone ? "pointer" : "not-allowed",
                    opacity: completing ? 0.7 : 1,
                  }}
                >
                  {completing ? "Completing…" : "Mark Onboarding Complete — Close Candidate Journey"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
