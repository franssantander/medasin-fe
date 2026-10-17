"use client";

import * as m from "motion/react-m";
import type { ReactNode } from "react";

import { authCard, authSection } from "./auth-motion";

type AuthCardProps = {
  eyebrow?: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

// The auth layout carries the brand, so the form reads as a plain section.
// Its parts rise in one after another; keying the card replays this for a new step.
export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <m.section
      initial="hidden"
      animate="visible"
      variants={authCard}
      className="grid gap-7 h-short:gap-6 h-shorter:gap-5"
    >
      <m.header variants={authSection} className="grid gap-2">
        {eyebrow ? <p className="text-xs font-medium text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="font-spectral text-3xl font-medium tracking-tight">{title}</h1>
        <p className="break-words text-sm text-muted-foreground">{description}</p>
      </m.header>
      <m.div variants={authSection}>{children}</m.div>
      {footer ? (
        <m.div variants={authSection} className="border-t pt-5 text-sm text-muted-foreground">
          {footer}
        </m.div>
      ) : null}
    </m.section>
  );
}
