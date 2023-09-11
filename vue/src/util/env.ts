export const isTauri = !!import.meta.env.TAURI_ARCH
export const isStandalone = window === parent