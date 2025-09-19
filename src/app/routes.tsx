import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../features/auth/LoginPage";
import MyLeavesPage from "../features/leaves/MyLeavesPage";
import RequestLeavePage from "../features/leaves/RequestLeavePage";
import Protected from "../components/Protected";
import Nav from "../components/Nav";
import ApprovalsPage from "../features/leaves/ApprovalsPage";
import ProfilePage from "../features/profile/ProfilePage";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Nav />
      <main style={{ padding: 16 }}>{children}</main>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected />}>
        <Route
          path="/"
          element={
            <Shell>
              <MyLeavesPage />
            </Shell>
          }
        />
        <Route
          path="/request"
          element={
            <Shell>
              <RequestLeavePage />
            </Shell>
          }
        />
        <Route
          path="/approvals"
          element={
            <Shell>
              <ApprovalsPage />
            </Shell>
          }
        />
        <Route
          path="/profile"
          element={
            <Shell>
              <ProfilePage />
            </Shell>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
