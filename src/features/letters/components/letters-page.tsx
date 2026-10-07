import { LetterWorkspace } from "./letter-workspace";

export function LettersPage({
  initialLetterUuid,
}: {
  initialLetterUuid?: string;
}) {
  return (
    <div className="h-full min-h-0 min-w-0 overflow-hidden bg-background">
      <LetterWorkspace initialLetterUuid={initialLetterUuid} />
    </div>
  );
}
