"use client";

import FullCalendar, {
  type CalendarRef,
  type DateClickInfo,
  type DatesSetInfo,
  type EventClickInfo,
} from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import classicTheme from "@fullcalendar/react/themes/classic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { previousDateKey } from "../plan-time";
import type { CalendarPlan, CalendarRange } from "../type";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";

const plugins = [classicTheme, dayGridPlugin, timeGridPlugin, interactionPlugin];
type View = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

export function PlansCalendar({
  plans,
  focusDate,
  onRangeChange,
  onCreate,
  onOpenPlan,
}: {
  plans: CalendarPlan[];
  focusDate?: string;
  onRangeChange: (range: CalendarRange) => void;
  onCreate: (date: string, time?: string, allDay?: boolean) => void;
  onOpenPlan: (uuid: string) => void;
}) {
  const calendarRef = useRef<CalendarRef>(null);
  const [view, setView] = useState<View>("dayGridMonth");
  const [title, setTitle] = useState("");
  const events = useMemo(
    () => plans.map((plan) => ({
      id: plan.uuid,
      title: plan.title,
      start: plan.is_all_day ? plan.date : plan.starts_at,
      allDay: plan.is_all_day,
    })),
    [plans],
  );

  useEffect(() => {
    if (focusDate) calendarRef.current?.getApi().gotoDate(focusDate);
  }, [focusDate]);

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
    <div className="plans-calendar min-w-0 rounded-xl border bg-card p-3 shadow-xs sm:p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-1">
          <Button variant="outline" size="icon-sm" aria-label="Previous calendar range" onClick={() => calendarRef.current?.getApi().prev()}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Next calendar range" onClick={() => calendarRef.current?.getApi().next()}>
            <ChevronRight />
          </Button>
          <h2 className="min-w-0 flex-1 truncate px-2 text-base font-semibold sm:ml-2 sm:flex-none" aria-live="polite">{title}</h2>
          <Button variant="outline" size="sm" onClick={() => calendarRef.current?.getApi().today()}>Today</Button>
        </div>
        <Tabs value={view} onValueChange={(next) => calendarRef.current?.getApi().changeView(next)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="dayGridMonth">Month</TabsTrigger>
            <TabsTrigger value="timeGridWeek">Week</TabsTrigger>
            <TabsTrigger value="timeGridDay">Day</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div role="region" aria-label="Plans calendar" className="min-w-0">
        <FullCalendar
          ref={calendarRef}
          plugins={plugins}
          initialView="dayGridMonth"
          headerToolbar={false}
          timeZone="local"
          height="auto"
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
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          allDayText="All day"
        />
      </div>
    </div>
  );
}
