import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import { doc, getDoc } from "firebase/firestore/lite";
import { db } from "../lib/firebase";
import { useEffect, useState } from "react";

export default function Nav() {
  const { fbUser, logout } = useAuth();
  const [me, setMe] = useState<{
    displayName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    isManager?: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!fbUser) {
        setMe(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", fbUser.uid));
        const data = snap.exists()
          ? (snap.data() as {
              displayName?: string;
              firstName?: string;
              lastName?: string;
              email?: string;
              isManager?: boolean;
            })
          : {};
        if (active) setMe(data);
      } catch {
        if (active) setMe(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [fbUser?.uid]);

  const nameFromFL =
    me?.firstName || me?.lastName ? `${me?.firstName ?? ""} ${me?.lastName ?? ""}`.trim() : "";
  const displayName =
    (me?.displayName && me.displayName.trim()) || nameFromFL || me?.email || fbUser?.email || "";
  const isManager = !!me?.isManager;

  return (
    <nav style={{ display: "flex", gap: 12, padding: 12, borderBottom: "1px solid #eee" }}>
      <div style={{ fontWeight: 600 }}>Vacation App</div>

      {fbUser && (
        <>
          <Link to="/" style={{ marginLeft: 16 }}>
            Meine Urlaube
          </Link>
          <Link to="/request">Urlaub beantragen</Link>
          <Link to="/profile">Profil</Link>
          {isManager && <Link to="/approvals">Genehmigungen</Link>}
        </>
      )}

      <div style={{ marginLeft: "auto" }}>
        {fbUser ? (
          <>
            <span style={{ marginRight: 8 }}>{displayName}</span>
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}
