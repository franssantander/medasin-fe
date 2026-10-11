import { LetterStudioPage } from "@/features/letters/components/letter-studio-page";
import { isLetterExportFormat } from "@/features/letters/letter-export-formats";

export default async function LetterStudioRoute({
  params,
  searchParams,
}: {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ format?: string | string[] }>;
}) {
  const [{ uuid }, query] = await Promise.all([params, searchParams]);

  return (
    <LetterStudioPage
      letterUuid={uuid}
      initialFormat={
        isLetterExportFormat(query.format) ? query.format : undefined
      }
    />
  );
}
