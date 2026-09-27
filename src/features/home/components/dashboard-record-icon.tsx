import { Leaf, Rocket } from "lucide-react";
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";

type RecordKind = "project" | "area";

// Saved icon names use PascalCase, while Lucide's dynamic imports use kebab-case.
// Matching without separators also handles names containing acronyms and digits.
const normalizedIconNames = new Map<string, IconName>();
for (const iconName of iconNames) {
  const normalized = iconName.replaceAll("-", "").toLowerCase();
  if (!normalizedIconNames.has(normalized)) {
    normalizedIconNames.set(normalized, iconName);
  }
}

function ProjectFallbackIcon() {
  return <Rocket className="size-5" aria-hidden="true" />;
}

function AreaFallbackIcon() {
  return <Leaf className="size-5" aria-hidden="true" />;
}

export function DashboardRecordIcon({
  kind,
  name,
}: {
  kind: RecordKind;
  name?: string | null;
}) {
  const normalized = name?.replaceAll("-", "").toLowerCase();
  const resolvedName = normalized
    ? normalizedIconNames.get(normalized)
    : undefined;
  const FallbackIcon = kind === "project" ? ProjectFallbackIcon : AreaFallbackIcon;

  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground ring-1 ring-foreground/5">
      {resolvedName ? (
        <DynamicIcon
          key={resolvedName}
          name={resolvedName}
          fallback={FallbackIcon}
          className="size-5"
          data-icon-name={resolvedName}
          aria-hidden="true"
        />
      ) : (
        <FallbackIcon />
      )}
    </span>
  );
}
