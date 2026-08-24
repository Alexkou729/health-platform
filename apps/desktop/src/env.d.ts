/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface Window {
  electronAPI: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    openExternal: (url: string) => Promise<void>;
    showSaveDialog: (options: any) => Promise<any>;
    getAppInfo: () => Promise<any>;
    readConfig: () => Promise<any>;
    writeConfig: (data: any) => Promise<boolean>;
  };
}
