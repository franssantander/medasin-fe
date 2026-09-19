import { LetterWorkspace } from "./letter-workspace";

export function LettersPage({
  initialLetterUuid,
}: {
  initialLetterUuid?: string;
}) {
  return (
    <div className="h-[calc(100dvh-5.5rem)] min-h-0 min-w-0 sm:h-[calc(100dvh-6.5rem)]">
      <LetterWorkspace initialLetterUuid={initialLetterUuid} />
    </div>
  );
}
