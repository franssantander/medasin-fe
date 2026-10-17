import type { ReactNode } from "react";

type AuthCardProps = {
  eyebrow?: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

// The auth layout carries the brand, so the form reads as a plain section.
export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <section className="grid gap-7 h-short:gap-6 h-shorter:gap-5">
      <header className="grid gap-1.5">
        {eyebrow ? <p className="text-xs font-medium text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="break-words text-sm text-muted-foreground">{description}</p>
      </header>
      {children}
      {footer ? (
        <div className="border-t pt-5 text-sm text-muted-foreground">{footer}</div>
      ) : null}
    </section>
  );
}
