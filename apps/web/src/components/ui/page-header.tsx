import type { ReactNode } from 'react';

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-6 shadow-xs sm:flex-row sm:items-center sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-heading sm:text-3xl">{title}</h1>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
