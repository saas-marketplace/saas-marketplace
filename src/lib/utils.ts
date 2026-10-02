import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatTnd } from "@/lib/money"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Prices are stored and charged in TND — never converted for display. */
export function formatPrice(price: number): string {
  return formatTnd(price)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date))
}
