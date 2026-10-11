import { LetterEditorPage } from "@/features/letters/components/letter-editor-page";

export default async function LetterRoute({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;

  return <LetterEditorPage letterUuid={uuid} />;
}
