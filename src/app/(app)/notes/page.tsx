import { NotesPage } from "@/features/notes/components/notes-page";

export default async function NotesRoute({
  searchParams,
}: {
  searchParams: Promise<{
    note?: string | string[];
  }>;
}) {
  const params = await searchParams;

  return (
    <NotesPage
      initialNoteUuid={
        typeof params.note === "string" ? params.note : undefined
      }
    />
  );
}
