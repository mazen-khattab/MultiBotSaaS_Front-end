const readOptionalEnv = (key: keyof ImportMetaEnv): string | undefined => {
  const value = import.meta.env[key]
  return typeof value === "string" && value.trim().length > 0 ? value : undefined
}

export const env = Object.freeze({
  appName: readOptionalEnv("VITE_APP_NAME") ?? "MultiBot",
  apiBaseUrl: readOptionalEnv("VITE_API_BASE_URL"),
  signalRHubUrl: readOptionalEnv("VITE_SIGNALR_HUB_URL"),
})

