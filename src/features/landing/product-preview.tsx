"use client";

import { Tabs } from "@base-ui/react/tabs";
import { useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import * as m from "motion/react-m";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType, type CSSProperties } from "react";

import { appNavigationItems } from "@/features/app-shell/components/app-navigation";
import { cn } from "@/lib/utils";
import { FocusScreen } from "./preview/focus-screen";
import { PreviewHeader, PreviewSidebar } from "./preview/preview-shell";
import { ProjectsScreen } from "./preview/projects-screen";
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

/**
 * The window starts tilted back and settles flat as it scrolls into view, like the app being set down on the page.
 * Only on tablets and up, and never for viewers who ask for reduced motion.
 */
function useSettleOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.3"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const rotateX = useTransform(progress, [0, 1], [16, 0]);
  const scale = useTransform(progress, [0, 1], [0.93, 1]);
  const y = useTransform(progress, [0, 1], [32, 0]);

  return { ref, style: desktop && !reduce ? { rotateX, scale, y } : undefined };
}

export function ProductPreview() {
  const [value, setValue] = useState(initialScreen);
  const { ref, scale } = useCanvasScale();
  const { ref: settleRef, style: settleStyle } = useSettleOnScroll();
  const pills = useSlidingHighlight(value, "x");

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
      onValueChange={(next) => setValue(next as string)}
      orientation="vertical"
      className="flex flex-col gap-3"
    >
      <div
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
              onClick={() => setValue(label)}
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
          <div
            ref={ref}
            data-slot="product-preview"
            style={{ "--preview-scale": scale ?? 0.85 } as CSSProperties}
            className="relative h-[38rem] overflow-hidden rounded-xl border bg-background text-left shadow-[0_24px_60px_-24px_oklch(0_0_0/0.25)] md:aspect-[1280/800] md:h-auto"
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
                        initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
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
      </div>
    </Tabs.Root>
  );
}
