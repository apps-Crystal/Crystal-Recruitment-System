/**
 * Module 1 — All Requisitions (SOP-HR-001 §5)
 * Full filterable/searchable list of all requisitions.
 * Accessible to: chro, ta_head, management, admin
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRequisitions } from "../utils/api";
import { canRaise, canApproveReq } from "../utils/rbac";
import {
  PageHeader, Card, ReqStatusBadge, LoadingPane, EmptyState,
  Button, Badge,
} from "../components/ui";

/* ── Constants ───────────────────────────────────────────────── */
const STATUS_TABS = [
  "ALL",
  "Pending Approval",
  "Approved",
  "Hiring in Progress",
  "Closed",
  "Rejected",
];

const DEPARTMENTS = [
  "All Departments",
  "Technology",
  "Operations",
  "Finance",
  "Human Resources",
  "Sales",
  "Marketing",
  "Legal",
  "Administration",
];

/* ── Icons ───────────────────────────────────────────────────── */
const REFRESH_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);
const PLUS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const SEARCH_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

/* ── Columns ─────────────────────────────────────────────────── */
const COLS = [
  { key: "req_id",        label: "Req ID",       width: 130 },
  { key: "position_title",label: "Position",     width: 180 },
  { key: "department",    label: "Department",   width: 120 },
  { key: "location",      label: "Location",     width: 120 },
  { key: "total_nos",     label: "Vacancies",    width: 70  },
  { key: "poc",           label: "POC",          width: 130 },
  { key: "status",        label: "Status",       width: 160 },
  { key: "raised_at",     label: "Raised On",    width: 100 },
  { key: "approval_date", label: "Approved On",  width: 100 },
  { key: "tat_days",      label: "TAT",          width: 60  },
];

/* ── Component ───────────────────────────────────────────────── */
export default function AllRequisitionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("ALL");
  const [search, setSearch]     = useState("");
  const [dept, setDept]         = useState("All Departments");
  const [sortKey, setSortKey]   = useState("raised_at");
  const [sortDir, setSortDir]   = useState("desc");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getRequisitions();
    setRows(res?.rows || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Filter + Sort ── */
  const filtered = rows
    .filter(r => tab === "ALL" || r.status === tab)
    .filter(r => dept === "All Departments" || r.department === dept)
    .filter(r => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (r.req_id        || "").toLowerCase().includes(q) ||
        (r.position_title|| "").toLowerCase().includes(q) ||
        (r.poc           || "").toLowerCase().includes(q) ||
        (r.department    || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const va = a[sortKey] ?? "";
      const vb = b[sortKey] ?? "";
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

  /* ── Tab counts ── */
  const tabCount = (t) =>
    t === "ALL" ? rows.length : rows.filter(r => r.status === t).length;

  /* ── Sort toggle ── */
  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  /* ── KPI summary ── */
  const kpi = {
    total:    rows.length,
    pending:  rows.filter(r => r.status === "Pending Approval").length,
    active:   rows.filter(r => ["Approved", "Hiring in Progress"].includes(r.status)).length,
    closed:   rows.filter(r => r.status === "Closed").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── Header ── */}
      <PageHeader
        title="All Requisitions"
        subtitle={`Viewing all ${rows.length} requisitions · ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
        actions={
          <>
            <button
              onClick={load}
              title="Refresh"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 30, padding: "0 10px",
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6, color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer",
              }}
            >
              {REFRESH_ICON}
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {canRaise(user?.role) && (
              <button
                onClick={() => navigate("/raise")}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  height: 30, padding: "0 14px",
                  background: "var(--color-accent-500)", border: "none",
                  borderRadius: 6, color: "var(--color-primary-900)",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                {PLUS_ICON}
                New Requisition
              </button>
            )}
          </>
        }
      />

      {/* ── Body ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* ── KPI Strip ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12, padding: "16px 20px 0",
        }}>
          {[
            { label: "Total",          value: kpi.total,   color: "var(--color-primary-700)" },
            { label: "Pending",        value: kpi.pending, color: "#d97706" },
            { label: "Active",         value: kpi.active,  color: "#2563eb" },
            { label: "Closed",         value: kpi.closed,  color: "#16a34a" },
          ].map(k => (
            <Card key={k.label} style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {k.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            </Card>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 20px 0", flexWrap: "wrap",
        }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 320 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)", display: "flex" }}>
              {SEARCH_ICON}
            </span>
            <input
              placeholder="Search by ID, position, POC…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "7px 10px 7px 32px", borderRadius: 6,
                border: "1px solid var(--color-border)", fontSize: 12,
                background: "var(--color-background)", color: "var(--color-text-primary)",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Department filter */}
          <select
            value={dept}
            onChange={e => setDept(e.target.value)}
            style={{
              padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-border)",
              fontSize: 12, background: "var(--color-background)", color: "var(--color-text-primary)",
              flex: "0 0 auto",
            }}
          >
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>

          <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-secondary)" }}>
            {filtered.length} of {rows.length}
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div style={{
          display: "flex", gap: 0, padding: "10px 20px 0",
          borderBottom: "1px solid var(--color-border)", overflowX: "auto",
        }}>
          {STATUS_TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "8px 14px", border: "none", borderRadius: 0, fontSize: 11,
                fontWeight: tab === t ? 700 : 500, cursor: "pointer",
                background: "transparent", whiteSpace: "nowrap",
                color: tab === t ? "var(--color-primary-800)" : "var(--color-text-secondary)",
                borderBottom: tab === t ? "2px solid var(--color-primary-700)" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t}
              <span style={{
                marginLeft: 6, padding: "1px 6px", borderRadius: 10,
                background: tab === t ? "var(--color-primary-100)" : "var(--color-border)",
                color: tab === t ? "var(--color-primary-800)" : "var(--color-text-secondary)",
                fontSize: 9, fontWeight: 700,
              }}>
                {tabCount(t)}
              </span>
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        <div style={{ flex: 1, overflowY: "auto" }} className="custom-scrollbar">
          {loading ? (
            <LoadingPane text="Loading requisitions…" />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No requisitions found"
              body="Try changing your filters or create a new requisition."
              action={canRaise(user?.role) && (
                <Button variant="accent" onClick={() => navigate("/raise")}>
                  {PLUS_ICON} New Requisition
                </Button>
              )}
            />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{ background: "var(--color-primary-50)", borderBottom: "1px solid var(--color-border)" }}>
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={{
                        textAlign: "left", padding: "10px 14px", fontSize: 10,
                        fontWeight: 700, color: "var(--color-text-secondary)",
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        minWidth: col.width, cursor: "pointer", whiteSpace: "nowrap",
                        userSelect: "none",
                      }}
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span style={{ marginLeft: 4, opacity: 0.7 }}>
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
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
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 11, color: "var(--color-primary-700)" }}>
                        {r.req_id || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.3 }}>
                        {r.position_title || "—"}
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                      {r.department || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                      {r.location || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "var(--color-text-primary)" }}>
                      {r.total_nos || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                      {r.poc || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <ReqStatusBadge status={r.status} />
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                      {r.raised_at || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                      {r.approval_date || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      {r.tat_days
                        ? <Badge color="#15803d" bg="#dcfce7">{r.tat_days}d</Badge>
                        : <span style={{ color: "var(--color-text-secondary)" }}>—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "8px 20px", borderTop: "1px solid var(--color-border)",
          display: "flex", justifyContent: "space-between",
          fontSize: 11, color: "var(--color-text-secondary)",
          background: "var(--color-primary-50)",
        }}>
          <span>Showing {filtered.length} of {rows.length} requisition{rows.length !== 1 ? "s" : ""}</span>
          <span>Updated {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>
    </div>
  );
}
