import { LettersPage } from "@/features/letters/components/letters-page";

export default async function LettersRoute({
  searchParams,
}: {
  searchParams: Promise<{
    letter?: string | string[];
  }>;
}) {
  const params = await searchParams;

  return (
    <LettersPage
      initialLetterUuid={
        typeof params.letter === "string" ? params.letter : undefined
      }
    />
  );
}
