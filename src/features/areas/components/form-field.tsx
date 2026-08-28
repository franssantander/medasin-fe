import type { ReactNode } from "react";

export function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
      {error && <span className="text-xs font-normal text-destructive">{error}</span>}
    </label>
  );
}
