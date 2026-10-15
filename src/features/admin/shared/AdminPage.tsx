import type { ReactNode } from "react"

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

/** Unsupported areas make no requests and expose no pretend mutation controls. */
export function AdminUnavailable({ children }: { readonly children: ReactNode }) {
  return <section className="rounded-2xl border border-dashed bg-white p-8">
    <h3 className="font-semibold">Backend capability unavailable</h3>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{children}</p>
  </section>
}
