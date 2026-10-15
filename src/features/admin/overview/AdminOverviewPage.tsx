import { Link } from "react-router-dom"

import { routePaths } from "@/app/router/routePaths"
import { AdminPage, AdminUnavailable } from "@/features/admin/shared/AdminPage"

/** Link to available management areas without fabricating aggregate metrics. */
export default function AdminOverviewPage() {
  return <AdminPage title="Control center" description="Manage regular users, bots and UserBot access with your administrative session.">
    <div className="grid gap-4 sm:grid-cols-3">
      {[
        { title: "Users", href: routePaths.adminUsers, detail: "Profiles and account access" },
        { title: "Bots", href: routePaths.adminBots, detail: "Metadata and catalog availability" },
        { title: "Subscriptions", href: routePaths.adminSubscriptions, detail: "UserBot access assignments" },
      ].map((item) => <Link key={item.title} to={item.href} className="rounded-2xl border bg-white p-5 shadow-sm hover:bg-violet-50">
        <h3 className="font-semibold">{item.title}</h3><p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
      </Link>)}
    </div>
    <AdminUnavailable>No Admin overview or aggregate metrics API exists. Platform totals and KPIs are unavailable.</AdminUnavailable>
    <AdminUnavailable>No Admin system configuration API exists. Regular-user settings do not configure the platform.</AdminUnavailable>
  </AdminPage>
}
