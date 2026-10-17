import { appNavigationGroups } from "@/features/app-shell/components/app-navigation";
import { Reveal, RevealGroup, RevealItem, SplitWords } from "@/features/landing/motion/reveal";
import { AuthWorkspaceGlimpse } from "./auth-workspace-glimpse";
import { MedasinHomeLink } from "./medasin-home-link";

const paraNotes: Record<string, string> = {
  Projects: "Goals with an end date",
  Areas: "Responsibilities you tend",
  Resources: "Things worth keeping",
  Archives: "Done, but never lost",
};

const paraItems = appNavigationGroups[0].items;

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
        <Reveal as="p" onMount className="text-sm text-muted-foreground">
          A connected system for a thoughtful life.
        </Reveal>
        <SplitWords
          as="p"
          onMount
          delay={0.1}
          text="Give every idea a place to land."
          className="font-spectral text-4xl leading-tight tracking-tight text-balance h-roomy:text-5xl"
        />
        <Reveal
          as="p"
          onMount
          delay={0.35}
          className="max-w-md text-sm leading-6 text-muted-foreground h-shorter:leading-5 [@media(max-height:700px)]:hidden"
        >
          Move projects forward, tend the areas you care about, keep what you learn, and archive
          what&apos;s done, all in one quiet workspace.
        </Reveal>
      </div>

      <div className="relative pt-14 h-short:pt-12 h-shorter:pt-11 [@media(max-height:620px)]:hidden">
        <AuthWorkspaceGlimpse />
      </div>

      <RevealGroup
        as="ul"
        onMount
        delay={0.7}
        className="relative grid grid-cols-2 gap-x-6 gap-y-5 border-t border-foreground/10 pt-6 h-short:gap-y-4 h-short:pt-5 h-shorter:gap-y-3 h-shorter:pt-4"
      >
        {paraItems.map(({ label, icon: Icon }) => (
          <RevealItem as="li" key={label} className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background ring-1 ring-foreground/10">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{paraNotes[label]}</span>
            </span>
          </RevealItem>
        ))}
      </RevealGroup>
    </aside>
  );
}
