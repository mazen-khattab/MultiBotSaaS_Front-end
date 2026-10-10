type AppEnvKey = "VITE_APP_NAME" | "VITE_API_BASE_URL" | "VITE_SIGNALR_HUB_URL" | "VITE_LOCAL" | "MAX_QUERY_RETRIES"

const readOptionalEnv = (key: AppEnvKey): string | undefined => {
  const value = import.meta.env[key]
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : undefined
}

export const env = Object.freeze({
  appName: readOptionalEnv("VITE_APP_NAME") ?? "MultiBot",
  apiBaseUrl: readOptionalEnv("VITE_API_BASE_URL"),
  signalRHubUrl: readOptionalEnv("VITE_SIGNALR_HUB_URL"),
  local: readOptionalEnv("VITE_LOCAL") ?? "en-US",
  maxQueryRetries: readOptionalEnv("MAX_QUERY_RETRIES") ? parseInt(readOptionalEnv("MAX_QUERY_RETRIES")!, 10) : 2,
})

