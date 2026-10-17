"use client";

import { Tabs } from "@base-ui/react/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, useInView, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import * as m from "motion/react-m";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { appNavigationItems } from "@/features/app-shell/components/app-navigation";
import { cn } from "@/lib/utils";
import { FocusScreen } from "./preview/focus-screen";
import { PreviewPeek } from "./preview/preview-peek";
import { PreviewHeader, PreviewSidebar } from "./preview/preview-shell";
import { ProjectsScreen } from "./preview/projects-screen";
import { usePreviewAutoplay } from "./preview/use-preview-autoplay";
import { useSlidingHighlight } from "./preview/use-sliding-highlight";
import { ease } from "./motion/tokens";

/* The real app at 1280×800, scaled to fit on tablets and up. Phones get the app's own mobile layout. */
const CANVAS_WIDTH = 1280;

// These load in the browser when first opened: some depend on today's date, and all stay off the first page load.
const loadHome = () => import("./preview/home-screen");
const loadAreas = () => import("./preview/areas-screen");
const loadResources = () => import("./preview/resources-screen");
const loadArchives = () => import("./preview/archives-screen");
const loadBoard = () => import("./preview/board-screen");
const loadHabits = () => import("./preview/habits-screen");
const loadNotes = () => import("./preview/notes-screen");
const loadJournal = () => import("./preview/journal-screen");
const loadLetters = () => import("./preview/letters-screen");
const loadPlans = () => import("./preview/plans-screen");
const lazyLoaders = [loadHome, loadAreas, loadResources, loadArchives, loadBoard, loadHabits, loadNotes, loadJournal, loadLetters, loadPlans];
const blank = () => <div className="h-full" />;

const screens: { label: string; summary: string; Screen: ComponentType }[] = [
  {
    label: "Home",
    summary: "The home overview: today's plans and focus, active projects, areas, and everyday tools.",
    Screen: dynamic(loadHome, { ssr: false, loading: blank }),
  },
  {
    label: "Projects",
    summary: "A project page with its progress, linked resources, and a four-stage board.",
    // The page opens at the top: the project's details lead, and the board peeks in below (Board has its own screen).
    Screen: ProjectsScreen,
  },
  {
    label: "Areas",
    summary: "Areas for the ongoing parts of life, like Writing, Health, and Garden, as cover cards.",
    Screen: dynamic(loadAreas, { ssr: false, loading: blank }),
  },
  {
    label: "Resources",
    summary: "A library of notes, links, images, and files, filtered by type and tag.",
    Screen: dynamic(loadResources, { ssr: false, loading: blank }),
  },
  {
    label: "Archives",
    summary: "Archived areas, projects, and resources, each ready to restore.",
    Screen: dynamic(loadArchives, { ssr: false, loading: blank }),
  },
  {
    label: "Board",
    summary: "A personal board with tasks moving from backlog to done.",
    Screen: dynamic(loadBoard, { ssr: false, loading: blank }),
  },
  {
    label: "Focus",
    summary: "The focus timer running on a board task, with today's sessions and the focus list.",
    Screen: FocusScreen,
  },
  {
    label: "Habits",
    summary: "This week's habit calendar with streaks, and today's checklist.",
    Screen: dynamic(loadHabits, { ssr: false, loading: blank }),
  },
  {
    label: "Notes",
    summary: "Notes grouped by when you last edited them, with a nested page open.",
    Screen: dynamic(loadNotes, { ssr: false, loading: blank }),
  },
  {
    label: "Journal",
    summary: "A journal entry saved from a focus reflection.",
    Screen: dynamic(loadJournal, { ssr: false, loading: blank }),
  },
  {
    label: "Letters",
    summary: "Letters in drafts and done, ready to share as designed pages.",
    Screen: dynamic(loadLetters, { ssr: false, loading: blank }),
  },
  {
    label: "Plans",
    summary: "This month's calendar of plans beside the upcoming list with reminders.",
    Screen: dynamic(loadPlans, { ssr: false, loading: blank }),
  },
];

const screenLabels = screens.map((screen) => screen.label);
const screenIcons = new Map(appNavigationItems.map((item) => [item.label, item.icon]));
// Home leads the sidebar, but the preview opens on a project, the heart of the app.
const initialScreen = "Projects";

function useCanvasScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>();

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / CANVAS_WIDTH));
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return { ref, scale };
}

const desktopQuery = "(min-width: 768px)";
const subscribeDesktop = (onChange: () => void) => {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useDesktop = () => useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => false);

/** The neighbour `step` places away, wrapping around the ends. */
const screenAt = (index: number, step: number) => screens[(index + step + screens.length) % screens.length];

/** The shortest way round from one screen to another: 1 forward, -1 back. */
function stepBetween(from: string, to: string) {
  const delta = (screenLabels.indexOf(to) - screenLabels.indexOf(from) + screens.length) % screens.length;
  if (delta === 0) return 0;
  return delta <= screens.length / 2 ? 1 : -1;
}

/**
 * The window starts tilted back and settles flat as it scrolls into view, like the app being set down on the page.
 * Only on tablets and up, and never for viewers who ask for reduced motion.
 */
function useSettleOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const desktop = useDesktop();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.3"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const rotateX = useTransform(progress, [0, 1], [16, 0]);
  const scale = useTransform(progress, [0, 1], [0.93, 1]);
  const y = useTransform(progress, [0, 1], [32, 0]);

  return { ref, style: desktop && !reduce ? { rotateX, scale, y } : undefined };
}

export function ProductPreview() {
  const [value, setValue] = useState(initialScreen);
  const [direction, setDirection] = useState(0);
  const { ref, scale } = useCanvasScale();
  const { ref: settleRef, style: settleStyle } = useSettleOnScroll();
  const pills = useSlidingHighlight(value, "x");
  const index = screenLabels.indexOf(value);
  const previous = screenAt(index, -1);
  const next = screenAt(index, 1);

  // Autoplay walks through the screens until the visitor picks one, and waits while they look or tab around.
  const desktop = useDesktop();
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { amount: 0.4 });
  const [userPicked, setUserPicked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const dragged = useRef(false);

  // On phones, the pill strip keeps the active screen's pill in view as the visitor swipes. Never on the first render.
  const stripRef = useRef<HTMLDivElement>(null);
  const shownPill = useRef(value);
  useEffect(() => {
    if (shownPill.current === value) return;
    shownPill.current = value;
    const strip = stripRef.current;
    const pill = strip?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!strip || !pill || strip.clientWidth === 0) return;
    strip.scrollTo({ left: pill.offsetLeft - (strip.clientWidth - pill.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
  }, [value, reduce]);

  const go = (label: string, source: "user" | "auto") => {
    if (source === "user") setUserPicked(true);
    if (label === value) return;
    setDirection(stepBetween(value, label));
    setValue(label);
  };

  usePreviewAutoplay({
    enabled: desktop && !reduce && !userPicked && !hovered && !focusWithin && inView,
    value,
    onAdvance: () => go(next.label, "auto"),
  });

  // Warm the lazy screens once the page is idle, so switching to them is instant.
  useEffect(() => {
    const warm = () => void Promise.all(lazyLoaders.map((load) => load()));
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm);
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm, 1500);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <Tabs.Root
      value={value}
      onValueChange={(label) => go(label as string, "user")}
      orientation="vertical"
      className="flex flex-col gap-3"
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
      }}
    >
      <div
        ref={stripRef}
        className="relative -mx-4 flex gap-1.5 overflow-x-auto px-4 md:hidden"
        role="group"
        aria-label="Preview a Medasin screen"
      >
        {pills.box && (
          <m.span
            aria-hidden="true"
            className="absolute top-0 left-0 h-9 rounded-full bg-foreground"
            initial={false}
            animate={{ x: pills.box.offset, width: pills.box.size }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          />
        )}
        {screenLabels.map((label) => {
          const Icon = screenIcons.get(label);
          return (
            <button
              key={label}
              ref={pills.register(label)}
              type="button"
              aria-pressed={value === label}
              onClick={() => go(label, "user")}
              className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-full border bg-transparent px-3 text-sm text-muted-foreground transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-transparent aria-pressed:text-background"
            >
              {Icon && <Icon className="size-4" aria-hidden="true" />}
              {label}
            </button>
          );
        })}
      </div>

      <div className="perspective-[1600px]">
        <m.div
          ref={settleRef}
          data-slot="product-preview-settle"
          style={settleStyle}
          className="origin-[50%_0%] will-change-transform"
        >
          {/* The stage holds the center window and, on wide screens, dimmed peeks of the screens either side. */}
          <div
            ref={stageRef}
            style={{ "--preview-scale": scale ?? 0.85 } as CSSProperties}
            className="group/stage relative isolate"
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
          >
            {/* The track leans with a mouse drag or a swipe, then springs back as it steps to the screen it was pulled toward. */}
            <m.div
              data-slot="product-preview-track"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              dragMomentum={false}
              onPointerDownCapture={() => (dragged.current = false)}
              onDragStart={() => (dragged.current = true)}
              onDragEnd={(_, { offset, velocity }) => {
                const swipe = Math.abs(offset.x) > 60 || (Math.abs(velocity.x) > 500 && Math.abs(offset.x) > 10);
                if (swipe) go((offset.x < 0 ? next : previous).label, "user");
              }}
              className="relative isolate perspective-[1600px] md:cursor-grab md:select-none md:active:cursor-grabbing"
            >
              {scale !== undefined &&
                ([
                  [-1, previous],
                  [1, next],
                ] as const).map(([side, screen]) => (
                  <AnimatePresence key={side} initial={false} custom={{ side, direction }}>
                    <PreviewPeek
                      key={screen.label}
                      label={screen.label}
                      Screen={screen.Screen}
                      side={side}
                      direction={direction}
                      previewLabels={screenLabels}
                      // Letting go of a drag over a peek isn't a click on it.
                      onPick={() => {
                        if (!dragged.current) go(screen.label, "user");
                      }}
                    />
                  </AnimatePresence>
                ))}
              <div
                ref={ref}
                data-slot="product-preview"
                className="relative z-10 h-[38rem] overflow-hidden rounded-xl border bg-background text-left shadow-[0_24px_60px_-24px_oklch(0_0_0/0.25)] md:aspect-[1280/800] md:h-auto"
              >
                <div
                  data-slot="product-preview-canvas"
                  className={cn(
                    "flex h-full w-full md:absolute md:top-0 md:left-0 md:h-[800px] md:w-[1280px] md:origin-top-left md:scale-(--preview-scale)",
                    scale === undefined && "md:opacity-0",
                  )}
                >
                  <PreviewSidebar previewLabels={screenLabels} value={value} />
                  <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <PreviewHeader />
                    <div className="relative min-h-0 flex-1 overflow-hidden bg-app-content p-4 sm:p-6">
                      {screens.map(({ label, summary, Screen }) => (
                        <Tabs.Panel key={label} value={label} className="h-full outline-none data-ending-style:hidden">
                          <p className="sr-only">{summary}</p>
                          {/* A picture of the app: visible, but not focusable or announced. */}
                          <m.div
                            aria-hidden="true"
                            inert
                            className="h-full"
                            initial={{ opacity: 0, x: 48 * direction, filter: "blur(4px)" }}
                            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                            transition={{ duration: 0.35, ease }}
                          >
                            <Screen />
                          </m.div>
                        </Tabs.Panel>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </m.div>

            {(
              [
                ["Previous screen", previous, ChevronLeft, "-left-5 lg:-left-16"],
                ["Next screen", next, ChevronRight, "-right-5 lg:-right-16"],
              ] as const
            ).map(([name, screen, Icon, place]) => (
              // The wrapper centres the button, so pressing it never moves it.
              <div key={name} className={cn("pointer-events-none absolute inset-y-0 z-20 hidden items-center md:flex", place)}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  aria-label={name}
                  onClick={() => go(screen.label, "user")}
                  className="pointer-events-auto rounded-full border-border/60 bg-background/70 text-muted-foreground opacity-60 shadow-sm backdrop-blur-md transition-[opacity,color,background-color,scale] duration-150 ease-out group-hover/stage:opacity-100 hover:bg-background hover:text-foreground focus-visible:opacity-100 active:scale-95 active:not-aria-[haspopup]:translate-y-0 dark:bg-background/70 dark:hover:bg-background"
                >
                  <Icon className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </m.div>
      </div>

      <p
        aria-live="polite"
        data-slot="product-preview-caption"
        className="mt-2 hidden text-center font-spectral text-xl font-semibold tracking-tight md:block sm:text-2xl"
      >
        <m.span
          key={value}
          className="inline-block"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease }}
        >
          {value}
        </m.span>
      </p>
    </Tabs.Root>
  );
}
