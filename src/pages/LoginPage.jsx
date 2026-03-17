import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DEMOS = [
  { role: "Request Owner",        email: "dept@crpl.com",    pw: "dept123"   },
  { role: "HR Manager (Himani)", email: "himani@crpl.com",  pw: "himani123" },
  { role: "Approver (Anna J)",   email: "anna@crpl.com",    pw: "anna123"   },
  { role: "Admin",               email: "admin@crpl.com",   pw: "admin123"  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    await new Promise(r => setTimeout(r, 350));
    const res = login(form.email.trim(), form.password);
    setLoading(false);
    if (res.success) navigate("/", { replace: true });
    else setError(res.error);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo + title */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center rounded-sm font-bold text-white text-lg mb-4"
            style={{
              width: 48,
              height: 48,
              background: "var(--color-primary-900)",
              letterSpacing: 1,
            }}
          >
            CR
          </div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            CRPL Manpower Requisition
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Sign in to raise or manage hiring requisitions
          </p>
        </div>

        {/* Card */}
        <div className="enterprise-card p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
                Email address
              </label>
              <input
                className="enterprise-input"
                type="email"
                placeholder="you@crpl.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  className="enterprise-input pr-10"
                  type={showPass ? "text" : "password"}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-0 top-0 h-full px-3 flex items-center"
                  style={{ color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer" }}
                  tabIndex={-1}
                >
                  {showPass
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs px-3 py-2 rounded-sm font-medium" style={{ background: "rgba(198,40,40,0.08)", color: "var(--color-danger)", border: "1px solid rgba(198,40,40,0.2)" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-9 rounded-sm font-semibold text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              style={{ background: loading ? "var(--color-primary-700)" : "var(--color-primary-800)", border: "none", cursor: loading ? "not-allowed" : "pointer" }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "var(--color-primary-900)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--color-primary-800)"; }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div
          className="mt-4 p-4 rounded-sm"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--color-primary-700)" }}>
            Demo Credentials
          </p>
          <div className="flex flex-col gap-1">
            {DEMOS.map(({ role, email, pw }) => (
              <button
                key={email}
                type="button"
                onClick={() => setForm({ email, password: pw })}
                className="text-left text-xs py-0.5 transition-colors"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--color-primary-700)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--color-text-secondary)"}
              >
                <span className="font-semibold" style={{ color: "var(--color-primary-600)" }}>{role}</span>
                {" — "}
                {email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
