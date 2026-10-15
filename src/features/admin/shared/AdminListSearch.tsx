import { useState } from "react"

import { Button } from "@/shared/ui/button"

/** Apply documented server filters together and let the feature reset its page. */
export function AdminListSearch({ maxLength, stateLabel, onApply }: {
  readonly maxLength: number
  readonly stateLabel: string
  readonly onApply: (search: string, state: string) => void
}) {
  const [search, setSearch] = useState("")
  const [state, setState] = useState("")
  return <form aria-label="List filters" className="flex flex-wrap items-end gap-3"
    onSubmit={(event) => { event.preventDefault(); onApply(search.trim(), state) }}>
    <label className="space-y-1 text-sm">Search
      <input className="block rounded-lg border bg-white p-2" value={search} maxLength={maxLength} onChange={(event) => setSearch(event.target.value)} />
    </label>
    <label className="space-y-1 text-sm">{stateLabel}
      <select className="block rounded-lg border bg-white p-2" value={state} onChange={(event) => setState(event.target.value)}>
        <option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
      </select>
    </label>
    <Button type="submit" variant="outline">Apply filters</Button>
  </form>
}
