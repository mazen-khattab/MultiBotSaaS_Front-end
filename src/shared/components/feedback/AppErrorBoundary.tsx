import { Component, type ReactNode } from "react"

import { Button } from "@/shared/ui/button"

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

// React render failures need a class boundary. API/query failures instead stay
// local to their feature and use ApiErrorAlert; they do not hide the whole app.
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    // The fallback deliberately has no dependency on the router, auth, or Query
    // providers, since a failure in one of those providers may have caused it.
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main role="alert" className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Something went wrong</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            We couldn’t display this page. Please try again.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button type="button" onClick={() => this.setState({ hasError: false })}>Try again</Button>
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>Reload page</Button>
          </div>
        </div>
      </main>
    )
  }
}
