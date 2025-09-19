import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore/lite";
import { db } from "../../lib/firebase";
import { useAuth } from "../auth/useAuth";

type UserProfile = {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
};

export default function ProfilePage() {
  const { fbUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!fbUser) return;
    (async () => {
      const snap = await getDoc(doc(db, "users", fbUser.uid));
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      } else {
        setProfile({ email: fbUser.email ?? "" });
      }
      setLoading(false);
    })();
  }, [fbUser]);

  const save = async () => {
    if (!fbUser) return;
    setSaving(true);
    setMessage(null);
    try {
      const firstName = (profile.firstName ?? "").trim();
      const lastName = (profile.lastName ?? "").trim();
      const displayNameInput = (profile.displayName ?? "").trim();
      const generatedFromFL = `${firstName} ${lastName}`.trim();
      const finalDisplayName = displayNameInput || generatedFromFL || (fbUser.email ?? "");

      await setDoc(
        doc(db, "users", fbUser.uid),
        {
          firstName,
          lastName,
          displayName: finalDisplayName,
          email: fbUser.email ?? "",
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      setMessage("Profil gespeichert ✅");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Profil wird geladen…</div>;

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto", display: "grid", gap: 12 }}>
      <h2>Mein Profil</h2>
      <label>
        Vorname:
        <input
          type="text"
          value={profile.firstName ?? ""}
          onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
        />
      </label>
      <label>
        Nachname:
        <input
          type="text"
          value={profile.lastName ?? ""}
          onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
        />
      </label>
      <label>
        Anzeigename:
        <input
          type="text"
          value={profile.displayName ?? ""}
          onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
        />
      </label>
      <div>E-Mail (nur Anzeige): {profile.email}</div>
      <button onClick={save} disabled={saving}>
        {saving ? "Speichern…" : "Speichern"}
      </button>
      {message && (
        <div style={{ color: message.includes("✅") ? "green" : "crimson" }}>{message}</div>
      )}
    </div>
  );
}
