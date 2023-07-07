/// <reference types="vite/client" />

interface ImportMetaEnv {
  TAURI_ARCH: string;
  TAURI_DEBUG: string;
  TAURI_FAMILY: string;
  TAURI_PLATFORM: string;
  TAURI_PLATFORM_TYPE: string;
  TAURI_PLATFORM_VERSION: string;
  TAURI_TARGET_TRIPLE: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}