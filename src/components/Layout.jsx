import React, { createContext, useState, useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { navItems, roleLabel } from "../utils/rbac";

/* Context for pages that need to dynamically set full-height mode */
export const LayoutContext = createContext({ setFullHeight: () => {} });

/* Routes that manage their own scrolling internally */
const FULL_HEIGHT_ROUTES = ["/screening", "/interview", "/offer-approval"];

const ICONS = {
  grid:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  plus:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  list:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  check:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  user:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  menu:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  logout:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  screen:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  interview:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  approval:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  requisition: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  chevronDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
};

/* Short labels for mobile bottom nav */
const SHORT_LABEL = {
  "Dashboard":         "Home",
  "Raise Requisition": "Raise",
  "All Requisitions":  "All",
  "Approve":           "Approve",
  "My Requisitions":   "Mine",
  "Screening":         "Screen",
  "Interviews":        "Interview",
  "Offer Approval":    "Approval",
};

function Icon({ name, size = 16 }) {
  return (
    <span style={{ width: size, height: size, display: "inline-flex", flexShrink: 0 }}>
      {ICONS[name] || null}
    </span>
  );
}

// Build grouped nav structure from flat items
function buildNavGroups(items) {
  const result = [];
  for (const item of items) {
    if (item.group) {
      const existing = result.find(r => r.type === "group" && r.label === item.group);
      if (existing) {
        existing.children.push(item);
      } else {
        result.push({ type: "group", label: item.group, icon: "requisition", children: [item] });
      }
    } else {
      result.push({ type: "item", ...item });
    }
  }
  return result;
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [dynamicFullHeight, setDynamicFullHeight] = useState(false);
  const items = navItems(user?.role);
  const navGroups = useMemo(() => buildNavGroups(items), [items]);
  const fullHeight = FULL_HEIGHT_ROUTES.includes(location.pathname) || dynamicFullHeight;

  // Auto-expand groups that contain the active route
  const [openGroups, setOpenGroups] = useState(() => {
    const open = {};
    for (const g of buildNavGroups(navItems(user?.role))) {
      if (g.type === "group" && g.children.some(c => location.pathname === c.path || (c.path !== "/" && location.pathname.startsWith(c.path)))) {
        open[g.label] = true;
      }
    }
    return open;
  });

  function toggleGroup(label) {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <LayoutContext.Provider value={{ setFullHeight: setDynamicFullHeight }}>
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-background)" }}>

      {/* ─── Desktop Sidebar (hidden on mobile) ──────────────────── */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 h-full transition-all duration-200 overflow-hidden"
        style={{
          width: collapsed ? 56 : 220,
          minWidth: collapsed ? 56 : 220,
          backgroundColor: "var(--color-primary-900)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Brand row */}
        <div
          className="flex items-center justify-between flex-shrink-0 px-3"
          style={{ height: 56, borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-white font-bold text-sm tracking-wide leading-tight truncate">CRPL</div>
              <div className="text-xs leading-tight truncate" style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>
                Manpower Requisition
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center rounded flex-shrink-0 transition-colors"
            style={{ width: 30, height: 30, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", border: "none", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
          >
            <Icon name="menu" size={15} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-2 px-2 flex flex-col gap-0.5">
          {navGroups.map(entry => {
            if (entry.type === "group") {
              const isOpen = !!openGroups[entry.label];
              const hasActive = entry.children.some(c => location.pathname === c.path || (c.path !== "/" && location.pathname.startsWith(c.path)));
              return (
                <div key={entry.label}>
                  {/* Group header */}
                  <button
                    onClick={() => !collapsed && toggleGroup(entry.label)}
                    title={collapsed ? entry.label : undefined}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: collapsed ? "10px 0" : "7px 12px",
                      justifyContent: collapsed ? "center" : "space-between",
                      background: hasActive ? "rgba(200,169,81,0.10)" : "transparent",
                      border: "none", borderRadius: 6, cursor: "pointer",
                      color: hasActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)",
                      fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon name={entry.icon} size={16} />
                      {!collapsed && <span>{entry.label}</span>}
                    </div>
                    {!collapsed && (
                      <span style={{ width: 14, height: 14, display: "inline-flex", transition: "transform 0.2s", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}>
                        {ICONS.chevronDown}
                      </span>
                    )}
                  </button>
                  {/* Children */}
                  {(isOpen || collapsed) && entry.children.map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/"}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded transition-all duration-150 no-underline ${
                          collapsed ? "justify-center px-0 py-2.5" : "px-3 py-1.5"
                        } ${isActive ? "text-white font-semibold" : "font-medium"}`
                      }
                      style={({ isActive }) => ({
                        color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                        background: isActive ? "rgba(200,169,81,0.18)" : "transparent",
                        borderLeft: isActive ? "2px solid var(--color-accent-500)" : "2px solid transparent",
                        fontSize: 12,
                        marginLeft: collapsed ? 0 : 8,
                      })}
                      onMouseEnter={e => {
                        if (!e.currentTarget.style.borderLeftColor.includes("accent")) {
                          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                          e.currentTarget.style.color = "rgba(255,255,255,0.85)";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!e.currentTarget.style.borderLeftColor.includes("accent")) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                        }
                      }}
                    >
                      <Icon name={item.icon} size={14} />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  ))}
                </div>
              );
            }
            // Standalone item
            return (
              <NavLink
                key={entry.path}
                to={entry.path}
                end={entry.path === "/"}
                title={collapsed ? entry.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded transition-all duration-150 no-underline ${
                    collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"
                  } ${isActive ? "text-white font-semibold" : "font-medium"}`
                }
                style={({ isActive }) => ({
                  color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                  background: isActive ? "rgba(200,169,81,0.18)" : "transparent",
                  borderLeft: isActive ? "2px solid var(--color-accent-500)" : "2px solid transparent",
                  fontSize: 13,
                })}
                onMouseEnter={e => {
                  if (!e.currentTarget.style.borderLeftColor.includes("accent")) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.85)";
                  }
                }}
                onMouseLeave={e => {
                  if (!e.currentTarget.style.borderLeftColor.includes("accent")) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                  }
                }}
              >
                <Icon name={entry.icon} size={16} />
                {!collapsed && <span>{entry.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User + Logout footer */}
        <div
          className="flex-shrink-0 px-2 py-2 flex flex-col gap-1"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0 text-white font-bold"
                style={{ width: 28, height: 28, background: "var(--color-accent-500)", fontSize: 11 }}
              >
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="overflow-hidden">
                <div className="text-white text-xs font-semibold truncate leading-tight">{user?.name}</div>
                <div className="text-xs truncate leading-tight" style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>
                  {roleLabel(user?.role)}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className={`flex items-center gap-2 rounded w-full transition-colors ${collapsed ? "justify-center py-2" : "px-2 py-1.5"}`}
            style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 12 }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.color = "#fca5a5"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >
            <Icon name="logout" size={14} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ─── Main content ─────────────────────────────────────────── */}
      {/* pb-16 on mobile leaves space for the bottom nav bar */}
      <main
        className={`flex-1 custom-scrollbar pb-16 md:pb-0 ${fullHeight ? "overflow-hidden" : "overflow-y-auto"}`}
        style={{ background: "var(--color-background)" }}
      >
        {children}
      </main>

      {/* ─── Mobile Bottom Nav (hidden on md+) ───────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex items-stretch"
        style={{
          background: "var(--color-primary-900)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          height: 60,
          boxShadow: "0 -4px 16px rgba(0,0,0,0.18)",
        }}
      >
        {/* Nav items — flat for mobile */}
        <div className="flex-1 flex items-stretch">
          {items.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 no-underline"
              style={({ isActive }) => ({
                color: isActive ? "var(--color-accent-500)" : "rgba(255,255,255,0.45)",
                borderTop: isActive ? "2px solid var(--color-accent-500)" : "2px solid transparent",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.03em",
                transition: "color 150ms ease",
              })}
            >
              <Icon name={item.icon} size={20} />
              <span style={{ marginTop: 1 }}>{SHORT_LABEL[item.label] || item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Logout */}
        <div style={{ width: 1, background: "rgba(255,255,255,0.08)", margin: "10px 0", flexShrink: 0 }} />
        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="flex flex-col items-center justify-center gap-0.5"
          style={{ minWidth: 52, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", fontSize: 9, fontWeight: 600, letterSpacing: "0.04em" }}
        >
          <Icon name="logout" size={19} />
          <span style={{ marginTop: 1 }}>Exit</span>
        </button>
      </nav>
    </div>
    </LayoutContext.Provider>
  );
}
