import { useEffect, useId, useRef, useState, type PropsWithChildren } from 'react';
import { X } from 'lucide-react';

export const catalogInputClass =
  'min-h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-body disabled:opacity-60';
export const catalogButtonClass =
  'min-h-11 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-heading hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50';
export const catalogPrimaryClass =
  'min-h-11 rounded-lg border border-brand-primary bg-brand-primary px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50';

export function CatalogDialog({
  title,
  busy = false,
  onClose,
  children,
}: PropsWithChildren<{
  title: string;
  busy?: boolean;
  onClose: () => void;
}>) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [opener] = useState(() => document.activeElement instanceof HTMLElement ? document.activeElement : null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [opener]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-busy={busy}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-body shadow-xl backdrop:bg-black/50"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || busy) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <h2 id={titleId} className="text-xl font-bold text-heading">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Fechar"
          disabled={busy}
          className={catalogButtonClass}
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
