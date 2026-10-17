"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const redirectSeconds = 5;

/** Confirms a verified email, then sends the user to sign in. */
export function VerificationSuccess() {
  const router = useRouter();
  const signInLink = useRef<HTMLAnchorElement>(null);
  const [secondsLeft, setSecondsLeft] = useState(redirectSeconds);

  useEffect(() => {
    // The code field this replaced had focus; keep keyboard users on the next step.
    signInLink.current?.focus();
    const deadline = Date.now() + redirectSeconds * 1000;
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (!left) {
        window.clearInterval(timer);
        router.replace("/login");
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <div className="grid gap-5">
      <div role="status" className="flex items-start gap-3 rounded-xl bg-muted/50 p-4 ring-1 ring-foreground/5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CircleCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="grid gap-0.5">
          <p className="text-sm font-medium">Your email is verified.</p>
          <p className="text-sm text-muted-foreground">Your account is ready. Sign in to start using Medasin.</p>
        </div>
      </div>
      <Link ref={signInLink} href="/login" replace className={cn(buttonVariants(), "h-11 w-full md:h-9")}>
        Go to sign in
      </Link>
      <p className="text-center text-xs text-muted-foreground tabular-nums">
        Taking you to sign in in {secondsLeft}s…
      </p>
    </div>
  );
}
