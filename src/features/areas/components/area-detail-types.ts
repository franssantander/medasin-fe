import type { Goal, Habit } from "../type";

export type AreaTab = "projects" | "goals" | "habits" | "notes" | "resources";
export type EditableAreaRecord = Goal | Habit;
export type EditableAreaRecordKind = "goal" | "habit";
