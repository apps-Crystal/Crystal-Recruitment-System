/**
 * Toast Notification System — SOP-HR-001
 * Provides addToast(message, type, duration) via useToast() hook.
 * Types: "success" | "error" | "warning" | "info"
 */
import React, { createContext, useContext, useState, useCallback } from "react";
import { createPortal } from "react-dom";

const ToastContext = createContext(null);

let _uid = 0;

const TOAST_STYLES = {
  success: { accent: "#16a34a", icon: "✓" },
  error:   { accent: "#dc2626", icon: "✕" },
  warning: { accent: "#d97706", icon: "!" },
  info:    { accent: "#2563eb", icon: "i" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4500) => {
    const id = ++_uid;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(<ToastStack toasts={toasts} onDismiss={dismiss} />, document.body)}
    </ToastContext.Provider>
  );
}

function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed", top: 20, right: 20, zIndex: 9999,
        display: "flex", flexDirection: "column", gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map(t => <Toast key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  );
}

function Toast({ toast, onDismiss }) {
  const cfg = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  return (
    <div
      role="alert"
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        background: "#1a2332", color: "#e2e8f0",
        padding: "12px 16px", borderRadius: 8,
        maxWidth: 380, minWidth: 260,
        boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
        borderLeft: `4px solid ${cfg.accent}`,
        fontSize: 13, lineHeight: 1.5,
        pointerEvents: "all",
        animation: "slideInRight 0.22s ease",
      }}
    >
      {/* Icon */}
      <span style={{
        width: 20, height: 20, borderRadius: "50%", background: cfg.accent,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 800, color: "#fff", flexShrink: 0, marginTop: 1,
      }}>
        {cfg.icon}
      </span>

      {/* Message */}
      <span style={{ flex: 1 }}>{toast.message}</span>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.4)",
          cursor: "pointer", padding: "0 0 0 4px", fontSize: 16, lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

/** Hook — call anywhere inside ToastProvider */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
