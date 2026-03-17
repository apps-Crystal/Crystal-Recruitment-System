import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRequisitions } from "../utils/api";

const STATUS_BADGE = {
  "Pending Approval":  { bg: "rgba(245,124,0,0.1)",   color: "var(--color-warning)"      },
  "Approved":          { bg: "rgba(46,125,50,0.1)",   color: "var(--color-success)"      },
  "Rejected":          { bg: "rgba(198,40,40,0.1)",   color: "var(--color-danger)"       },
  "Changes Requested": { bg: "rgba(245,124,0,0.1)",   color: "var(--color-warning)"      },
  "Hiring in Progress":{ bg: "rgba(72,101,129,0.12)", color: "var(--color-primary-600)"  },
  "Closed":            { bg: "rgba(90,106,122,0.1)",  color: "var(--color-text-secondary)" },
};

function Badge({ status }) {
  const cfg = STATUS_BADGE[status] || STATUS_BADGE["Closed"];
  return (
    <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-sm whitespace-nowrap" style={{ background: cfg.bg, color: cfg.color }}>
      {status}
    </span>
  );
}


export default function MyRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await getRequisitions();
    if (res?.rows?.length) setRows(res.rows.filter(r => r.raised_by === user?.email));
  }

  return (
    <div>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-3 sm:px-6"
        style={{ background: "var(--color-primary-900)", borderBottom: "1px solid rgba(255,255,255,0.07)", height: 56 }}
      >
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white leading-tight">My Requisitions</h1>
          <p className="text-xs hidden sm:block" style={{ color: "rgba(255,255,255,0.45)" }}>Raised by {user?.name}</p>
        </div>
        <button
          onClick={() => navigate("/raise")}
          className="flex items-center gap-1.5 h-7 px-2 sm:px-3 text-xs font-semibold rounded-sm flex-shrink-0 transition-colors"
          style={{ background: "var(--color-accent-500)", color: "var(--color-primary-900)", border: "none", cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--color-accent-600)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--color-accent-500)"}
        >
          + <span className="hidden sm:inline">New Requisition</span><span className="sm:hidden">New</span>
        </button>
      </div>

      <div className="p-3 md:p-6">
        <div className="enterprise-card overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {["Req ID", "Position", "Department", "Location", "Nos", "Status", "Raised On", "Approval Date", "TAT"].map(h => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold px-3 md:px-4 py-2.5 whitespace-nowrap"
                      style={{ color: "var(--color-text-secondary)", background: "var(--color-primary-50)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      No requisitions found.{" "}
                      <button
                        onClick={() => navigate("/raise")}
                        className="font-semibold"
                        style={{ color: "var(--color-primary-700)", background: "none", border: "none", cursor: "pointer" }}
                      >
                        Raise one now →
                      </button>
                    </td>
                  </tr>
                ) : rows.map((r, i) => (
                  <tr
                    key={r.req_id || i}
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--color-primary-50)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td className="px-3 md:px-4 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold" style={{ color: "var(--color-primary-700)" }}>{r.req_id}</span>
                    </td>
                    <td className="px-3 md:px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>{r.position_title}</td>
                    <td className="px-3 md:px-4 py-2.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>{r.department}</td>
                    <td className="px-3 md:px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{r.location}</td>
                    <td className="px-3 md:px-4 py-2.5 text-xs text-center">{r.total_nos}</td>
                    <td className="px-3 md:px-4 py-2.5 whitespace-nowrap"><Badge status={r.status} /></td>
                    <td className="px-3 md:px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{r.raised_at || "—"}</td>
                    <td className="px-3 md:px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{r.approval_date || "—"}</td>
                    <td className="px-3 md:px-4 py-2.5 text-xs text-center font-bold" style={{ color: r.tat_days ? "var(--color-success)" : "var(--color-text-secondary)", fontWeight: r.tat_days ? 700 : 400 }}>
                      {r.tat_days ? `${r.tat_days}d` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div
            className="px-3 md:px-4 py-2 text-xs"
            style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-primary-50)", color: "var(--color-text-secondary)" }}
          >
            {rows.length} requisition{rows.length !== 1 ? "s" : ""} found
          </div>
        </div>
      </div>
    </div>
  );
}
