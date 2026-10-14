import { getLeadProfileLink } from "@/features/leads/components/leadPresentation"

/** Show both supplied profile fields; never render scraped markup as HTML. */
export function LeadProfile({ name, url }: { readonly name: string; readonly url: string }) {
  const href = getLeadProfileLink(url)
  return (
    <div className="min-w-40 space-y-1">
      <p className="font-medium">{name}</p>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-blue-600 underline">{url}</a>
      ) : (
        <p className="break-all text-muted-foreground">{url}</p>
      )}
    </div>
  )
}
