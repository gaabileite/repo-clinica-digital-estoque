import type { PageDef } from './routes';

/** Barra de navegação do módulo (o menu lateral e o cabeçalho são do shell). */
export function ModuleNav({ pages, current, onGo }: { pages: PageDef[]; current: string; onGo: (id: string) => void }) {
  return (
    <nav aria-label="Seções de Estoque e insumos" className="mb-4 flex gap-0.5 overflow-x-auto rounded-xl border border-line bg-surface p-1.5">
      {pages.map((p) => (
        <button
          key={p.id || 'home'}
          type="button"
          aria-current={p.id === current ? 'page' : undefined}
          onClick={() => onGo(p.id)}
          className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
            p.id === current ? 'bg-brand-subtle font-bold text-brand-text' : 'text-muted hover:bg-surface-muted hover:text-heading'
          }`}
        >
          {p.label}
        </button>
      ))}
    </nav>
  );
}
