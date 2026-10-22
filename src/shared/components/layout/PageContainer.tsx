import type { HTMLAttributes } from "react"

import { cn } from "@/shared/lib/utils"

export function PageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("page-container mx-auto min-w-0 w-full p-4 sm:p-6 lg:p-8", className)} {...props} />
}

