import {
  ArchivesPage,
  type ArchivesTab,
} from "@/features/archives/components/archives-page";

const tabs: ArchivesTab[] = ["all", "areas", "projects", "resources"];

export default async function ArchivesRoutePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;
  const initialTab = tabs.includes(tab as ArchivesTab)
    ? (tab as ArchivesTab)
    : "all";

  return <ArchivesPage initialTab={initialTab} />;
}
