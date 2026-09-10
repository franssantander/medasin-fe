import { JournalWorkspace } from "./journal-workspace";

export function JournalPage({ initialEntryUuid }: { initialEntryUuid?: string }) {
  return <JournalWorkspace initialEntryUuid={initialEntryUuid} />;
}
