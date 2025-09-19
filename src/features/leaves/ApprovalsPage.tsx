import { useEffect, useMemo, useState } from "react";
import {
  collectionGroup,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
  collection,
} from "firebase/firestore/lite";
import { db } from "../../lib/firebase";
import { useAuth } from "../auth/useAuth";

type Leave = {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "pending" | "approved" | "rejected";
  comment?: string;
  year: number;
};

type UserInfo = {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return !(new Date(aEnd) < new Date(bStart) || new Date(aStart) > new Date(bEnd));
}

async function hasApprovedOverlap(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<boolean> {
  const year = new Date(startDate).getFullYear();
  const q = query(collection(db, "users", userId, "leaves"), where("year", "==", year));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    const data = d.data() as { startDate: string; endDate: string; status: string };
    if (data.status === "approved" && overlaps(startDate, endDate, data.startDate, data.endDate)) {
      return true;
    }
  }
  return false;
}

export default function ApprovalsPage() {
  const { fbUser } = useAuth();
  const [items, setItems] = useState<Leave[]>([]);
  const [userMap, setUserMap] = useState<Record<string, UserInfo>>({});
  const [loading, setLoading] = useState(true);
  const [notManager, setNotManager] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});

  const load = async () => {
    if (!fbUser) return;
    setLoading(true);
    try {
      const cg = collectionGroup(db, "leaves");
      const q = query(cg, where("status", "==", "pending"));
      const snap = await getDocs(q);
      const rows: Leave[] = snap.docs.map((d) => {
        const data = d.data() as Omit<Leave, "id">;
        return { id: d.id, ...data };
      });
      // client-side sort to avoid requiring an extra Firestore index
      setItems([...rows].sort((a, b) => a.startDate.localeCompare(b.startDate)));
    } catch {
      setNotManager(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const missing = Array.from(new Set(items.map((i) => i.userId))).filter(
        (uid) => !userMap[uid],
      );
      if (missing.length === 0) return;
      const entries: Array<[string, UserInfo]> = [];
      await Promise.all(
        missing.map(async (uid) => {
          const snap = await getDoc(doc(db, "users", uid));
          if (snap.exists()) entries.push([uid, snap.data() as UserInfo]);
        }),
      );
      if (entries.length) {
        setUserMap((prev) => {
          const next = { ...prev } as Record<string, UserInfo>;
          for (const [k, v] of entries) next[k] = v;
          return next;
        });
      }
    })();
  }, [items, userMap]);

  useEffect(() => {
    void load();
  }, [fbUser?.uid]);

  const approve = async (it: Leave) => {
    if (updatingIds.has(it.id)) return;
    setUpdatingIds((prev) => new Set(prev).add(it.id));
    try {
      // Prevent approving overlaps with already approved leaves
      if (await hasApprovedOverlap(it.userId, it.startDate, it.endDate)) {
        alert(
          "Dieser Zeitraum überschneidet sich mit einem bereits genehmigten Urlaub dieses Benutzers.",
        );
        return;
      }
      await updateDoc(doc(db, "users", it.userId, "leaves", it.id), {
        status: "approved",
        managerComment: commentMap[it.id] ?? "",
        updatedAt: new Date().toISOString(),
      });
      setItems((prev) => prev.filter((x) => x.id !== it.id));
      setCommentMap((prev) => {
        const next = { ...prev };
        delete next[it.id];
        return next;
      });
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(it.id);
        return next;
      });
    }
  };

  const reject = async (it: Leave) => {
    if (updatingIds.has(it.id)) return;
    setUpdatingIds((prev) => new Set(prev).add(it.id));
    try {
      await updateDoc(doc(db, "users", it.userId, "leaves", it.id), {
        status: "rejected",
        managerComment: commentMap[it.id] ?? "",
        updatedAt: new Date().toISOString(),
      });
      setItems((prev) => prev.filter((x) => x.id !== it.id));
      setCommentMap((prev) => {
        const next = { ...prev };
        delete next[it.id];
        return next;
      });
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(it.id);
        return next;
      });
    }
  };

  const pendingCount = useMemo(() => items.length, [items]);

  if (loading) return <div style={{ padding: 24 }}>Lade offene Anträge…</div>;
  if (notManager)
    return (
      <div style={{ padding: 24 }}>
        Keine Berechtigung. Frag einen Admin, dich als <b>isManager: true</b> im <code>users</code>
        -Dokument einzutragen.
      </div>
    );

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto" }}>
      <h2>Offene Urlaubsanträge ({pendingCount})</h2>
      {items.length === 0 && <div>Aktuell keine offenen Anträge 🎉</div>}
      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {items.map((it) => {
          const user = userMap[it.userId];
          const nameFromFirstLast =
            user?.firstName || user?.lastName
              ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
              : "";
          const displayName =
            (user?.displayName && user.displayName.trim()) ||
            nameFromFirstLast ||
            user?.email ||
            it.userId;

          return (
            <div
              key={it.userId + "_" + it.id}
              style={{
                border: "1px solid #eee",
                padding: 12,
                borderRadius: 8,
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  {it.startDate} → {it.endDate} · {it.days} Tage
                </div>
                <div style={{ color: "#555" }} title={user?.email || it.userId}>
                  User: {displayName} · Status: {it.status}
                </div>
                {it.comment && <div style={{ color: "#777" }}>„{it.comment}“</div>}
                <div style={{ marginTop: 8 }}>
                  <input
                    style={{ width: "100%" }}
                    placeholder="Optionaler Manager-Kommentar …"
                    value={commentMap[it.id] ?? ""}
                    onChange={(e) =>
                      setCommentMap((prev) => ({ ...prev, [it.id]: e.target.value }))
                    }
                    disabled={updatingIds.has(it.id)}
                  />
                </div>
              </div>
              <button onClick={() => approve(it)} disabled={updatingIds.has(it.id)}>
                {updatingIds.has(it.id) ? "…" : "Genehmigen"}
              </button>
              <button onClick={() => reject(it)} disabled={updatingIds.has(it.id)}>
                {updatingIds.has(it.id) ? "…" : "Ablehnen"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
