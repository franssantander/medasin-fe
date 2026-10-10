"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { useAmbientNoise } from "../hooks/use-ambient-noise";
import { useFocusDocumentTitle } from "../hooks/use-focus-document-title";
import { useFocusSessionFlow } from "../hooks/use-focus-session-flow";
import { useFocusTimer } from "../hooks/use-focus-timer";
import type { FocusSession } from "../type";

type FocusSessionFlow = ReturnType<typeof useFocusSessionFlow>;
type FocusCountdown = ReturnType<typeof useFocusTimer>;
type FocusView = { quiet: boolean; enterQuiet: () => void; exitQuiet: () => void };

const SessionContext = createContext<FocusSessionFlow | null>(null);
const CountdownContext = createContext<FocusCountdown | null>(null);
const ViewContext = createContext<FocusView | null>(null);

// Keep the ticking clock below the session provider so only timer consumers update each second.
function FocusRuntime({ flow, pathname, children }: { flow: FocusSessionFlow; pathname: string; children: React.ReactNode }) {
  const countdown = useFocusTimer(flow.timerSession, flow.handleElapsed);
  useFocusDocumentTitle(flow.activeSession, countdown.remaining, pathname);
  useAmbientNoise(flow.data?.settings.ambient_sound ?? "off", flow.activeSession?.status === "running" && countdown.remaining > 0);
  return <CountdownContext value={countdown}>{children}</CountdownContext>;
}

export function FocusSessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const mountedRef = useRef(false);
  const notifiedRef = useRef(new Set<string>());
  const noticesRef = useRef(new Set<string>());
  const [quietSessionUuid, setQuietSessionUuid] = useState<string | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
    if (pathname === "/focus") {
      for (const id of noticesRef.current) toast.close(id);
      noticesRef.current.clear();
    }
  }, [pathname]);
  useEffect(() => {
    mountedRef.current = true;
    const notices = noticesRef.current;
    return () => {
      mountedRef.current = false;
      for (const id of notices) toast.close(id);
      notices.clear();
    };
  }, []);

  const onCompleted = useCallback((session: FocusSession) => {
    if (!mountedRef.current) return;
    setQuietSessionUuid(null);
    if (notifiedRef.current.has(session.uuid)) return;
    notifiedRef.current.add(session.uuid);
    if (pathnameRef.current === "/focus") return;
    const id = toast.add({
      type: "success",
      title: session.type === "focus" ? "Focus session complete" : "Break complete",
      description: session.task?.title ?? "Your timer has finished.",
      timeout: 8000,
      actionProps: {
        children: "Review session",
        onClick: () => { toast.close(id); router.push("/focus"); },
      },
      onClose: () => { noticesRef.current.delete(id); },
    });
    noticesRef.current.add(id);
  }, [router]);

  const flow = useFocusSessionFlow({ pollWhenIdle: pathname === "/focus", onCompleted });
  const sessionUuid = flow.timerSession?.uuid;
  const quiet = Boolean(quietSessionUuid && quietSessionUuid === sessionUuid && pathname === "/focus");

  // A different route or session always starts in the normal view, including browser Back.
  if (quietSessionUuid && (pathname !== "/focus" || quietSessionUuid !== sessionUuid)) {
    setQuietSessionUuid(null);
  }

  const enterQuiet = useCallback(() => {
    if (!sessionUuid || pathname !== "/focus") return;
    setQuietSessionUuid(sessionUuid);
    window.requestAnimationFrame(() => document.getElementById("focus-exit-quiet")?.focus());
  }, [sessionUuid, pathname]);
  const exitQuiet = useCallback(() => {
    setQuietSessionUuid(null);
    window.requestAnimationFrame(() => document.getElementById("focus-enter-quiet")?.focus());
  }, []);

  useEffect(() => {
    if (!quiet) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const popups = document.querySelectorAll('[aria-modal="true"], [role="listbox"]');
      if (Array.from(popups).some((popup) => !popup.closest('[data-closed], [data-ending-style], [hidden], [aria-hidden="true"]'))) return;
      if (event.target instanceof Element && event.target.closest('[data-slot="toast"]')) return;
      event.preventDefault();
      exitQuiet();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [quiet, exitQuiet]);

  const view = useMemo(() => ({ quiet, enterQuiet, exitQuiet }), [quiet, enterQuiet, exitQuiet]);
  return (
    <SessionContext value={flow}>
      <ViewContext value={view}>
        <FocusRuntime flow={flow} pathname={pathname}>{children}</FocusRuntime>
      </ViewContext>
    </SessionContext>
  );
}

export function useFocusSession() {
  const flow = useContext(SessionContext);
  if (!flow) throw new Error("useFocusSession must be used inside FocusSessionProvider.");
  return flow;
}

export function useFocusCountdown() {
  const countdown = useContext(CountdownContext);
  if (!countdown) throw new Error("useFocusCountdown must be used inside FocusSessionProvider.");
  return countdown;
}

export function useFocusView() {
  const view = useContext(ViewContext);
  if (!view) throw new Error("useFocusView must be used inside FocusSessionProvider.");
  return view;
}
