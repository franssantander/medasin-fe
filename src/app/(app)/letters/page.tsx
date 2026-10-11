import { redirect } from "next/navigation";
import { LettersLibrary } from "@/features/letters/components/letters-library";

export default async function LettersRoute({
  searchParams,
}: {
  searchParams: Promise<{
    letter?: string | string[];
  }>;
}) {
  const params = await searchParams;

  // Older links (global search, bookmarks) opened letters with `?letter=`.
  if (typeof params.letter === "string" && params.letter) {
    redirect(`/letters/${encodeURIComponent(params.letter)}`);
  }

  return <LettersLibrary />;
}
