import { JournalPage } from "@/features/journal/components/journal-page";

export default async function JournalRoute({
  searchParams,
}: {
  searchParams: Promise<{
    entry?: string | string[];
  }>;
}) {
  const params = await searchParams;

  return (
    <JournalPage
      initialEntryUuid={
        typeof params.entry === "string" ? params.entry : undefined
      }
    />
  );
}
