import { CreditCard } from "lucide-react"

import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"
import { PageContainer } from "@/shared/components/layout/PageContainer"

export default function AdminSubscriptionsPage() {
  return (
    <PageContainer>
      <div className="mb-7">
        <p className="text-sm font-semibold text-violet-600">Management</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Subscriptions</h2>
      </div>
      <ComingSoonState
        icon={CreditCard}
        title="Subscription management is coming soon"
        description="This route is reserved for the future admin contract. Part 1 does not introduce placeholder persistence or management actions."
      />
    </PageContainer>
  )
}

