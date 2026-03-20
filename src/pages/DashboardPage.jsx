/**
 * Dashboard — SOP-HR-001
 * Shows requisition KPIs + candidate pipeline stage breakdown.
 * Visible to all authenticated roles (read-only overview).
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRequisitions, getScreenings, getCandidates } from "../utils/api";
import { canRaise, canApproveReq, STAGES } from "../utils/rbac";
import { PageHeader, Card, ReqStatusBadge, Badge, Spinner } from "../components/ui";

/* ── Icons ───────────────────────────────────────────────────── */
const I = {
  refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  plus:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  check:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>,
  req:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  clock:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  active:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  closed:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  tat:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  cand:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
};

/* ── SOP pipeline stage config (§3.1) ────────────────────────── */
const PIPELINE_STAGES = [
  { key: "SCREENING",      label: "Screening",      color: "#2563eb", bg: "#dbeafe" },
  { key: "AI_EVALUATION",  label: "AI Evaluation",  color: "#7c3aed", bg: "#ede9fe" },
  { key: "HR_DECISION",    label: "HR Decision",    color: "#d97706", bg: "#fef3c7" },
  { key: "INTERVIEW",      label: "Interview",      color: "#059669", bg: "#d1fae5" },
  { key: "DOCUMENTS",      label: "Documents",      color: "#db2777", bg: "#fce7f3" },
  { key: "OFFER_APPROVAL", label: "Offer Approval", color: "#ea580c", bg: "#fff7ed" },
  { key: "OFFER_RELEASED", label: "Offer Released", color: "#047857", bg: "#ecfdf5" },
  { key: "ONBOARDING",     label: "Onboarding",     color: "#15803d", bg: "#f0fdf4" },
  { key: "COMPLETED",      label: "Completed",      color: "#15803d", bg: "#dcfce7" },
];

const RECENT_TABS = ["ALL", "Pending Approval", "Approved", "Hiring in Progress", "Closed"];

export default function DashboardPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [rows, setRows]               = useState([]);
  const [candidates, setCandidates]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    const [rRes, cRes] = await Promise.all([getRequisitions(), getCandidates()]);
    setRows(rRes?.rows || []);
    setCandidates(cRes?.rows || cRes?.candidates || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── KPIs ── */
  const kpi = {
    total:    rows.length,
    pending:  rows.filter(r => r.status === "Pending Approval").length,
    active:   rows.filter(r => ["Approved", "Hiring in Progress"].includes(r.status)).length,
    closed:   rows.filter(r => r.status === "Closed").length,
    avgTat:   (() => {
      const c = rows.filter(r => r.tat_days && Number(r.tat_days) > 0);
      return c.length ? `${Math.round(c.reduce((s, r) => s + Number(r.tat_days), 0) / c.length)}d` : "—";
    })(),
    totalCand: candidates.length,
  };

  /* ── Candidate stage counts ── */
  const stageCounts = {};
  candidates.forEach(c => {
    const s = c.stage || c.Stage || "SCREENING";
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  });
  const maxStageCount = Math.max(...Object.values(stageCounts), 1);

  /* ── Recent requisitions ── */
  const filtered = (tab === "ALL" ? rows : rows.filter(r => r.status === tab))
    .slice(0, 10);

  return (
    <div>
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6"
        style={{ background: "var(--color-primary-900)", borderBottom: "1px solid rgba(255,255,255,0.07)", height: 56 }}
      >
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white leading-none">Hiring Dashboard</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: "rgba(255,255,255,0.45)" }}>
            Welcome, {user?.name?.split(" ")[0]} · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={load}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              height: 30, padding: "0 10px",
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6, color: "rgba(255,255,255,0.7)", fontSize: 11, cursor: "pointer",
            }}
          >
            {I.refresh}
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canRaise(user?.role) && (
            <button
              onClick={() => navigate("/raise")}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                height: 30, padding: "0 14px",
                background: "var(--color-accent-500)", border: "none",
                borderRadius: 6, color: "var(--color-primary-900)",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}
            >
              {I.plus} New Requisition
            </button>
          )}
          {canApproveReq(user?.role) && kpi.pending > 0 && (
            <button
              onClick={() => navigate("/approve")}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                height: 30, padding: "0 12px",
                background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)",
                borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}
            >
              {I.check} Approve
              <span style={{
                minWidth: 16, height: 16, borderRadius: "50%", padding: "0 3px",
                background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                {kpi.pending}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6 flex flex-col gap-5">

        {/* ── Requisition KPIs ── */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-secondary)", letterSpacing: "0.08em" }}>
            Requisition Overview
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total Requisitions", value: kpi.total,    icon: I.req,    accent: "var(--color-primary-700)", iconBg: "rgba(72,101,129,0.1)"  },
              { label: "Pending Approval",   value: kpi.pending,  icon: I.clock,  accent: "#d97706",                  iconBg: "rgba(245,124,0,0.1)"   },
              { label: "Active / Approved",  value: kpi.active,   icon: I.active, accent: "var(--color-primary-600)", iconBg: "rgba(72,101,129,0.1)"  },
              { label: "Closed",             value: kpi.closed,   icon: I.closed, accent: "#16a34a",                  iconBg: "rgba(46,125,50,0.1)"   },
              { label: "Avg. TAT",           value: kpi.avgTat,   icon: I.tat,    accent: "var(--color-accent-500)",  iconBg: "rgba(200,169,81,0.1)"  },
              { label: "Total Candidates",   value: kpi.totalCand,icon: I.cand,   accent: "#7c3aed",                  iconBg: "rgba(124,58,237,0.08)" },
            ].map(k => (
              <Card key={k.label} style={{ padding: "12px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div className="min-w-0">
                  <p style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6, lineHeight: 1.3 }}>{k.label}</p>
                  <div style={{ fontSize: 22, fontWeight: 800, color: k.accent, lineHeight: 1 }}>
                    {loading ? <Spinner size={18} color={k.accent} /> : k.value}
                  </div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: k.iconBg, color: k.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 8 }}>
                  {k.icon}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Candidate Pipeline — SOP §3.1 stages ── */}
        <Card style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)", letterSpacing: "0.08em" }}>
              Candidate Pipeline — SOP §3.1
            </div>
            <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
              {kpi.totalCand} candidate{kpi.totalCand !== 1 ? "s" : ""} in system
            </span>
          </div>

          {loading ? (
            <div style={{ display: "flex", gap: 10, padding: "12px 0" }}>
              {PIPELINE_STAGES.map(s => (
                <div key={s.key} style={{ flex: 1, height: 60, borderRadius: 6, background: "var(--color-border)", animation: "pulse 1.5s ease infinite" }} />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              {PIPELINE_STAGES.map((stage, i) => {
                const count = stageCounts[stage.key] || 0;
                const pct   = maxStageCount ? Math.max((count / maxStageCount) * 80, count > 0 ? 12 : 4) : 4;
                return (
                  <div key={stage.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    {/* Count */}
                    <div style={{ fontSize: 13, fontWeight: 800, color: count > 0 ? stage.color : "var(--color-text-secondary)" }}>
                      {count}
                    </div>
                    {/* Bar */}
                    <div style={{ width: "100%", height: 80, position: "relative", display: "flex", alignItems: "flex-end" }}>
                      <div style={{
                        width: "100%", borderRadius: "4px 4px 0 0",
                        background: count > 0 ? stage.bg : "var(--color-border)",
                        border: count > 0 ? `1px solid ${stage.color}33` : "none",
                        height: `${pct}px`,
                        transition: "height 0.6s ease",
                      }} />
                    </div>
                    {/* Label */}
                    <div style={{
                      fontSize: 9, textAlign: "center", fontWeight: count > 0 ? 700 : 400,
                      color: count > 0 ? stage.color : "var(--color-text-secondary)",
                      lineHeight: 1.3, maxWidth: 56,
                    }}>
                      {stage.label}
                    </div>
                    {/* Step number */}
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%",
                      background: count > 0 ? stage.color : "var(--color-border)",
                      color: count > 0 ? "#fff" : "var(--color-text-secondary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, fontWeight: 700,
                    }}>
                      {i + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rejected row */}
          {!loading && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 8 }}>
              <Badge color="#991b1b" bg="#fee2e2">
                Rejected: {stageCounts["REJECTED"] || 0}
              </Badge>
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                candidates removed from pipeline
              </span>
            </div>
          )}
        </Card>

        {/* ── Recent Requisitions ── */}
        <Card style={{ overflow: "hidden" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderBottom: "1px solid var(--color-border)",
          }}>
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)", letterSpacing: "0.08em" }}>
              Recent Requisitions
            </div>
            <button
              onClick={() => navigate("/requisitions")}
              style={{
                fontSize: 11, color: "var(--color-primary-700)", background: "none",
                border: "none", cursor: "pointer", fontWeight: 600,
              }}
            >
              View all →
            </button>
          </div>

          {/* Tab strip */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)", padding: "0 8px", overflowX: "auto" }}>
            {RECENT_TABS.map(t => {
              const cnt = t === "ALL" ? rows.length : rows.filter(r => r.status === t).length;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "8px 12px", border: "none", borderRadius: 0, fontSize: 11,
                    fontWeight: tab === t ? 700 : 500, cursor: "pointer", background: "transparent",
                    whiteSpace: "nowrap",
                    color: tab === t ? "var(--color-primary-800)" : "var(--color-text-secondary)",
                    borderBottom: tab === t ? "2px solid var(--color-primary-700)" : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {t}
                  <span style={{
                    marginLeft: 5, padding: "1px 5px", borderRadius: 8,
                    background: tab === t ? "var(--color-primary-100)" : "var(--color-border)",
                    color: tab === t ? "var(--color-primary-800)" : "var(--color-text-secondary)",
                    fontSize: 9, fontWeight: 700,
                  }}>
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32, gap: 10, color: "var(--color-text-secondary)", fontSize: 13 }}>
              <Spinner size={16} /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 12, color: "var(--color-text-secondary)" }}>
              No requisitions in this status.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--color-primary-50)", borderBottom: "1px solid var(--color-border)" }}>
                    {["Req ID", "Position", "Department", "Location", "Nos.", "Status", "Raised On", "TAT"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr
                      key={r.req_id || i}
                      style={{ borderBottom: "1px solid var(--color-border)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--color-primary-50)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "9px 14px", whiteSpace: "nowrap" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 11, color: "var(--color-primary-700)" }}>{r.req_id || "—"}</span>
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{r.position_title || "—"}</span>
                      </td>
                      <td style={{ padding: "9px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{r.department || "—"}</td>
                      <td style={{ padding: "9px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{r.location || "—"}</td>
                      <td style={{ padding: "9px 14px", textAlign: "center", fontWeight: 700, color: "var(--color-text-primary)" }}>{r.total_nos || "—"}</td>
                      <td style={{ padding: "9px 14px", whiteSpace: "nowrap" }}><ReqStatusBadge status={r.status} /></td>
                      <td style={{ padding: "9px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{r.raised_at || "—"}</td>
                      <td style={{ padding: "9px 14px", textAlign: "center" }}>
                        {r.tat_days
                          ? <Badge color="#15803d" bg="#dcfce7">{r.tat_days}d</Badge>
                          : <span style={{ color: "var(--color-text-secondary)" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{
            padding: "8px 16px", borderTop: "1px solid var(--color-border)",
            display: "flex", justifyContent: "space-between",
            fontSize: 11, color: "var(--color-text-secondary)",
            background: "var(--color-primary-50)",
          }}>
            <span>Showing {filtered.length} of {rows.length}</span>
            <button onClick={() => navigate("/requisitions")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--color-primary-700)", fontWeight: 600 }}>
              View all requisitions →
            </button>
          </div>
        </Card>

      </div>
    </div>
  );
}
