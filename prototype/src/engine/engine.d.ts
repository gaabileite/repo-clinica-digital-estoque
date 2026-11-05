export interface MountOptions {
  /** Execução fora do shell: a URL não leva o prefixo /supplies. */
  standalone?: boolean;
}
export function mount(root: HTMLElement, host?: MountOptions): { unmount(): void };
