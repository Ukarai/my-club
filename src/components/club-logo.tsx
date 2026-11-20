import { cn } from "cn"
import { CLUB } from "@/lib/club"

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
