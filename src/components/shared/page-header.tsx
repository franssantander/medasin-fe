import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  action?: ReactNode;
};

export default function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <header className="flex w-full flex-wrap items-center justify-between gap-4">
      <h1 className="text-lg font-bold">{title}</h1>
      {action && (
        <div className="flex flex-wrap items-center gap-2">{action}</div>
      )}
    </header>
  );
}
