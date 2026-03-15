import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black dark:text-white transition-all duration-300 ease-in-out outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-gray-400 dark:placeholder:text-[#B0B0B0] focus:border-cyan-400 dark:focus:border-[#0AA3C8] dark:focus:ring-2 dark:focus:ring-[#0AA3C8]/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-white/5 disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-500/20",
        "dark:bg-[#111111] dark:border-[#2a2a2a] dark:hover:border-[#333333]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
