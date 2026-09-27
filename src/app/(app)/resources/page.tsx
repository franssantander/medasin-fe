import { ResourceList } from "@/features/resources/components/resource-list";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ resource?: string | string[] }>;
}) {
  const resource = (await searchParams).resource;
  const initialResourceUuid =
    typeof resource === "string" && UUID_PATTERN.test(resource)
      ? resource
      : undefined;

  return <ResourceList initialResourceUuid={initialResourceUuid} />;
}
