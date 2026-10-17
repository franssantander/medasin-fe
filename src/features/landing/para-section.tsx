import { ArrowRight, ArrowDown } from "lucide-react";

import { appNavigationGroups } from "@/features/app-shell/components/app-navigation";
import { Reveal, RevealGroup, RevealItem } from "./motion/reveal";
import { ease } from "./motion/tokens";

const paraCopy: Record<string, { summary: string; detail: string; examples: string[] }> = {
  Projects: {
    summary: "Work with a finish line.",
    detail: "Each project gets its own board, dates, and linked resources.",
    examples: ["Spring newsletter", "Move apartments"],
  },
  Areas: {
    summary: "Parts of life you keep up.",
    detail: "Goals, habits, and notes live inside the area they belong to.",
    examples: ["Health", "Writing", "Home"],
  },
  Resources: {
    summary: "Things worth keeping.",
    detail: "Links, files, and references, tagged and linked to your work.",
    examples: ["Interview notes", "Recipe PDFs"],
  },
  Archives: {
    summary: "Done, but not gone.",
    detail: "Archive finished work to clear your lists. Restore it any time.",
    examples: ["Winter newsletter", "Old job"],
  },
};

// Each arrow appears just after the step before it, so the chain reads left to right.
const arrowVariants = {
  hidden: { opacity: 0, x: -6, y: -4 },
  visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.4, ease, delay: 0.25 } },
};

const flow = [
  { label: "Board task", value: "Draft the opening essay" },
  { label: "Focus session", value: "25 minutes, linked to the task" },
  { label: "Reflection", value: "Mood and a short note" },
  { label: "Journal", value: "Saved as an entry for the day" },
];

export function ParaSection() {
  const organize = appNavigationGroups.find((group) => group.label === "Organize")?.items ?? [];

  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-14 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-sm text-muted-foreground">How it works</p>
          <h2 id="how-title" className="mt-3 font-spectral text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Four places for everything, so nothing floats.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Medasin is built on PARA. Every project, note, and file has one home, and you always know where to look.
          </p>
        </Reveal>

        <RevealGroup
          as="ul"
          className="mt-12 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4"
        >
          {organize.map((item) => {
            const copy = paraCopy[item.label];
            if (!copy) return null;
            const Icon = item.icon;

            return (
              <li key={item.label} className="bg-background">
                {/* The content moves, not the cell, so the grid lines never flash through. */}
                <RevealItem className="flex h-full flex-col gap-3 p-6">
                  <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <h3 className="text-lg font-semibold">{item.label}</h3>
                    <p className="font-spectral text-lg leading-snug">{copy.summary}</p>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{copy.detail}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    {copy.examples.map((example) => (
                      <span key={example} className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
                        {example}
                      </span>
                    ))}
                  </div>
                </RevealItem>
              </li>
            );
          })}
        </RevealGroup>

        <div className="mt-16 grid gap-8 lg:grid-cols-[18rem_1fr] lg:items-center">
          <Reveal>
            <h3 className="font-spectral text-2xl font-semibold tracking-tight">Everything links.</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Pull a board task into your focus list, work on it, and your reflection becomes a journal entry. You
              never copy anything by hand.
            </p>
          </Reveal>
          <RevealGroup
            as="ol"
            stagger={0.25}
            delay={0.1}
            className="grid gap-2 md:grid-cols-4 md:gap-0"
            aria-label="From task to journal"
          >
            {flow.map((step, index) => (
              <RevealItem
                as="li"
                key={step.label}
                className="flex flex-col items-start gap-2 md:flex-row md:items-center"
              >
                <div className="w-full flex-1 rounded-lg border bg-card p-4">
                  <p className="text-xs text-muted-foreground">{step.label}</p>
                  <p className="mt-1 text-sm font-medium">{step.value}</p>
                </div>
                {index < flow.length - 1 && (
                  <RevealItem variants={arrowVariants} className="ml-4 shrink-0 md:mx-1.5">
                    <ArrowDown className="size-4 text-muted-foreground md:hidden" aria-hidden="true" />
                    <ArrowRight className="hidden size-4 text-muted-foreground md:block" aria-hidden="true" />
                  </RevealItem>
                )}
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
