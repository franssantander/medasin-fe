import { cn } from "@/lib/utils";

/* Soft fields of ink behind the hero, in the theme's own black and white: graphite on the light page, mist on the dark one.
   Each field has its own depth, and they sit toward the edges, so the copy stays on a clean background. */
const fields = [
  {
    place: "top-0 -left-32 size-[22rem] sm:size-[30rem] lg:top-8 lg:left-[calc(50%-40rem)] lg:size-[34rem]",
    tone: "opacity-[0.16]",
    drift: "animate-hero-drift-a",
  },
  {
    place: "top-4 -right-32 size-[20rem] sm:size-[28rem] lg:top-4 lg:right-[calc(50%-38rem)] lg:size-[30rem]",
    tone: "opacity-[0.11]",
    drift: "animate-hero-drift-b",
  },
  {
    place: "top-[22rem] -right-36 size-[20rem] sm:size-[26rem] lg:top-[18rem] lg:right-[calc(50%-42rem)] lg:size-[28rem]",
    tone: "opacity-[0.13]",
    drift: "animate-hero-drift-c",
  },
  {
    place: "top-[30rem] -left-36 size-[22rem] sm:size-[30rem] lg:top-[28rem] lg:left-[calc(50%-36rem)] lg:size-[32rem]",
    tone: "opacity-[0.09]",
    drift: "animate-hero-drift-d",
  },
];

export function HeroGlow() {
  return (
    <div aria-hidden="true" data-slot="hero-glow" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {fields.map(({ place, tone, drift }) => (
        <div key={drift} className={cn("absolute animate-hero-glow-in motion-reduce:animate-none", place, tone)}>
          <div
            className={cn(
              "size-full rounded-full bg-radial from-foreground to-transparent to-65% will-change-transform motion-reduce:animate-none",
              drift,
            )}
          />
        </div>
      ))}
    </div>
  );
}
