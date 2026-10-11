interface ImportMetaEnv {
  /** Origin of the API. Empty means the same origin as the app. */
  readonly VITE_API_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
