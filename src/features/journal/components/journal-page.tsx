import { JournalWorkspace } from "./journal-workspace";

export function JournalPage({ initialEntryUuid }: { initialEntryUuid?: string }) {
  return (
    <div className="h-[calc(100dvh-5.5rem)] sm:h-[calc(100dvh-6.5rem)]">
      <JournalWorkspace initialEntryUuid={initialEntryUuid} />
    </div>
  );
}
