import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/standalone.css';
import { App } from './App';

// Execução isolada (ADR-007 do shell exige): sem menu lateral nem cabeçalho do shell.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="mx-auto max-w-6xl p-4">
      <App standalone />
    </div>
  </StrictMode>,
);
