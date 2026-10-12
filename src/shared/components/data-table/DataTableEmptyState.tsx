interface DataTableEmptyStateProps {
  title?: string
  description?: string
}

/** A feature can explain an empty result without adding domain branches here. */
export function DataTableEmptyState({
  title = "No results",
  description = "There are no items to display.",
}: DataTableEmptyStateProps) {
  return (
    <div role="status" className="space-y-1 py-10 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
