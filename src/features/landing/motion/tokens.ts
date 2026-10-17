import type { Variants } from "motion/react";

/* One easing, one duration, one stagger rhythm for every reveal on the landing page.
   Plain values live here, outside the client module, so server components can import them too. */
export const ease = [0.22, 1, 0.36, 1] as const;
export const viewport = { once: true, margin: "-80px" } as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};
