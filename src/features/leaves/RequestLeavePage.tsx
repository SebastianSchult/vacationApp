import React from "react";
import { useState, useMemo } from "react";
import type { FormEvent } from "react";
import { addDoc, collection, doc, getDoc, getDocs, query, where } from "firebase/firestore/lite";
import { db } from "../../lib/firebase";
import { useAuth } from "../auth/useAuth";
import { getHolidaySet } from "../../lib/holidays";

function countWorkdaysExcluding(
  fromISO: string,
  toISO: string,
  holidaySets: Array<Set<string>>,
): { days: number; holidaysInRange: string[] } {
  if (!fromISO || !toISO) return { days: 0, holidaysInRange: [] };
  const start = new Date(fromISO);
  const end = new Date(toISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start)
    return { days: 0, holidaysInRange: [] };

  const holidaysHit: string[] = [];
  let days = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay(); // 0 So, 6 Sa
    if (dow === 0 || dow === 6) continue;
    const iso = d.toISOString().slice(0, 10);
    const isHoliday = holidaySets.some((s) => s.has(iso));
    if (isHoliday) {
      holidaysHit.push(iso);
      continue;
    }
    days++;
  }
  return { days, holidaysInRange: holidaysHit };
}

export default function RequestLeavePage() {
  const { fbUser } = useAuth();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const year = useMemo(
    () => (start ? new Date(start).getFullYear() : new Date().getFullYear()),
    [start],
  );

  const years = useMemo(() => {
    const ys = new Set<number>();
    const a = start ? new Date(start).getFullYear() : new Date().getFullYear();
    const b = end ? new Date(end).getFullYear() : a;
    for (let y = Math.min(a, b); y <= Math.max(a, b); y++) ys.add(y);
    return Array.from(ys);
  }, [start, end]);

  const holidaySets = useMemo(() => years.map((y) => getHolidaySet(y, "DE")), [years]);

  const { days, holidaysInRange } = useMemo(
    () => countWorkdaysExcluding(start, end, holidaySets),
    [start, end, holidaySets],
  );

  const [allowance, setAllowance] = useState<number>(0);
  const [approvedUsed, setApprovedUsed] = useState<number>(0);
  const [hasOverlap, setHasOverlap] = useState(false);

  const remaining = Math.max(0, allowance - approvedUsed);
  const exceedsAllowance = days > remaining;

  // load allowance & existing leaves for overlap detection
  useMemo(() => {
    // no-op placeholder to keep lints happy; real work in useEffect below
  }, [fbUser, year]);

  // Load from Firestore when user or year changes
  React.useEffect(() => {
    if (!fbUser) return;
    (async () => {
      try {
        // allowance
        const userSnap = await getDoc(doc(db, "users", fbUser.uid));
        const data = userSnap.exists()
          ? (userSnap.data() as { allowanceByYear?: Record<string, number> })
          : null;
        setAllowance(data?.allowanceByYear?.[String(year)] ?? 0);

        // existing leaves this year
        const q = query(collection(db, "users", fbUser.uid, "leaves"), where("year", "==", year));
        const snap = await getDocs(q);
        const rows = snap.docs.map(
          (d) => d.data() as { startDate: string; endDate: string; status: string; days?: number },
        );
        // overlap: any pending/approved overlapping the selected range
        const overlap =
          start && end
            ? rows.some(
                (r) =>
                  r.status !== "rejected" &&
                  !(new Date(end) < new Date(r.startDate) || new Date(start) > new Date(r.endDate)),
              )
            : false;
        setHasOverlap(!!overlap);
        // approved used
        setApprovedUsed(
          rows.filter((r) => r.status === "approved").reduce((s, r) => s + (r.days || 0), 0),
        );
      } catch {
        // keep page usable even if reads fail
        setHasOverlap(false);
      }
    })();
  }, [fbUser, year, start, end]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(false);
    try {
      if (!fbUser) throw new Error("Nicht eingeloggt.");
      if (days <= 0) throw new Error("Zeitraum ungültig.");
      if (hasOverlap) throw new Error("Zeitraum überschneidet sich mit einem bestehenden Antrag.");
      if (exceedsAllowance) throw new Error("Resturlaub reicht nicht aus.");

      await addDoc(collection(db, "users", fbUser.uid, "leaves"), {
        userId: fbUser.uid,
        startDate: start,
        endDate: end,
        year,
        days,
        status: "pending",
        comment,
        createdAt: new Date().toISOString(), // Firestore Lite: kein serverTimestamp
      });

      setStart("");
      setEnd("");
      setComment("");
      setOk(true);
    } catch (err: unknown) {
      setOk(false);
      if (err instanceof Error) setError(err.message);
      else setError(String(err));
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "4rem auto" }}>
      <h2>Urlaub beantragen</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Start
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label>
          Ende
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </label>
        <label>
          Kommentar
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="z. B. Familienurlaub"
          />
        </label>
        <div>
          Arbeitstage (ohne Wochenenden & Feiertage): <b>{days}</b>
        </div>
        {holidaysInRange.length > 0 && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Feiertage im Zeitraum: {holidaysInRange.join(", ")}
          </div>
        )}
        {hasOverlap && (
          <div style={{ color: "crimson" }}>
            Zeitraum überschneidet sich mit einem bestehenden Antrag.
          </div>
        )}
        {error && <div style={{ color: "crimson" }}>{error}</div>}
        {ok && <div style={{ color: "green" }}>Antrag gespeichert.</div>}
        <div>
          Kontingent {year}: <b>{allowance}</b> · Verbraucht: <b>{approvedUsed}</b> · Rest:{" "}
          <b>{remaining}</b>
        </div>
        {exceedsAllowance && <div style={{ color: "crimson" }}>Resturlaub reicht nicht aus.</div>}
        <button type="submit" disabled={!days || hasOverlap || exceedsAllowance}>
          Antrag senden
        </button>
      </form>
    </div>
  );
}
