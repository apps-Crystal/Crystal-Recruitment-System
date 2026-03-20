import React, { createContext, useContext, useState } from "react";
import { apiLogin } from "../utils/api";

const AuthContext = createContext(null);
const SESSION_KEY = "crpl_req_session";

/* ── Demo users — SOP-HR-001 compliant roles ── */
const DEMO_USERS = [
  { id:"USR-001", name:"Priya Sharma",   email:"priya@crystal.com",   password:"priya123",   role:"ta_head"         },
  { id:"USR-002", name:"Ramesh Mehta",   email:"ramesh@crystal.com",  password:"ramesh123",  role:"management"      },
  { id:"USR-003", name:"Sunita Agarwal", email:"sunita@crystal.com",  password:"sunita123",  role:"chro"            },
  { id:"USR-004", name:"Himani Khemka",  email:"himani@crystal.com",  password:"himani123",  role:"senior_hr_exec"  },
  { id:"USR-005", name:"Admin",          email:"admin@crystal.com",   password:"admin123",   role:"admin"           },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  async function login(email, password) {
    setLoading(true);
    try {
      /* 1 — Try demo list first (instant, works offline) */
      const demo = DEMO_USERS.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );
      if (demo) {
        const { password: _, ...safe } = demo;
        localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
        setUser(safe);
        return { success: true };
      }

      /* 2 — Fall back to GAS (real users from Google Sheet) */
      const res = await apiLogin(email, password);
      if (res?.success && res.user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(res.user));
        setUser(res.user);
        return { success: true };
      }

      return { success: false, error: res?.error || "Invalid email or password." };
    } catch {
      return { success: false, error: "Login failed. Please try again." };
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
