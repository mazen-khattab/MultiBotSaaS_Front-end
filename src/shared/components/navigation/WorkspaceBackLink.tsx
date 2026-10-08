import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

interface WorkspaceBackLinkProps {
  to: string
  onNavigate?: () => void
}

export function WorkspaceBackLink({ to, onNavigate }: WorkspaceBackLinkProps) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to bots
    </Link>
  )
}

