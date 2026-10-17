import { Target, Timer } from "lucide-react";

import { appNavigationGroups } from "@/features/app-shell/components/app-navigation";
import { cn } from "@/lib/utils";
import { MedasinHomeLink } from "./medasin-home-link";

const paraNotes: Record<string, string> = {
  Projects: "Goals with an end date",
  Areas: "Responsibilities you tend",
  Resources: "Things worth keeping",
  Archives: "Done, but never lost",
};

const paraItems = appNavigationGroups[0].items;

const week = [
  { day: "M", done: true },
  { day: "T", done: true },
  { day: "W", done: false },
  { day: "T", done: true },
  { day: "F", done: true, today: true },
  { day: "S", done: false },
  { day: "S", done: false },
];

// Illustrative glimpse of the workspace; sample content, hidden from assistive tech.
function WorkspaceGlimpse() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md select-none">
      <div className="absolute inset-x-8 -top-14 h-28 rotate-[-2deg] rounded-xl bg-card/70 px-4 py-3 h-shorter:-top-12 h-shorter:py-2.5 ring-1 ring-foreground/10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
        <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">Journal</p>
        <p className="mt-1 truncate font-spectral text-sm italic text-muted-foreground">
          Slow mornings make for clearer afternoons.
        </p>
      </div>

      <div className="relative grid gap-4 rounded-xl bg-card p-5 shadow-sm h-shorter:gap-3 h-shorter:p-4 ring-1 ring-foreground/10 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Today</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <Timer className="size-3.5" />
            Deep work · 25:00
          </span>
        </div>

        <div className="grid gap-2">
          <p className="text-xs text-muted-foreground">Read 20 pages</p>
          <div className="grid grid-cols-7 gap-1.5">
            {week.map(({ day, done, today }, index) => (
              <div key={index} className="grid justify-items-center gap-1">
                <span
                  className={cn(
                    "size-6 rounded-full h-shorter:size-5",
                    done ? "bg-foreground" : "bg-muted",
                    today && "ring-2 ring-foreground/25 ring-offset-2 ring-offset-card",
                  )}
                />
                <span className="text-[0.625rem] text-muted-foreground">{day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t pt-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
            <Target className="size-4" />
          </span>
          <div className="grid min-w-0 flex-1 gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-medium">Launch portfolio site</p>
              <span className="text-xs tabular-nums text-muted-foreground">64%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[64%] rounded-full bg-foreground" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Laptop screens are short, so the panel tightens and sheds detail as the
// viewport height drops instead of growing past the screen.
export function AuthShowcase() {
  return (
    <aside className="relative m-3 hidden h-[calc(100svh-1.5rem)] min-w-0 flex-col justify-between gap-6 overflow-hidden rounded-2xl bg-app-content p-10 ring-1 ring-foreground/5 lg:sticky lg:top-3 lg:order-first lg:flex h-roomy:p-14 h-short:p-8 h-shorter:p-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />

      <div className="relative grid max-w-lg gap-4 h-short:gap-3 h-shorter:gap-3">
        <div className="mb-4 h-short:mb-2 h-shorter:mb-0">
          <MedasinHomeLink />
        </div>
        <p className="text-sm text-muted-foreground">A connected system for a thoughtful life.</p>
        <p className="font-spectral text-4xl leading-tight tracking-tight text-balance h-roomy:text-5xl">
          Give every idea a place to land.
        </p>
        <p className="max-w-md text-sm leading-6 text-muted-foreground h-shorter:leading-5 [@media(max-height:700px)]:hidden">
          Move projects forward, tend the areas you care about, keep what you learn, and archive
          what&apos;s done, all in one quiet workspace.
        </p>
      </div>

      <div className="relative pt-14 h-short:pt-12 h-shorter:pt-11 [@media(max-height:620px)]:hidden">
        <WorkspaceGlimpse />
      </div>

      <ul className="relative grid grid-cols-2 gap-x-6 gap-y-5 border-t border-foreground/10 pt-6 h-short:gap-y-4 h-short:pt-5 h-shorter:gap-y-3 h-shorter:pt-4">
        {paraItems.map(({ label, icon: Icon }) => (
          <li key={label} className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background ring-1 ring-foreground/10">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{paraNotes[label]}</span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
