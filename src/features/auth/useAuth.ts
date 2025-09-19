import { useContext } from "react";
import { AuthCtx, type AuthContextType } from "./context";

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
