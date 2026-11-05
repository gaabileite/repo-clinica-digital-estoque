import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export function LoadingState({ message = 'Carregando dados...' }: { message?: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center p-12 text-center text-muted">
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-accent-text" aria-hidden="true" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface-muted p-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-strong text-body">
        <Inbox className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="mb-1 text-base font-semibold text-heading">{title}</p>
      {description && <p className="mb-4 max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-danger-line bg-danger-subtle p-6 text-danger-text">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs">{message}</p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="mt-3 h-8 rounded-md border border-danger-line px-3 text-xs font-medium hover:bg-danger/10">
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
