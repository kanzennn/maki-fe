interface ImportMetaEnv {
  /** The API's base URL, such as https://pos.example.com/api/v1. Empty means /api/v1 on the app's own origin. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
