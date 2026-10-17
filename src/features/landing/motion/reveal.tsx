"use client";

import { useReducedMotion, type Variants } from "motion/react";
import * as m from "motion/react-m";
import { Fragment, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { ease, fadeUp, viewport } from "./tokens";

type RevealTag = "div" | "ul" | "ol" | "li" | "p";
type RevealProps = {
  as?: RevealTag;
  className?: string;
  children?: ReactNode;
  delay?: number;
  /** Play on mount instead of when scrolled into view (above-the-fold content). */
  onMount?: boolean;
} & Omit<ComponentPropsWithoutRef<"div">, "children" | "className" | "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd">;

function useTrigger(onMount: boolean | undefined) {
  // Reduced motion renders the final state straight away.
  const reduce = useReducedMotion();
  if (reduce) return { initial: false as const, animate: "visible" };
  return onMount
    ? { initial: "hidden", animate: "visible" }
    : { initial: "hidden", whileInView: "visible", viewport };
}

/** Fades one element up into place. */
export function Reveal({ as = "div", delay = 0, onMount, children, ...props }: RevealProps) {
  const Component = m[as] as typeof m.div;
  return (
    <Component
      {...useTrigger(onMount)}
      variants={{
        hidden: fadeUp.hidden,
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease, delay } },
      }}
      {...props}
    >
      {children}
    </Component>
  );
}

/** Staggers its `RevealItem` children into place, in order. */
export function RevealGroup({
  as = "div",
  delay = 0,
  stagger = 0.08,
  onMount,
  children,
  ...props
}: RevealProps & { stagger?: number }) {
  const Component = m[as] as typeof m.div;
  return (
    <Component
      {...useTrigger(onMount)}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      {...props}
    >
      {children}
    </Component>
  );
}

export function RevealItem({
  as = "div",
  variants = fadeUp,
  children,
  ...props
}: Omit<RevealProps, "delay" | "onMount"> & { variants?: Variants }) {
  const Component = m[as] as typeof m.div;
  return (
    <Component variants={variants} {...props}>
      {children}
    </Component>
  );
}

const wordVariants: Variants = {
  hidden: { opacity: 0, y: "0.35em", filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease } },
};

/** A heading whose words rise in one after another. The text content stays a normal sentence. */
export function SplitWords({
  as = "h2",
  text,
  delay = 0,
  onMount,
  ...props
}: { as?: "h1" | "h2" | "p"; text: string; delay?: number; onMount?: boolean } & Omit<
  ComponentPropsWithoutRef<"h2">,
  "children" | "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
>) {
  const Component = m[as] as typeof m.h2;
  return (
    <Component
      {...useTrigger(onMount)}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05, delayChildren: delay } } }}
      {...props}
    >
      {text.split(" ").map((word, index) => (
        <Fragment key={index}>
          {index > 0 && " "}
          <m.span className="inline-block" variants={wordVariants}>
            {word}
          </m.span>
        </Fragment>
      ))}
    </Component>
  );
}
