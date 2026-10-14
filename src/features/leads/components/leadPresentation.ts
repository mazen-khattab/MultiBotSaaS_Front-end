/** Keep server URLs as text unless they are safe external HTTP(S) links. */
export function getLeadProfileLink(value: string): string | undefined {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined
  } catch {
    return undefined
  }
}

/** Backend timestamps are UTC. SQL timestamps can omit the timezone suffix. */
export function formatLeadCreatedAt(value: string): string {
  const utcValue = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`
  const date = new Date(utcValue)
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString()
}
