import { HabitsPage } from "@/features/habits/components/habits-page";

export default async function HabitsRoute({
  searchParams,
}: {
  searchParams: Promise<{ habit?: string | string[] }>;
}) {
  const { habit } = await searchParams;

  return (
    <HabitsPage
      initialHabitUuid={typeof habit === "string" ? habit : undefined}
    />
  );
}
