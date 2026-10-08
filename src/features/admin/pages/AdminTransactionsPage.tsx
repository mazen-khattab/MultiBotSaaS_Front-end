import { ReceiptText } from "lucide-react"

import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"
import { PageContainer } from "@/shared/components/layout/PageContainer"

export default function AdminTransactionsPage() {
  return (
    <PageContainer>
      <div className="mb-7">
        <p className="text-sm font-semibold text-violet-600">Management</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Transactions</h2>
      </div>
      <ComingSoonState
        icon={ReceiptText}
        title="Transaction reporting is coming soon"
        description="Admin transaction endpoints are not available in the current backend contract. The page remains a clean integration boundary."
      />
    </PageContainer>
  )
}

