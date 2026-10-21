/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_CORRECTION_ENDPOINT?: string;
  readonly PUBLIC_ENABLE_ADS?: string;
  readonly PUBLIC_ENABLE_ANONYMOUS_NO_RESULT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
