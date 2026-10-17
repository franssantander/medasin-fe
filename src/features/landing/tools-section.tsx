import { Bell, Search, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { appNavigationGroups } from "@/features/app-shell/components/app-navigation";
import { cn } from "@/lib/utils";
import { Reveal, RevealGroup, RevealItem } from "./motion/reveal";
import { ease } from "./motion/tokens";

function BoardVignette() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { stage: "Backlog", count: 4 },
        { stage: "To do", count: 2 },
        { stage: "In progress", count: 2 },
        { stage: "Done", count: 6 },
      ].map(({ stage, count }) => (
        <div key={stage} className="flex min-w-0 flex-col gap-1.5 rounded-md bg-muted/60 p-2">
          <p className="truncate text-[11px] text-muted-foreground">{stage}</p>
          {Array.from({ length: Math.min(count, 3) }, (_, index) => (
            <span key={index} className="h-4 rounded-sm border bg-background" />
          ))}
        </div>
      ))}
    </div>
  );
}

function FocusVignette() {
  return (
    <div className="flex items-end justify-between gap-3">
      {[
        { label: "Focus", minutes: "25:00" },
        { label: "Short break", minutes: "5:00" },
        { label: "Long break", minutes: "15:00" },
      ].map((session, index) => (
        <div key={session.label} className={cn("min-w-0", index > 0 && "text-muted-foreground")}>
          <p className={cn("tabular-nums", index === 0 ? "text-3xl font-semibold" : "text-lg")}>{session.minutes}</p>
          <p className="truncate text-[11px] text-muted-foreground">{session.label}</p>
        </div>
      ))}
    </div>
  );
}

// Two weeks of check-ins that fill in one day at a time, the way a streak builds.
const habitDot = {
  hidden: { opacity: 0, scale: 0.4 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease } },
};

function HabitsVignette() {
  const days = [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1];
  return (
    <RevealGroup stagger={0.04} delay={0.2} className="grid w-fit grid-cols-7 gap-2" aria-hidden="true">
      {days.map((done, index) => (
        <RevealItem
          key={index}
          variants={habitDot}
          className={cn("size-5 rounded-full", done ? "bg-foreground" : "bg-muted")}
        />
      ))}
    </RevealGroup>
  );
}

function NotesVignette() {
  return (
    <ul className="flex flex-col gap-1 text-[13px]">
      {[
        { title: "Writing", depth: 0 },
        { title: "Newsletter ideas", depth: 1 },
        { title: "Spring issue", depth: 2 },
      ].map((note) => (
        <li key={note.title} style={{ paddingLeft: `${note.depth}rem` }} className="text-muted-foreground last:text-foreground">
          <span className="text-muted-foreground/60">{note.depth > 0 ? "└ " : ""}</span>
          {note.title}
        </li>
      ))}
    </ul>
  );
}

function JournalVignette() {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">Thu, Oct 15 · calm</p>
      <p className="mt-1 font-spectral text-base leading-snug">
        The first paragraph came together once I stopped trying to sound clever.
      </p>
    </div>
  );
}

function LettersVignette() {
  return (
    <div className="flex gap-3">
      {[0, 1, 2].map((page) => (
        <div
          key={page}
          className={cn(
            "flex aspect-[3/4] w-20 flex-col gap-1.5 rounded-sm border bg-background p-2 shadow-xs",
            page === 2 && "hidden sm:flex",
          )}
        >
          {page === 0 ? (
            <>
              <span className="mt-auto font-spectral text-sm leading-none">Dear Ana,</span>
              <span className="text-[9px] text-muted-foreground">October</span>
            </>
          ) : (
            Array.from({ length: 6 }, (_, line) => (
              <span key={line} className={cn("h-1 rounded-full bg-muted", line === 5 && "w-2/3")} />
            ))
          )}
        </div>
      ))}
    </div>
  );
}

function PlansVignette() {
  return (
    <ul className="flex flex-col gap-1.5 text-[13px]">
      {[
        { time: "09:00", title: "Write the essay", reminder: true },
        { time: "12:30", title: "Lunch with Ana" },
        { time: "18:00", title: "Evening run" },
      ].map((plan) => (
        <li key={plan.time} className="flex items-center gap-3">
          <span className="w-10 shrink-0 text-muted-foreground tabular-nums">{plan.time}</span>
          <span className="truncate">{plan.title}</span>
          {plan.reminder && <Bell className="ml-auto size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
        </li>
      ))}
    </ul>
  );
}

const toolCopy: Record<string, { description: string; vignette: ReactNode; wide?: boolean }> = {
  Board: {
    description: "Move tasks from backlog to done, with labels, priorities, and linked notes and resources.",
    vignette: <BoardVignette />,
    wide: true,
  },
  Focus: {
    description: "A focus timer with breaks built in, and a short task list for the session.",
    vignette: <FocusVignette />,
  },
  Habits: {
    description: "Daily, weekly, or custom schedules. Check in and watch the streak grow.",
    vignette: <HabitsVignette />,
  },
  Notes: {
    description: "Nest notes as deep as you like, pin the ones you use, and add images.",
    vignette: <NotesVignette />,
  },
  Journal: {
    description: "Write about your day, or let a focus reflection start the entry for you.",
    vignette: <JournalVignette />,
  },
  Letters: {
    description: "Write a letter, then export it as designed pages with a cover.",
    vignette: <LettersVignette />,
    wide: true,
  },
  Plans: {
    description: "Put plans on your calendar and get a reminder before each one.",
    vignette: <PlansVignette />,
  },
};

export function ToolsSection() {
  const tools = appNavigationGroups.find((group) => group.label === "Tools")?.items ?? [];

  return (
    <section id="product" aria-labelledby="product-title" className="scroll-mt-14 border-t bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-sm text-muted-foreground">The tools</p>
          <h2 id="product-title" className="mt-3 font-spectral text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            The tools you need to do the work.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Seven tools share one workspace and one search. Every plan includes all of them, with no limits.
          </p>
        </Reveal>

        <RevealGroup as="ul" className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const copy = toolCopy[tool.label];
            if (!copy) return null;
            const Icon = tool.icon;

            return (
              <RevealItem
                as="li"
                key={tool.label}
                className={cn(
                  "flex min-w-0 flex-col justify-between gap-6 rounded-xl border bg-background p-6 transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-sm motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                  copy.wide && "lg:col-span-2",
                )}
              >
                <div>
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                    {tool.label}
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{copy.description}</p>
                </div>
                {copy.vignette}
              </RevealItem>
            );
          })}
        </RevealGroup>

        <Reveal className="mt-4 grid gap-4 md:grid-cols-2">
          <p className="flex items-start gap-3 rounded-xl border bg-background p-5 text-sm leading-6 text-muted-foreground">
            <Search className="mt-1 size-4 shrink-0 text-foreground" aria-hidden="true" />
            <span>
              <span className="font-medium text-foreground">Search everything.</span> Press{" "}
              <kbd className="rounded border px-1 font-sans text-xs">Ctrl K</kbd> to find any project, note, or
              resource.
            </span>
          </p>
          <p className="flex items-start gap-3 rounded-xl border bg-background p-5 text-sm leading-6 text-muted-foreground">
            <Trash2 className="mt-1 size-4 shrink-0 text-foreground" aria-hidden="true" />
            <span>
              <span className="font-medium text-foreground">Undo deletes for 30 days.</span> Deleted items wait in
              Trash, so you can restore them later.
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
