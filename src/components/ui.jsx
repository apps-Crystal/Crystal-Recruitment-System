/**
 * Shared UI Component Library — SOP-HR-001
 * Single source of truth for all primitive components.
 * Import from this file everywhere; do NOT duplicate these inline.
 */
import React from "react";

/* ── Button ──────────────────────────────────────────────────── */
const BTN_VARIANTS = {
  primary:   { background: "var(--color-primary-800)", color: "#fff",                       border: "none" },
  secondary: { background: "var(--color-surface)",     color: "var(--color-text-primary)",  border: "1px solid var(--color-border)" },
  ghost:     { background: "transparent",              color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" },
  danger:    { background: "#dc2626",                  color: "#fff",                       border: "none" },
  success:   { background: "#16a34a",                  color: "#fff",                       border: "none" },
  warning:   { background: "#d97706",                  color: "#fff",                       border: "none" },
  accent:    { background: "var(--color-accent-500)",  color: "var(--color-primary-900)",   border: "none" },
};
const BTN_SIZES = {
  sm: { padding: "4px 10px",  fontSize: 11 },
  md: { padding: "7px 16px",  fontSize: 12 },
  lg: { padding: "10px 24px", fontSize: 13 },
};

export function Button({
  variant = "primary", size = "md", children, disabled, loading,
  onClick, type = "button", style = {}, className = "",
}) {
  const base = BTN_VARIANTS[variant] || BTN_VARIANTS.primary;
  const sz   = BTN_SIZES[size]       || BTN_SIZES.md;
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={className}
      style={{
        ...base, ...sz,
        borderRadius: 6, fontWeight: 600,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.6 : 1,
        display: "inline-flex", alignItems: "center", gap: 6,
        transition: "opacity 150ms, filter 150ms", whiteSpace: "nowrap",
        ...style,
      }}
    >
      {loading && <Spinner size={12} color="currentColor" />}
      {children}
    </button>
  );
}

/* ── Badge ───────────────────────────────────────────────────── */
export function Badge({ children, color = "#6b7280", bg = "#f3f4f6", border, dot, style = {} }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
      color, background: bg,
      border: border ? `1px solid ${border}` : undefined,
      whiteSpace: "nowrap", ...style,
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
      {children}
    </span>
  );
}

/* ── Stage Badge — SOP §3.1 pipeline stages ──────────────────── */
const STAGE_CFG = {
  SCREENING:       { label: "Screening",       bg: "#dbeafe", color: "#1d4ed8" },
  AI_EVALUATION:   { label: "AI Evaluation",   bg: "#ede9fe", color: "#6d28d9" },
  HR_DECISION:     { label: "HR Decision",     bg: "#fef3c7", color: "#92400e" },
  INTERVIEW:       { label: "Interview",       bg: "#d1fae5", color: "#065f46" },
  DOCUMENTS:       { label: "Documents",       bg: "#fce7f3", color: "#9d174d" },
  OFFER_APPROVAL:  { label: "Offer Approval",  bg: "#fff7ed", color: "#c2410c" },
  OFFER_RELEASED:  { label: "Offer Released",  bg: "#ecfdf5", color: "#047857" },
  ONBOARDING:      { label: "Onboarding",      bg: "#f0fdf4", color: "#15803d" },
  COMPLETED:       { label: "Completed",       bg: "#dcfce7", color: "#15803d" },
  REJECTED:        { label: "Rejected",        bg: "#fee2e2", color: "#991b1b" },
};
export function StageBadge({ stage }) {
  const cfg = STAGE_CFG[stage] || { label: stage, bg: "#f3f4f6", color: "#6b7280" };
  return <Badge color={cfg.color} bg={cfg.bg}>{cfg.label}</Badge>;
}

/* ── Fit Badge ───────────────────────────────────────────────── */
const FIT_CFG = {
  "Shortlisted": { bg: "#dcfce7", color: "#15803d" },
  "On Hold":     { bg: "#fef9c3", color: "#92400e" },
  "Rejected":    { bg: "#fee2e2", color: "#991b1b" },
  "High":        { bg: "#dcfce7", color: "#15803d" },
  "Medium":      { bg: "#fef9c3", color: "#92400e" },
  "Low":         { bg: "#fee2e2", color: "#991b1b" },
};
export function FitBadge({ value }) {
  const cfg = FIT_CFG[value] || { bg: "#f3f4f6", color: "#6b7280" };
  return <Badge color={cfg.color} bg={cfg.bg}>{value || "—"}</Badge>;
}

/* ── Requisition Status Badge ────────────────────────────────── */
const REQ_CFG = {
  "Draft":              { bg: "rgba(224,228,237,0.6)", color: "#5a6a7a",  dot: "#bcccdc" },
  "Pending Approval":   { bg: "rgba(245,124,0,0.10)",  color: "#d97706",  dot: "#f59e0b" },
  "Approved":           { bg: "rgba(46,125,50,0.10)",  color: "#16a34a",  dot: "#22c55e" },
  "Hiring in Progress": { bg: "rgba(72,101,129,0.12)", color: "#486581",  dot: "#627d98" },
  "Closed":             { bg: "rgba(90,106,122,0.10)", color: "#5a6a7a",  dot: "#9fb3c8" },
  "Rejected":           { bg: "rgba(198,40,40,0.10)",  color: "#dc2626",  dot: "#ef4444" },
  "Changes Requested":  { bg: "rgba(245,124,0,0.10)",  color: "#d97706",  dot: "#f59e0b" },
};
export function ReqStatusBadge({ status }) {
  const c = REQ_CFG[status] || REQ_CFG["Draft"];
  return <Badge color={c.color} bg={c.bg} dot={c.dot}>{status}</Badge>;
}

/* ── Card ────────────────────────────────────────────────────── */
export function Card({ children, style = {}, className = "" }) {
  return (
    <div className={`enterprise-card ${className}`} style={style}>
      {children}
    </div>
  );
}

/* ── FieldWrapper ────────────────────────────────────────────── */
export function FieldWrapper({ label, required, error, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)" }}>
            {label}
            {required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
          </label>
          {hint && <span style={{ fontSize: 10, color: "var(--color-text-secondary)", opacity: 0.7 }}>{hint}</span>}
        </div>
      )}
      {children}
      {error && <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 500 }}>{error}</span>}
    </div>
  );
}

/* ── Input ───────────────────────────────────────────────────── */
const INPUT_STYLE = (error) => ({
  width: "100%", padding: "7px 10px", borderRadius: 6, fontSize: 12,
  border: `1px solid ${error ? "#dc2626" : "var(--color-border)"}`,
  background: "var(--color-background)", color: "var(--color-text-primary)",
  boxSizing: "border-box", outline: "none",
});
export function Input({ label, required, error, hint, ...props }) {
  return (
    <FieldWrapper label={label} required={required} error={error} hint={hint}>
      <input {...props} style={{ ...INPUT_STYLE(error), ...(props.style || {}) }} />
    </FieldWrapper>
  );
}

/* ── Select ──────────────────────────────────────────────────── */
export function Select({ label, required, error, hint, children, ...props }) {
  return (
    <FieldWrapper label={label} required={required} error={error} hint={hint}>
      <select {...props} style={{ ...INPUT_STYLE(error), ...(props.style || {}) }}>
        {children}
      </select>
    </FieldWrapper>
  );
}

/* ── Textarea ────────────────────────────────────────────────── */
export function Textarea({ label, required, error, hint, rows = 3, ...props }) {
  return (
    <FieldWrapper label={label} required={required} error={error} hint={hint}>
      <textarea
        rows={rows}
        {...props}
        style={{ ...INPUT_STYLE(error), resize: "vertical", ...(props.style || {}) }}
      />
    </FieldWrapper>
  );
}

/* ── RadioChips ──────────────────────────────────────────────── */
export function RadioChips({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
      {options.map(opt => {
        const v = typeof opt === "string" ? opt : opt.value;
        const l = typeof opt === "string" ? opt : opt.label || opt.value;
        const sel = value === v;
        return (
          <button
            key={v} type="button" onClick={() => onChange(v)}
            style={{
              padding: "5px 12px", borderRadius: 4, fontSize: 11, fontWeight: sel ? 700 : 500,
              background: sel ? "var(--color-primary-800)" : "var(--color-surface)",
              border: `1px solid ${sel ? "var(--color-primary-700)" : "var(--color-border)"}`,
              color: sel ? "#fff" : "var(--color-text-secondary)",
              cursor: "pointer", transition: "all 150ms",
            }}
          >
            {sel && "✓ "}{l}
          </button>
        );
      })}
    </div>
  );
}

/* ── Spinner ─────────────────────────────────────────────────── */
export function Spinner({ size = 20, color = "var(--color-primary-700)" }) {
  return (
    <svg className="animate-spin" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" width={size} height={size} style={{ flexShrink: 0 }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
    </svg>
  );
}

/* ── LoadingPane ─────────────────────────────────────────────── */
export function LoadingPane({ text = "Loading…" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 56, gap: 10, color: "var(--color-text-secondary)", fontSize: 13,
    }}>
      <Spinner size={18} />
      {text}
    </div>
  );
}

/* ── EmptyState ──────────────────────────────────────────────── */
export function EmptyState({ icon, title, body, action }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "56px 24px", gap: 10, textAlign: "center",
    }}>
      {icon && <div style={{ opacity: 0.2, marginBottom: 4 }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{title}</div>
      {body && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", maxWidth: 300, lineHeight: 1.6 }}>{body}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

/* ── PageHeader ──────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div
      className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6"
      style={{
        background: "var(--color-primary-900)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        height: 56, flexShrink: 0,
      }}
    >
      <div className="min-w-0">
        <h1 className="text-sm font-bold text-white leading-none truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: "rgba(255,255,255,0.45)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

/* ── Alert ───────────────────────────────────────────────────── */
const ALERT_CFG = {
  success: { bg: "#dcfce7", color: "#15803d", border: "#16a34a" },
  error:   { bg: "#fee2e2", color: "#991b1b", border: "#dc2626" },
  warning: { bg: "#fef9c3", color: "#92400e", border: "#ca8a04" },
  info:    { bg: "#dbeafe", color: "#1e40af", border: "#3b82f6" },
};
export function Alert({ type = "info", children, style = {} }) {
  const c = ALERT_CFG[type] || ALERT_CFG.info;
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 8, padding: "12px 16px",
      fontSize: 12, color: c.color, lineHeight: 1.6, ...style,
    }}>
      {children}
    </div>
  );
}

/* ── SectionLabel ────────────────────────────────────────────── */
export function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.08em", color: "var(--color-text-secondary)",
      padding: "8px 0 4px",
    }}>
      {children}
    </div>
  );
}

/* ── Divider ─────────────────────────────────────────────────── */
export function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
      {label && (
        <>
          <span style={{
            fontSize: 9, fontWeight: 700, color: "var(--color-text-secondary)",
            textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
          }}>{label}</span>
          <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
        </>
      )}
    </div>
  );
}

/* ── ScoreBar ────────────────────────────────────────────────── */
export function ScoreBar({ label, value, max = 10 }) {
  const pct = Math.round(((value ?? 0) / max) * 100);
  const color = pct >= 70 ? "#16a34a" : pct >= 40 ? "#ca8a04" : "#dc2626";
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value ?? "—"}/{max}</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "var(--color-border)" }}>
        <div style={{ height: "100%", borderRadius: 3, background: color, width: `${pct}%`, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

/* ── CandidateListItem ───────────────────────────────────────── */
export function CandidateListItem({ candidate, isActive, onClick, metaLeft, metaRight }) {
  return (
    <button
      type="button"
      onClick={() => onClick(candidate)}
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
      <div style={{ fontWeight: 600, fontSize: 12, color: "var(--color-text-primary)", marginBottom: 2 }}>
        {candidate.candidate_name || candidate.FullName || "—"}
      </div>
      {metaLeft && (
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>
          {metaLeft}
        </div>
      )}
      {metaRight && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{metaRight}</div>}
    </button>
  );
}

/* ── Pipeline Stages Tracker ─────────────────────────────────── */
const SOP_STAGES = [
  { key: "SCREENING",      label: "Screening"      },
  { key: "AI_EVALUATION",  label: "AI Evaluation"  },
  { key: "HR_DECISION",    label: "HR Decision"    },
  { key: "INTERVIEW",      label: "Interview"      },
  { key: "DOCUMENTS",      label: "Documents"      },
  { key: "OFFER_APPROVAL", label: "Offer Approval" },
  { key: "OFFER_RELEASED", label: "Offer Released" },
  { key: "ONBOARDING",     label: "Onboarding"     },
  { key: "COMPLETED",      label: "Completed"      },
];

export function PipelineTracker({ currentStage, compact = false }) {
  const rejected = currentStage === "REJECTED";
  const currentIdx = SOP_STAGES.findIndex(s => s.key === currentStage);

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", padding: "4px 0" }}>
      {SOP_STAGES.map((stage, i) => {
        const done    = currentIdx > i;
        const active  = currentIdx === i && !rejected;
        const color   = done ? "#16a34a" : active ? "var(--color-accent-500)" : "var(--color-border)";
        const textCol = done || active ? "var(--color-text-primary)" : "var(--color-text-secondary)";
        return (
          <div key={stage.key} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                width: compact ? 20 : 24, height: compact ? 20 : 24, borderRadius: "50%",
                border: `2px solid ${color}`,
                background: done ? "#16a34a" : active ? "var(--color-accent-500)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: compact ? 8 : 9, fontWeight: 700,
                color: done || active ? "#fff" : "var(--color-text-secondary)",
              }}>
                {done ? "✓" : i + 1}
              </div>
              {!compact && (
                <span style={{ fontSize: 8, textAlign: "center", width: 52, lineHeight: 1.3, color: textCol, fontWeight: active ? 700 : 400 }}>
                  {stage.label}
                </span>
              )}
            </div>
            {i < SOP_STAGES.length - 1 && (
              <div style={{
                width: compact ? 14 : 20, height: 2,
                background: done ? "#16a34a" : "var(--color-border)",
                marginBottom: compact ? 0 : 14, flexShrink: 0,
              }} />
            )}
          </div>
        );
      })}
      {rejected && (
        <div style={{ marginLeft: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>✕</div>
          {!compact && <span style={{ fontSize: 8, color: "#dc2626", fontWeight: 700 }}>Rejected</span>}
        </div>
      )}
    </div>
  );
}
