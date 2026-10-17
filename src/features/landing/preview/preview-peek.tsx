"use client";

import { Tabs } from "@base-ui/react/tabs";
import type { Variants } from "motion/react";
import * as m from "motion/react-m";
import type { ComponentType } from "react";

import { ease } from "../motion/tokens";
import { PreviewHeader, PreviewSidebar } from "./preview-shell";

type Side = -1 | 1;

/* A peek rests beside the center window, tucked behind its edge. Moving one step slides every window one slot over:
   a peek enters from the slot beyond it and leaves toward the slot the carousel is moving away from. */
const SLOT = 86;
const slot = (position: number) => ({
  x: `${position * SLOT}%`,
  scale: position === 0 ? 1 : 0.84,
  rotateY: position * -8,
});

const peekVariants: Variants = {
  enter: ({ side, direction }: { side: Side; direction: number }) => ({ ...slot(side + direction), opacity: 0 }),
  rest: ({ side }: { side: Side }) => ({ ...slot(side), opacity: 0.5 }),
  exit: ({ side, direction }: { side: Side; direction: number }) => ({ ...slot(side - direction), opacity: 0 }),
};

export const peekTransition = { duration: 0.55, ease };

/** A static, dimmed copy of the app window showing a neighbouring screen. Pointer-only: keyboards use the arrows. */
export function PreviewPeek({
  label,
  Screen,
  side,
  direction,
  previewLabels,
  onPick,
}: {
  label: string;
  Screen: ComponentType;
  side: Side;
  /** The step that brought this screen in: 1 forward, -1 back. AnimatePresence passes the latest one on exit. */
  direction: number;
  previewLabels: string[];
  onPick: () => void;
}) {
  return (
    <m.div
      aria-hidden="true"
      data-slot="product-preview-peek"
      data-side={side === -1 ? "left" : "right"}
      variants={peekVariants}
      custom={{ side, direction }}
      initial="enter"
      animate="rest"
      exit="exit"
      transition={peekTransition}
      onClick={onPick}
      className="absolute inset-0 hidden cursor-pointer overflow-hidden rounded-xl border bg-background shadow-[0_24px_60px_-24px_oklch(0_0_0/0.25)] transition-[filter] duration-200 hover:brightness-105 lg:block"
    >
      <div inert className="pointer-events-none">
        <Tabs.Root
          value={label}
          orientation="vertical"
          className="absolute top-0 left-0 flex h-[800px] w-[1280px] origin-top-left scale-(--preview-scale)"
        >
          <PreviewSidebar previewLabels={previewLabels} value={label} />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <PreviewHeader />
            <div className="relative min-h-0 flex-1 overflow-hidden bg-app-content p-6">
              <Screen />
            </div>
          </div>
        </Tabs.Root>
      </div>
    </m.div>
  );
}
