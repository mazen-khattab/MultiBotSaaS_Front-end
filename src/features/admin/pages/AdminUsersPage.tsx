import { Users } from "lucide-react"

import { ComingSoonState } from "@/shared/components/feedback/ComingSoonState"
import { PageContainer } from "@/shared/components/layout/PageContainer"

export default function AdminUsersPage() {
  return (
    <PageContainer>
      <div className="mb-7">
        <p className="text-sm font-semibold text-violet-600">Management</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Users</h2>
      </div>
      <ComingSoonState
        icon={Users}
        title="User management is coming soon"
        description="No admin user management endpoints are present in the backend contract. This route is ready for the later integration."
      />
    </PageContainer>
  )
}

