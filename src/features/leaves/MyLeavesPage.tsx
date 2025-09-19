import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where, deleteDoc } from "firebase/firestore/lite";
import { db } from "../../lib/firebase";
import { useAuth } from "../auth/useAuth";
import { Link } from "react-router-dom";

type Leave = {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "pending" | "approved" | "rejected";
  comment?: string;
  year: number;
};

type UserDoc = {
  email?: string;
  displayName?: string;
  allowanceByYear?: Record<string, number>;
};

export default function MyLeavesPage() {
  const { fbUser } = useAuth();
  const [items, setItems] = useState<Leave[]>([]);
  const [allowance, setAllowance] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const year = new Date().getFullYear();

  useEffect(() => {
    if (!fbUser) return;
    (async () => {
      setError(null);
      try {
        // Kontingent aus user doc
        const userSnap = await getDoc(doc(db, "users", fbUser.uid));
        const data = userSnap.exists() ? (userSnap.data() as UserDoc) : null;
        setAllowance(data?.allowanceByYear?.[String(year)] ?? 0);

        // eigene leaves für das Jahr
        const q = query(collection(db, "users", fbUser.uid, "leaves"), where("year", "==", year));
        const snap = await getDocs(q);
        setItems(
          snap.docs.map((d) => {
            const data = d.data() as Omit<Leave, "id">;
            return { id: d.id, ...data };
          }),
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [fbUser, year]);

  const used = useMemo(
    () => items.filter((i) => i.status === "approved").reduce((s, i) => s + (i.days || 0), 0),
    [items],
  );
  const remaining = Math.max(0, allowance - used);

  const cancelLeave = async (it: Leave) => {
    if (!fbUser) return;
    if (it.status !== "pending") return;
    if (deletingIds.has(it.id)) return;
    const ok = window.confirm(
      `Diesen Urlaubsantrag vom ${it.startDate} bis ${it.endDate} stornieren?`,
    );
    if (!ok) return;
    setDeletingIds((prev) => new Set(prev).add(it.id));
    try {
      await deleteDoc(doc(db, "users", fbUser.uid, "leaves", it.id));
      setItems((prev) => prev.filter((x) => x.id !== it.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(it.id);
        return next;
      });
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <h2 style={{ margin: 0 }}>Meine Urlaube {year}</h2>
        <Link to="/request">
          <button>+ Urlaub beantragen</button>
        </Link>
      </div>

      {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}

      <div style={{ marginTop: 12 }}>
        Kontingent: <b>{allowance}</b> · Verbraucht: <b>{used}</b> · Rest: <b>{remaining}</b>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
        {items.length === 0 && <div>Noch keine Anträge.</div>}
        {items.map((it) => (
          <div
            key={it.id}
            style={{
              border: "1px solid #eee",
              padding: 12,
              borderRadius: 8,
              display: "flex",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 180 }}>
              {it.startDate} → {it.endDate}
            </div>
            <div style={{ minWidth: 80 }}>{it.days} Tage</div>
            <div style={{ textTransform: "capitalize" }}>
              Status: <b>{it.status}</b>
            </div>
            {it.comment && <div style={{ color: "#555" }}>„{it.comment}“</div>}
            {it.status === "pending" && (
              <div style={{ marginLeft: "auto" }}>
                <button
                  onClick={() => cancelLeave(it)}
                  disabled={deletingIds.has(it.id)}
                  title="Ausstehenden Antrag stornieren"
                >
                  {deletingIds.has(it.id) ? "Storniere…" : "Stornieren"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
