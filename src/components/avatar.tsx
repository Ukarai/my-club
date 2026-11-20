import { cn } from "cn"
import { CLUB } from "@/lib/club"

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}

const TINTS = [
  "bg-[#dbe8f8] text-[#0a4a8c]",
  "bg-[#e9e3fb] text-[#5634b8]",
  "bg-[#d9f3e2] text-[#17663a]",
  "bg-[#fcefc7] text-[#7c5100]",
  "bg-[#d5efef] text-[#0b6262]",
]

/** Initials in a tinted circle. `seed` (e.g. a gymnast id) keeps the tint stable. */
export function Avatar({
  name,
  seed,
  className,
}: {
  name: string
  seed?: number
  className?: string
}) {
  const key = seed ?? [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
        TINTS[key % TINTS.length],
        className
      )}
    >
      {initials(name)}
    </span>
  )
}

/** The club badge, cropped to a circle (the image has white corners). */
export function ClubLogo({ className }: { className?: string }) {
  return (
    <img
      src={CLUB.logo}
      alt={`${CLUB.name} ${CLUB.tagline} logo`}
      width={46}
      height={46}
      className={cn(
        "size-[46px] shrink-0 rounded-full bg-white object-cover shadow-[0_0_0_2px_rgb(255_255_255/0.18)]",
        className
      )}
    />
  )
}
