import { JournalWorkspace } from "./journal-workspace";

export function JournalPage({ initialEntryUuid }: { initialEntryUuid?: string }) {
  return (
    <div className="h-full min-h-0">
      <JournalWorkspace initialEntryUuid={initialEntryUuid} />
    </div>
  );
}
