import { useEffect, useState, useRef } from "react";
import type { User } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import { db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore/lite";
import { AuthCtx, type AuthContextType } from "./context";

/**
 * Ensure a minimal user profile document exists for the authenticated user.
 * - Creates or merges the doc with default allowance for the current year
 * - All errors are swallowed (logged) so Auth flow isn't blocked by Rules/Network
 */
async function ensureUserDoc(u: User) {
  try {
    const ref = doc(db, "users", u.uid);
    const yearKey = String(new Date().getFullYear());

    const payload: Record<string, unknown> = {
      allowanceByYear: { [yearKey]: 30 },
      updatedAt: new Date().toISOString(),
    };

    // Nur nicht-leere Werte aus dem Auth-Objekt übernehmen
    if (u.email) payload.email = u.email;
    if (u.displayName && u.displayName.trim()) payload.displayName = u.displayName.trim();

    // NICHT: firstName/lastName als leere Strings reinschreiben – das würde Profil-Eingaben überschreiben

    await setDoc(ref, payload, { merge: true });
  } catch (err) {
    console.warn("ensureUserDoc failed (non-fatal):", err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [fbUser, setFbUser] = useState<User | null | undefined>(undefined);
  const ensuredOnce = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFbUser(u);
      // Avoid multiple ensure calls on rapid auth state flips (hot reload, etc.)
      if (u && !ensuredOnce.current) {
        ensuredOnce.current = true;
        void ensureUserDoc(u);
      }
    });
    return () => unsub();
  }, []);

  const login: AuthContextType["login"] = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register: AuthContextType["register"] = async (email, password) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout: AuthContextType["logout"] = async () => {
    await signOut(auth);
  };

  return (
    <AuthCtx.Provider value={{ fbUser, login, register, logout }}>{children}</AuthCtx.Provider>
  );
}
