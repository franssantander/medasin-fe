"use client";

import { Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { Habit, Paginated } from "../type";
import { HabitCard } from "./habit-card";

export type HabitTrackerProps = {
  habits: Habit[];
  pagination?: Paginated<Habit>;
  archived: boolean;
  areaUuid: string;
  page: number;
  setPage: (page: number) => void;
  onAdd: () => void;
  onEdit: (habit: Habit) => void;
  onDelete: (uuid: string) => void;
  onLink: () => void;
};

export function HabitTracker({
  habits,
  pagination,
  archived,
  areaUuid,
  page,
  setPage,
  onAdd,
  onEdit,
  onDelete,
  onLink,
}: HabitTrackerProps) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Habit tracker</h2>
          <p className="text-sm text-muted-foreground">
            Build consistency one scheduled check-in at a time.
          </p>
        </div>
        {!archived && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onLink}>
              <Link2 />
              Link existing
            </Button>
            <Button size="sm" onClick={onAdd}>
              <Plus />
              Add habit
            </Button>
          </div>
        )}
      </div>
      {habits.length === 0 ? (
        <Card className="items-center py-12 text-center">
          <CardTitle>No habits yet</CardTitle>
          <CardDescription>
            Define a small, repeatable action to begin tracking.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {habits.map((habit) => (
            <HabitCard
              key={habit.uuid}
              habit={habit}
              archived={archived}
              areaUuid={areaUuid}
              onEdit={() => onEdit(habit)}
              onDelete={() => onDelete(habit.uuid)}
            />
          ))}
        </div>
      )}
      {pagination && pagination.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.last_page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.last_page}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
