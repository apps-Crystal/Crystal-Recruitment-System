import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="page" style={{textAlign:"center",paddingTop:80}}>
        <div style={{fontSize:48,marginBottom:16}}>🔒</div>
        <h2>Access Denied</h2>
        <p style={{color:"var(--muted)",marginTop:8}}>You do not have permission to view this page.</p>
      </div>
    );
  }
  return children;
}
