import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** API üzerinden sunulan statik yol (ör. /images/...) için tam URL. */
export function resolveApiAssetUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null
  const trimmed = path.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
    const origin = new URL(apiBase).origin
    const p = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
    return `${origin}${p}`
  } catch {
    const p = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
    return p
  }
}
