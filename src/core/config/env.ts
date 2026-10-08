type AppEnvKey = "VITE_APP_NAME" | "VITE_API_BASE_URL" | "VITE_SIGNALR_HUB_URL"

const readOptionalEnv = (key: AppEnvKey): string | undefined => {
  const value = import.meta.env[key]
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : undefined
}

export const env = Object.freeze({
  appName: readOptionalEnv("VITE_APP_NAME") ?? "MultiBot",
  apiBaseUrl: readOptionalEnv("VITE_API_BASE_URL"),
  signalRHubUrl: readOptionalEnv("VITE_SIGNALR_HUB_URL"),
})

