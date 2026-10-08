import type { HTMLAttributes } from "react"

import { cn } from "@/shared/lib/utils"

export function PageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8", className)} {...props} />
}

