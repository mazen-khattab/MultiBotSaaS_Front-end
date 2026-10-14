import { useId, useState, type FormEvent } from "react"

import { Button } from "@/shared/ui/button"

/** Accept any status string; only Apply or Clear changes the server query. */
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
        <input id={id} value={input} onChange={(event) => setInput(event.target.value)}
          placeholder="All statuses" className="rounded-lg border bg-background p-2" />
      </div>
      <Button type="submit" variant="outline">Apply filter</Button>
      <Button type="button" variant="ghost" onClick={() => { setInput(""); onChange(undefined) }}>Clear filter</Button>
    </form>
  )
}
