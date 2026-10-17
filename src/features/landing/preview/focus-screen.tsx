import { Circle, KanbanSquare, Maximize2, MoreHorizontal, Pause, Plus, RotateCcw, Settings, Timer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FocusProgressRing } from "@/features/focus/components/focus-progress-ring";
import { FocusRoundDots } from "@/features/focus/components/focus-round-dots";
import { FocusSoundSelect } from "@/features/focus/components/focus-sound-select";
import { FocusTodayStats } from "@/features/focus/components/focus-today-stats";
import { phaseLabels, phaseMeta } from "@/features/focus/lib/focus-utils";
import type { FocusSessionType } from "@/features/focus/type";
import { cn } from "@/lib/utils";
import { PreviewPageHeader } from "./preview-page-header";
import { previewFocusTasks } from "./preview-fixtures";

const minutes: Record<FocusSessionType, number> = { focus: 25, short_break: 5, long_break: 15 };
const noop = () => {};

// Mirrors focus-page.tsx with a running session: FocusTimerCard plus FocusTaskPanel.
export function FocusScreen() {
  const meta = phaseMeta.focus;
  const PhaseIcon = meta.icon;
  const [current] = previewFocusTasks;

  return (
    <div className="grid w-full min-w-0 gap-5">
      <PreviewPageHeader
        title="Focus Timer"
        description="One task. One focused session."
        action={
          <Button variant="outline">
            <Settings data-icon="inline-start" />
            Settings
          </Button>
        }
      />
      <div className="grid min-w-0 items-start gap-5 md:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className={cn("min-w-0 gap-6", meta.wash)}>
          <CardHeader className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", meta.chip)}>
                <PhaseIcon className="size-4" />
              </span>
              <span className="truncate text-sm font-medium">{phaseLabels.focus}</span>
            </div>
            <Badge variant="outline" className="shrink-0 gap-1.5 bg-background/70">
              <span className={cn("size-1.5 animate-pulse rounded-full motion-reduce:animate-none", meta.dot)} />
              Running
            </Badge>
          </CardHeader>
          <CardContent className="items-center gap-6">
            <ToggleGroup value={["focus"]} disabled spacing={1} className="w-full max-w-md rounded-lg bg-muted p-[3px]">
              {(Object.keys(phaseLabels) as FocusSessionType[]).map((item) => (
                <ToggleGroupItem
                  key={item}
                  value={item}
                  className="h-auto min-w-0 flex-1 flex-col gap-0.5 py-1.5 text-muted-foreground opacity-100! hover:bg-transparent aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm dark:aria-pressed:bg-input/30"
                >
                  <span className="max-w-full truncate leading-tight">{phaseLabels[item]}</span>
                  <span className="text-xs leading-tight font-normal text-muted-foreground tabular-nums">
                    {minutes[item]} min
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FocusProgressRing progress={0.25} time="18:42" label="Focus" caption="remaining" toneClassName={meta.text} />
            <div className="flex w-full max-w-md min-w-0 flex-col items-center gap-1 text-center">
              <p className="text-xs font-medium text-muted-foreground">Working on</p>
              <p className="line-clamp-2 max-w-full text-lg leading-snug font-semibold break-words">{current.title}</p>
            </div>
            <FocusRoundDots completed={1} perCycle={4} suggestedNext="short_break" />
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" size="icon">
                  <RotateCcw />
                </Button>
                <Button className="min-w-36">
                  <Pause data-icon="inline-start" />
                  Pause
                </Button>
                <Button variant="ghost" size="icon">
                  <Maximize2 />
                </Button>
              </div>
              <p className="max-w-sm text-center text-sm text-muted-foreground">
                One thing at a time. Your progress is kept as you work.
              </p>
              <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                <span>Press</span>
                <Kbd>Space</Kbd>
                <span>to pause</span>
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3 border-t sm:flex-row sm:items-center sm:justify-between">
            <FocusTodayStats stats={{ completed_focus_sessions: 1, focused_seconds: 3120 }} className="sm:max-w-sm sm:flex-1" />
            <FocusSoundSelect value="brown" disabled={false} onChange={noop} />
          </CardFooter>
        </Card>

        <Card className="min-w-0 gap-4 [--card-spacing:--spacing(5)]">
          <CardHeader>
            <CardTitle>Focus tasks</CardTitle>
            <CardDescription>{previewFocusTasks.length} active tasks</CardDescription>
            <CardAction>
              <Button variant="outline" size="sm">
                <Plus data-icon="inline-start" />
                Add task
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="min-h-0">
            <Tabs value="active" className="min-h-0 gap-3">
              <TabsList className="w-full">
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              <div className="flex min-h-0 flex-col gap-2 px-1 pb-1">
                {previewFocusTasks.map((task) => {
                  const selected = task === current;
                  const source = task.source && [task.source.project, task.source.board].filter(Boolean).join(" / ");
                  return (
                    <article
                      key={task.uuid}
                      className={cn(
                        "relative flex min-w-0 items-start gap-1 rounded-lg border bg-card p-1.5",
                        selected &&
                          cn(
                            "border-transparent bg-muted/50 ring-1 ring-border before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full",
                            meta.accent,
                          ),
                      )}
                    >
                      <Button variant="ghost" size="icon-sm" className="mt-0.5 text-muted-foreground">
                        <Circle />
                      </Button>
                      <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
                        <span className="flex w-full flex-col items-start gap-1 rounded-md px-1.5 py-1.5 text-left text-sm font-medium">
                          <span className="line-clamp-2 max-w-full leading-snug break-words">{task.title}</span>
                          {source && (
                            <span className="flex max-w-full min-w-0 items-center gap-1 text-xs font-normal text-muted-foreground">
                              <KanbanSquare className="size-3.5" />
                              <span className="truncate">{source}</span>
                            </span>
                          )}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1.5 pb-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                            <Timer className="size-3.5" />
                            {task.session_count} {task.session_count === 1 ? "session" : "sessions"}
                          </span>
                          {selected && <Badge>Current</Badge>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon-sm" className="mt-0.5 text-muted-foreground">
                        <MoreHorizontal />
                      </Button>
                    </article>
                  );
                })}
              </div>
            </Tabs>
          </CardContent>
          <CardFooter>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Finish or reset the current session before switching tasks. Other tasks stay in your queue.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
