import type { Goal, Habit, Note } from "../type";

export type AreaTab = "projects" | "goals" | "habits" | "notes" | "resources";
export type EditableAreaRecord = Goal | Habit | Note;
export type EditableAreaRecordKind = "goal" | "habit" | "note";
