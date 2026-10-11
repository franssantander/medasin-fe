"use client";

import FullCalendar, {
  type CalendarRef,
  type DateClickInfo,
  type DatesSetInfo,
  type DayCellInfo,
  type DayHeaderInfo,
  type EventClickInfo,
  type EventDisplayInfo,
} from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import listPlugin from "@fullcalendar/react/list";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import classicTheme from "@fullcalendar/react/themes/classic";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PLAN_ACCENTS } from "../plan-accent";
import { planAccent, previousDateKey, type PlanAccent } from "../plan-time";
import type { CalendarPlan, CalendarRange } from "../type";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";

const plugins = [classicTheme, dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin];
type View = "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek";

const views: { value: View; label: string }[] = [
  { value: "dayGridMonth", label: "Month" },
  { value: "timeGridWeek", label: "Week" },
  { value: "timeGridDay", label: "Day" },
  { value: "listWeek", label: "Agenda" },
];

// A month grid is unreadable on a phone, so small screens start on the agenda.
function initialView(): View {
  return window.matchMedia("(max-width: 639px)").matches ? "listWeek" : "dayGridMonth";
}

export function PlansCalendar({
  plans,
  focusDate,
  isFetching,
  status,
  onRangeChange,
  onCreate,
  onOpenPlan,
}: {
  plans: CalendarPlan[];
  focusDate?: string;
  isFetching?: boolean;
  /** A short note under the toolbar, such as an empty-range hint. */
  status?: ReactNode;
  onRangeChange: (range: CalendarRange) => void;
  onCreate: (date: string, time?: string, allDay?: boolean) => void;
  onOpenPlan: (uuid: string) => void;
}) {
  const calendarRef = useRef<CalendarRef>(null);
  const [startView] = useState(initialView);
  const [view, setView] = useState<View>(startView);
  const [title, setTitle] = useState("");
  const events = useMemo(
    () => plans.map((plan) => {
      const accent = planAccent(plan);
      return {
        id: plan.uuid,
        title: plan.title,
        start: plan.is_all_day ? plan.date : plan.starts_at,
        allDay: plan.is_all_day,
        color: PLAN_ACCENTS[accent].eventColor,
        contrastColor: "var(--foreground)",
        extendedProps: { accent, link: (plan.project ?? plan.area)?.name },
      };
    }),
    [plans],
  );

  useEffect(() => {
    if (focusDate) calendarRef.current?.getApi().gotoDate(focusDate);
  }, [focusDate]);

  const api = () => calendarRef.current?.getApi();

  const datesSet = (info: DatesSetInfo) => {
    setTitle(info.view.title);
    setView(info.view.type as View);
    onRangeChange({
      startDate: info.startStr.slice(0, 10),
      endDate: previousDateKey(info.endStr),
    });
  };

  const dateClick = (info: DateClickInfo) => {
    const date = info.dateStr.slice(0, 10);
    const time = info.allDay ? undefined : info.dateStr.slice(11, 16);
    onCreate(date, time, info.allDay);
  };

  const eventClick = (info: EventClickInfo) => {
    info.jsEvent?.preventDefault();
    onOpenPlan(info.event.id);
  };

  return (
    <section className="plans-calendar min-w-0 overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="outline" size="icon-sm" aria-label="Previous calendar range" onClick={() => api()?.prev()}>
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Next calendar range" onClick={() => api()?.next()}>
              <ChevronRight />
            </Button>
          </div>
          <h2 className="min-w-0 truncate text-base font-semibold" aria-live="polite">{title}</h2>
          {isFetching && (
            <span role="status" className="shrink-0 text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              <span className="sr-only">Loading plans</span>
            </span>
          )}
          <Button variant="outline" size="sm" className="ml-auto sm:ml-1" onClick={() => api()?.today()}>Today</Button>
        </div>
        <Tabs value={view} onValueChange={(next) => api()?.changeView(next as View)}>
          <TabsList className="w-full sm:w-auto">
            {views.map(({ value, label }) => (
              <TabsTrigger key={value} value={value}>{label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      {status && <div className="border-b px-3 py-2 text-xs text-muted-foreground sm:px-4">{status}</div>}
      <div role="region" aria-label="Plans calendar" className="min-w-0">
        <FullCalendar
          ref={calendarRef}
          plugins={plugins}
          initialView={startView}
          headerToolbar={false}
          timeZone="local"
          // A fixed height lets time grids scroll and open at the start of the working day.
          height={view.startsWith("timeGrid") ? 720 : "auto"}
          fixedWeekCount={false}
          dayMaxEvents={3}
          moreLinkClick="popover"
          nowIndicator
          editable={false}
          selectable={false}
          events={events}
          datesSet={datesSet}
          dateClick={dateClick}
          eventClick={eventClick}
          eventDisplay="block"
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          views={{
            // Compact times ("9a", "12:30p") leave room for titles in month cells.
            dayGridMonth: { eventTimeFormat: { hour: "numeric", minute: "2-digit", omitZeroMinute: true, meridiem: "narrow" } },
          }}
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          scrollTime="07:00:00"
          allDayText="All day"
          dayHeaderContent={DayHeader}
          dayCellTopContent={DayNumber}
          dayCellClass="cursor-pointer transition-colors hover:bg-muted/40"
          listItemEventBeforeClass="hidden!"
          eventContent={EventChip}
          moreLinkContent={(info) => `+${info.num} more`}
          noEventsContent="Nothing planned for this week."
        />
      </div>
    </section>
  );
}

function DayHeader(info: DayHeaderInfo) {
  const showsDate = info.view.type.startsWith("timeGrid");
  return (
    <span className="flex items-center justify-center gap-1.5 py-1 text-xs font-medium text-muted-foreground uppercase">
      {info.weekdayText || info.text}
      {showsDate && (
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-full text-sm font-semibold tabular-nums normal-case",
            info.isToday ? "bg-primary text-primary-foreground" : "text-foreground",
          )}
        >
          {info.dayNumberText}
        </span>
      )}
    </span>
  );
}

function DayNumber(info: DayCellInfo) {
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
        info.isToday
          ? "bg-primary font-semibold text-primary-foreground"
          : info.isOther
            ? "text-muted-foreground/60"
            : "font-medium text-foreground",
      )}
    >
      {info.dayNumberText}
    </span>
  );
}

function EventChip(info: EventDisplayInfo) {
  const accent = (info.event.extendedProps.accent ?? "none") as PlanAccent;
  const dot = <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", PLAN_ACCENTS[accent].dotClass)} />;

  if (info.view.type.startsWith("list")) {
    const link = info.event.extendedProps.link as string | undefined;
    return (
      <span className="flex min-w-0 items-center gap-3 py-0.5 text-sm">
        <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">
          {info.event.allDay ? "All day" : info.timeText}
        </span>
        {dot}
        <span className="min-w-0 truncate font-medium">{info.event.title}</span>
        {link && <span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:inline">{link}</span>}
      </span>
    );
  }

  if (info.view.type.startsWith("timeGrid") && !info.event.allDay) {
    return (
      <span className="flex min-w-0 flex-col px-1 py-0.5 text-xs leading-4" title={info.event.title}>
        <span className="truncate font-medium">{info.event.title}</span>
        <span className="truncate text-muted-foreground tabular-nums">{info.timeText}</span>
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-1.5 px-1 text-xs leading-5" title={info.event.title}>
      {dot}
      {info.timeText && !info.event.allDay && (
        <span className="shrink-0 text-muted-foreground tabular-nums">{info.timeText}</span>
      )}
      <span className="truncate font-medium">{info.event.title}</span>
    </span>
  );
}
