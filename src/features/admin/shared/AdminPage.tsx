import type { ReactNode } from "react"

import type { FrontendCapability } from "@/core/capabilities/capability.types"
import { capabilityStatusLabels } from "@/core/capabilities/frontendCapabilities"
import { PageContainer } from "@/shared/components/layout/PageContainer"

/** Shared presentation only; each feature owns its queries and supported actions. */
export function AdminPage({ title, description, children }: {
  readonly title: string
  readonly description: string
  readonly children: ReactNode
}) {
  return <PageContainer>
    <div className="mb-7">
      <p className="text-sm font-semibold text-violet-600">Administration</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
    <div className="space-y-5">{children}</div>
  </PageContainer>
}

/** Use shared blocker metadata; this presentation never changes authorization. */
export function AdminUnavailable({ capability }: {
  readonly capability: FrontendCapability & { readonly status: "blocked-backend" }
}) {
  return <section className="rounded-2xl border border-dashed bg-white p-8">
    <h3 className="font-semibold">{capabilityStatusLabels[capability.status]}</h3>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{capability.description}</p>
  </section>
}
