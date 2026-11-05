import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './standalone.css';
import { App } from './App';

/** Execução isolada (exigida pelo ADR-007): só um quadro mínimo com troca de tema. */
function Standalone() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    setDark(next);
  };
  return (
    <div className="frame">
      <div className="bar">
        <span>Execução isolada do módulo (no shell, este quadro não existe).</span>
        <button type="button" onClick={toggle}>
          Tema: {dark ? 'escuro' : 'claro'}
        </button>
      </div>
      <App standalone />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Standalone />
  </StrictMode>,
);
