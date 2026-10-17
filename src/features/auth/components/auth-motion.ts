import type { Variants } from "motion/react";

import { ease } from "@/features/landing/motion/tokens";

/* Auth pages share the landing page's easing. The card staggers its parts in,
   and any `authItem` inside the form joins the same sequence. */
export const authCard: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const authSection: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease, staggerChildren: 0.05 } },
};

export const authItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};
