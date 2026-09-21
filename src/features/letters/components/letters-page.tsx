import { LetterWorkspace } from "./letter-workspace";

export function LettersPage({
  initialLetterUuid,
}: {
  initialLetterUuid?: string;
}) {
  return (
    <div className="h-[calc(100dvh-5.5rem)] min-h-0 min-w-0 rounded-2xl bg-zinc-200/60 p-1.5 transition-colors duration-200 sm:h-[calc(100dvh-6.5rem)] sm:p-2 dark:bg-zinc-950/70">
      <LetterWorkspace initialLetterUuid={initialLetterUuid} />
    </div>
  );
}
