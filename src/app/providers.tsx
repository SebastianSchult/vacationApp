import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../features/auth/AuthContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>{children}</BrowserRouter>
    </AuthProvider>
  );
}
