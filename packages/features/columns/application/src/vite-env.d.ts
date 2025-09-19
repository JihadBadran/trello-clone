/// <reference types="vite/client" />
/// <reference types="vite/types/importMeta.d.ts" />

declare module 'virtual:pwa-register' {
  export function registerSW(options?: { immediate?: boolean; onOfflineReady?: () => void }): (reloadPage?: boolean) => Promise<void>;
}
