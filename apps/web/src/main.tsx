import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/standalone.css';
import { App } from './App';
import { createDemoInbox } from './features/notifications/demo-inbox';

/** Quadro de teste da execução isolada; não é carregado pelo shell. */
function ExecucaoIsolada() {
  const [notificationInbox] = useState(() => {
    const demo = new URLSearchParams(window.location.search).get('demo-notificacoes') === '1';
    return demo ? createDemoInbox() : undefined;
  });
  const [temaEscuro, setTemaEscuro] = useState(() => document.documentElement.classList.contains('dark'));

  const alternarTema = () => {
    const proximoTema = !temaEscuro;
    document.documentElement.classList.toggle('dark', proximoTema);
    setTemaEscuro(proximoTema);
  };

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>Execução isolada do módulo. O cabeçalho e o menu da plataforma não aparecem aqui.</span>
        <button
          type="button"
          aria-label="Alternar entre tema claro e escuro"
          aria-pressed={temaEscuro}
          onClick={alternarTema}
          className="rounded-md border border-line-strong bg-surface px-3 py-2 text-body hover:bg-surface-muted"
        >
          Tema: {temaEscuro ? 'escuro' : 'claro'}
        </button>
      </div>
      <App standalone notificationInbox={notificationInbox} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ExecucaoIsolada />
  </StrictMode>,
);
