import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";

export default function Protected() {
  const { fbUser } = useAuth();
  if (fbUser === undefined) return null; // optional: Spinner
  return fbUser ? <Outlet /> : <Navigate to="/login" replace />;
}
