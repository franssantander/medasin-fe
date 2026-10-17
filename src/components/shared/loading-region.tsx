import type { ComponentProps } from "react";

// Announces one loading message to assistive tech and hides the decorative
// skeleton shapes inside it.
export function LoadingRegion({
  label,
  children,
  ...props
}: Omit<ComponentProps<"div">, "role" | "aria-label" | "aria-busy"> & {
  label: string;
}) {
  return (
    <div role="status" aria-label={label} aria-busy="true" {...props}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </div>
  );
}
