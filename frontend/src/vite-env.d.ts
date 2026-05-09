/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN?: string;
  readonly VITE_USE_REAL_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
