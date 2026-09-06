"use client";

import { useEffect, useRef, useState } from "react";
import type { FocusSession } from "../type";

function getRemaining(session: FocusSession | null, now: number) {
  if (!session) return 0;
  if (session.status === "paused" || !session.ends_at) return session.remaining_seconds;
  return Math.max(0, Math.ceil((new Date(session.ends_at).getTime() - now) / 1000));
}

export function useFocusTimer(session: FocusSession | null, onElapsed: (session: FocusSession) => void) {
  const [now, setNow] = useState(() => Date.now());
  const completedRef = useRef<string | null>(null);
  const onElapsedRef = useRef(onElapsed);

  useEffect(() => {
    onElapsedRef.current = onElapsed;
  }, [onElapsed]);

  useEffect(() => {
    if (session?.status !== "running") return;
    const clockOffset = new Date(session.server_now).getTime() - Date.now();

    const tick = () => {
      const current = Date.now() + clockOffset;
      const next = getRemaining(session, current);
      setNow(current);
      if (next === 0 && completedRef.current !== session.uuid) {
        completedRef.current = session.uuid;
        onElapsedRef.current(session);
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [session]);

  const remaining = getRemaining(session, now);
  const duration = session?.duration_seconds ?? 0;
  return { remaining, progress: duration ? Math.min(1, Math.max(0, 1 - remaining / duration)) : 0 };
}
