import { useState } from "react"

import { Button } from "@/shared/ui/button"
import { adminSubscriptionFiltersSchema, type AdminSubscriptionFilters } from "./subscriptions.types"

/** Optional IDs filter existing rows; no inactive history or search API exists. */
export function AssignmentFilters({ onApply }: { readonly onApply: (filters: AdminSubscriptionFilters) => void }) {
  const [userId, setUserId] = useState("")
  const [botId, setBotId] = useState("")
  const [invalid, setInvalid] = useState(false)
  return <form aria-label="Assignment filters" className="flex flex-wrap items-end gap-3" noValidate onSubmit={(event) => {
    event.preventDefault()
    const parsed = adminSubscriptionFiltersSchema.safeParse({ userId: userId.trim() || undefined,
      botId: botId.trim() ? Number(botId) : undefined, pageNumber: 1, pageSize: 10 })
    setInvalid(!parsed.success)
    if (parsed.success) onApply(parsed.data)
  }}>
    <label className="space-y-1 text-sm">Filter by user ID
      <input className="block rounded-lg border bg-white p-2" value={userId} onChange={(event) => setUserId(event.target.value)} />
    </label>
    <label className="space-y-1 text-sm">Filter by bot ID
      <input type="number" min={1} step={1} className="block rounded-lg border bg-white p-2" value={botId} onChange={(event) => setBotId(event.target.value)} />
    </label>
    <Button type="submit" variant="outline">Apply filters</Button>
    {invalid ? <p role="alert" className="text-sm text-red-700">Enter a nonempty user GUID and a positive whole bot ID, or leave either filter blank.</p> : null}
  </form>
}
