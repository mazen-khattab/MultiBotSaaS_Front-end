import { Bot } from "lucide-react"
import { Outlet } from "react-router-dom"

import { APP_NAME, APP_TAGLINE } from "@/core/constants/app"

export default function AuthLayout() {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(26rem,0.8fr)]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 18% 18%, rgba(59,130,246,.34), transparent 32%), radial-gradient(circle at 78% 76%, rgba(14,165,233,.2), transparent 30%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-blue-500">
            <Bot className="size-6" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight">{APP_NAME}</span>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
            {APP_TAGLINE}
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Build a calmer, more capable operation.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            One focused workspace for automation bots, operations, and the people who run them.
          </p>
        </div>
        <p className="relative text-xs text-slate-500">Secure workspace access</p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-background p-5 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Bot className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
          </div>
          <Outlet />
        </div>
      </section>
    </main>
  )
}

