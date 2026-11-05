import { useEffect, useRef } from 'react';
import './engine/estoque.css';
import { mount } from './engine/engine';

interface AppProps {
  /** true somente na execução isolada (sem o shell); o shell renderiza <App /> sem props. */
  standalone?: boolean;
}

/**
 * Ponto de entrada exposto ao shell como `suppliesMfe/App`.
 * Renderiza apenas o CONTEÚDO do módulo: o menu lateral, o cabeçalho, o tema, o usuário
 * e o rodapé são do shell. O motor do protótipo é montado/desmontado no ciclo de vida do React.
 */
export function App({ standalone = false }: AppProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = mount(ref.current!, { standalone });
    return () => handle.unmount();
  }, [standalone]);

  return <div ref={ref} className="est-root" />;
}

export default App;
