/// <reference types="vite/client" />

declare module 'virtual:pwa-register' {
  export function registerSW(options?: { immediate?: boolean; onOfflineReady?: () => void }): (reloadPage?: boolean) => Promise<void>;
}
