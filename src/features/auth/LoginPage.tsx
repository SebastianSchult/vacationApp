import { useState } from "react";
import { useAuth } from "./useAuth";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const { fbUser, login, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Wenn bereits eingeloggt, nie die Login-Seite zeigen:
  if (fbUser) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
      // Direkt weiter zur Startseite
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "10vh auto", padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>{mode === "login" ? "Anmeldung" : "Registrierung"}</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          <div>E-Mail</div>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          <div>Passwort</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <div style={{ color: "crimson", fontSize: 14 }}>{error}</div>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Bitte warten…" : mode === "login" ? "Einloggen" : "Registrieren"}
        </button>
      </form>
      <div style={{ marginTop: 12 }}>
        {mode === "login" ? (
          <button onClick={() => setMode("register")}>Noch kein Konto? Jetzt registrieren</button>
        ) : (
          <button onClick={() => setMode("login")}>Schon ein Konto? Hier einloggen</button>
        )}
      </div>
    </div>
  );
}
