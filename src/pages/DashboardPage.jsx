import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRequisitions, getScreenings } from "../utils/api";
import { canRaise, canApprove } from "../utils/rbac";

const STATUS_CFG = {
  "Pending Approval":  { bg: "rgba(245,124,0,0.10)",  color: "#d97706",  dot: "#f59e0b" },
  "Approved":          { bg: "rgba(46,125,50,0.10)",  color: "#16a34a",  dot: "#22c55e" },
  "Rejected":          { bg: "rgba(198,40,40,0.10)",  color: "#dc2626",  dot: "#ef4444" },
  "Changes Requested": { bg: "rgba(245,124,0,0.10)",  color: "#d97706",  dot: "#f59e0b" },
  "Hiring in Progress":{ bg: "rgba(72,101,129,0.12)", color: "#486581",  dot: "#627d98" },
  "Closed":            { bg: "rgba(90,106,122,0.10)", color: "#5a6a7a",  dot: "#9fb3c8" },
  "Draft":             { bg: "rgba(224,228,237,0.6)", color: "#5a6a7a",  dot: "#bcccdc" },
};

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG["Draft"];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-sm whitespace-nowrap"
      style={{ background: c.bg, color: c.color }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot, display: "inline-block", flexShrink: 0 }} />
      {status}
    </span>
  );
}

const Icons = {
  total:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
  pending: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  active:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  closed:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  tat:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  raise:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  approve: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>,
};

const TABS = ["ALL", "Pending Approval", "Approved", "Hiring in Progress", "Closed", "Rejected"];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("ALL");
  const [screeningCounts, setScreeningCounts] = useState({});

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [res, scrRes] = await Promise.all([getRequisitions(), getScreenings()]);
    if (res?.rows?.length) setRows(res.rows);
    if (scrRes?.rows) {
      const counts = {};
      scrRes.rows.forEach(r => { counts[r.req_id] = (counts[r.req_id] || 0) + 1; });
      setScreeningCounts(counts);
    }
    setLoading(false);
  }

  const counts = {
    total:   rows.length,
    pending: rows.filter(r => r.status === "Pending Approval").length,
    active:  rows.filter(r => ["Approved", "Hiring in Progress"].includes(r.status)).length,
    closed:  rows.filter(r => r.status === "Closed").length,
    avgTat: (() => {
      const c = rows.filter(r => r.tat_days && Number(r.tat_days) > 0);
      return c.length ? Math.round(c.reduce((s, r) => s + Number(r.tat_days), 0) / c.length) + " days" : "—";
    })(),
  };

  const pipelineStages = [
    { label: "Total",            count: counts.total,   color: "var(--color-primary-600)" },
    { label: "Pending Approval", count: counts.pending, color: "#d97706" },
    { label: "Active",           count: counts.active,  color: "var(--color-primary-500)" },
    { label: "Closed",           count: counts.closed,  color: "#16a34a" },
  ];

  const filtered = tab === "ALL" ? rows : rows.filter(r => r.status === tab);

  return (
    <div>
      {/* ── Page Header ── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-3 sm:px-6"
        style={{ background: "var(--color-primary-900)", borderBottom: "1px solid rgba(255,255,255,0.07)", height: 56 }}
      >
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white leading-none truncate">Requisition Dashboard</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: "rgba(255,255,255,0.45)" }}>
            Welcome back, {user?.name?.split(" ")[0]} · {new Date().toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Refresh — icon only on xs */}
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 h-7 px-2 sm:px-3 text-xs font-medium rounded-sm transition-colors"
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.13)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
            title="Refresh"
          >
            {Icons.refresh}
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {canRaise(user?.role) && (
            <button
              onClick={() => navigate("/raise")}
              className="flex items-center gap-1.5 h-7 px-2 sm:px-3 text-xs font-semibold rounded-sm transition-colors"
              style={{ background: "var(--color-accent-500)", color: "var(--color-primary-900)", border: "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--color-accent-600)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--color-accent-500)"}
            >
              {Icons.raise}
              <span className="hidden xs:inline sm:inline">Raise</span>
              <span className="hidden md:inline"> Requisition</span>
            </button>
          )}

          {canApprove(user?.role) && (
            <button
              onClick={() => navigate("/approve")}
              className="flex items-center gap-1.5 h-7 px-2 sm:px-3 text-xs font-semibold rounded-sm transition-colors"
              style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.22)", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
            >
              {Icons.approve}
              <span className="hidden sm:inline">Approve</span>
              {counts.pending > 0 && (
                <span className="inline-flex items-center justify-center rounded-full font-bold" style={{ width: 16, height: 16, background: "#ef4444", color: "#fff", fontSize: 9 }}>
                  {counts.pending}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-3 md:p-6 flex flex-col gap-4 md:gap-5">

        {/* ── KPI Cards — 2 cols mobile, 3 cols sm, 5 cols lg ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
          {[
            { label: "Total Requisitions", value: counts.total,   icon: Icons.total,   accent: "var(--color-primary-700)", iconBg: "rgba(72,101,129,0.1)"  },
            { label: "Pending Approval",   value: counts.pending, icon: Icons.pending, accent: "#d97706",                  iconBg: "rgba(245,124,0,0.1)"   },
            { label: "Active / Approved",  value: counts.active,  icon: Icons.active,  accent: "var(--color-primary-600)", iconBg: "rgba(72,101,129,0.1)"  },
            { label: "Positions Closed",   value: counts.closed,  icon: Icons.closed,  accent: "#16a34a",                  iconBg: "rgba(46,125,50,0.1)"   },
            { label: "Average TAT",        value: counts.avgTat,  icon: Icons.tat,     accent: "var(--color-accent-500)",  iconBg: "rgba(200,169,81,0.1)"  },
          ].map(c => (
            <div key={c.label} className="enterprise-card px-3 md:px-4 py-3 md:py-3.5 flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium leading-none mb-1.5 md:mb-2" style={{ color: "var(--color-text-secondary)" }}>{c.label}</p>
                <div className="text-xl md:text-2xl font-extrabold leading-none" style={{ color: c.accent }}>{c.value}</div>
              </div>
              <div className="flex items-center justify-center rounded-sm flex-shrink-0 ml-2" style={{ width: 32, height: 32, background: c.iconBg, color: c.accent }}>
                {c.icon}
              </div>
            </div>
          ))}
        </div>

        {/* ── Pipeline Strip ── */}
        <div className="enterprise-card px-4 md:px-5 py-3 md:py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-secondary)", letterSpacing: "0.08em" }}>Requisition Pipeline</p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{rows.length} total</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {pipelineStages.map(s => (
              <div key={s.label}>
                <div className="flex items-end justify-between mb-1">
                  <span className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>{s.label}</span>
                  <span className="text-sm font-bold ml-1 flex-shrink-0" style={{ color: s.color }}>{s.count}</span>
                </div>
                <div className="rounded-sm overflow-hidden" style={{ height: 4, background: "var(--color-border)" }}>
                  <div
                    className="h-full rounded-sm transition-all"
                    style={{ width: counts.total ? `${Math.round((s.count / counts.total) * 100)}%` : "0%", background: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Status Tabs + Table ── */}
        <div className="enterprise-card overflow-hidden">
          {/* Tab bar */}
          <div
            className="flex items-center px-1 sm:px-2 overflow-x-auto custom-scrollbar"
            style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" }}
          >
            {TABS.map(t => {
              const cnt = t === "ALL" ? rows.length : rows.filter(r => r.status === t).length;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-2.5 sm:py-3 text-xs font-semibold whitespace-nowrap transition-colors relative flex-shrink-0"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: tab === t ? "var(--color-primary-800)" : "var(--color-text-secondary)",
                    borderBottom: tab === t ? "2px solid var(--color-primary-700)" : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {t}
                  <span
                    className="inline-flex items-center justify-center rounded-full"
                    style={{
                      minWidth: 16, height: 16, padding: "0 4px",
                      background: tab === t ? "var(--color-primary-100)" : "var(--color-border)",
                      color: tab === t ? "var(--color-primary-800)" : "var(--color-text-secondary)",
                      fontSize: 9, fontWeight: 700,
                    }}
                  >
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <svg className="animate-spin mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Loading requisitions…
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                    {[
                      { h: "Req ID",        w: 130 },
                      { h: "Position",      w: 160 },
                      { h: "Department",    w: 100 },
                      { h: "Location",      w: 130 },
                      { h: "Nos",           w: 44  },
                      { h: "POC",           w: 110 },
                      { h: "Status",        w: 150 },
                      { h: "Raised On",     w: 95  },
                      { h: "Approval Date", w: 105 },
                      { h: "Closed Date",   w: 95  },
                      { h: "TAT",           w: 60  },
                    ].map(({ h, w }) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold px-3 md:px-4 py-2.5 whitespace-nowrap"
                        style={{ color: "var(--color-text-secondary)", background: "var(--color-primary-50)", minWidth: w, letterSpacing: "0.02em" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-14 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        No requisitions found for this status.
                      </td>
                    </tr>
                  ) : filtered.map((r, i) => (
                    <tr
                      key={r.req_id || i}
                      style={{ borderBottom: "1px solid var(--color-border)", cursor: "default" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--color-primary-50)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td className="px-3 md:px-4 py-2.5 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold" style={{ color: "var(--color-primary-700)" }}>{r.req_id || "—"}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5">
                        <span className="text-xs font-semibold leading-tight" style={{ color: "var(--color-text-primary)" }}>{r.position_title || "—"}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>{r.department || "—"}</td>
                      <td className="px-3 md:px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{r.location || "—"}</td>
                      <td className="px-3 md:px-4 py-2.5 text-xs text-center font-semibold" style={{ color: "var(--color-text-primary)" }}>{r.total_nos || "—"}</td>
                      <td className="px-3 md:px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{r.poc || "—"}</td>
                      <td className="px-3 md:px-4 py-2.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={r.status} />
                          {screeningCounts[r.req_id] > 0 && (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-sm w-fit"
                              style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.25)" }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                              </svg>
                              Screening Started · {screeningCounts[r.req_id]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{r.raised_at || "—"}</td>
                      <td className="px-3 md:px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{r.approval_date || "—"}</td>
                      <td className="px-3 md:px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{r.closed_date || "—"}</td>
                      <td className="px-3 md:px-4 py-2.5 text-xs text-center">
                        {r.tat_days
                          ? <span className="font-bold" style={{ color: "#16a34a" }}>{r.tat_days}d</span>
                          : <span style={{ color: "var(--color-text-secondary)" }}>—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table footer */}
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0 px-3 md:px-4 py-2 text-xs"
            style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-primary-50)", color: "var(--color-text-secondary)" }}
          >
            <span>Showing {filtered.length} of {rows.length} requisition{rows.length !== 1 ? "s" : ""}</span>
            <span>Last updated: {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
