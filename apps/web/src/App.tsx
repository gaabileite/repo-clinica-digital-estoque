import './styles/module.css';
import { ModuleNav } from './app/ModuleNav';
import { PAGES, pageById } from './app/routes';
import { useShellPage } from './lib/use-shell-page';
import { ModuleProviders } from './app/ModuleProviders';

interface AppProps {
  /** true só na execução isolada; o shell renderiza <App /> sem props. */
  standalone?: boolean;
}

/**
 * Ponto de entrada exposto ao shell como `suppliesMfe/App`.
 * Renderiza só o conteúdo do módulo: menu lateral, cabeçalho, tema, usuário e rodapé são do shell.
 * TODO: filtrar PAGES pelas permissões do usuário (GET /me/permissions) e envolver em QueryClientProvider.
 */
export function App({ standalone = false }: AppProps) {
  const { page, go } = useShellPage(standalone);
  const current = pageById(page);
  const Page = current.component;
  const nav = PAGES.filter((p) => p.inNav);

  return (
    <ModuleProviders>
      <section aria-label="Estoque e insumos">
        <ModuleNav pages={nav} current={current.id} onGo={go} />
        <Page />
      </section>
    </ModuleProviders>
  );
}

export default App;
