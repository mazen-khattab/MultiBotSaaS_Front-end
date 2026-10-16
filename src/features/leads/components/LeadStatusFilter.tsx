import { useId, useState, type FormEvent } from "react"

import { Button } from "@/shared/ui/button"

const statuses = ["Pending", "Completed", "Failed"] as const

/** Offer the supported statuses; only Apply or Clear changes the server query. */
export function LeadStatusFilter({ onChange }: { readonly onChange: (status: string | undefined) => void }) {
  const id = useId()
  const [input, setInput] = useState("")

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onChange(input.trim() || undefined)
  }

  return (
    <form aria-label="Filter leads by status" onSubmit={apply} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label htmlFor={id} className="block text-sm font-medium">Lead status</label>
        <select id={id} value={input} onChange={(event) => setInput(event.target.value)}
          className="min-w-44 rounded-lg border bg-background px-3 py-2">
          <option value="">All statuses</option>
          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>
      <Button type="submit" variant="outline">Apply filter</Button>
      <Button type="button" variant="ghost" onClick={() => { setInput(""); onChange(undefined) }}>Clear filter</Button>
    </form>
  )
}
