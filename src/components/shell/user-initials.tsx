import { initials } from "@/components/avatar"

export function UserInitials({
  name,
  className,
}: {
  name: string
  className: string
}) {
  return (
    <span
      aria-hidden
      className={
        "flex shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[13px] font-bold text-sidebar-primary-foreground " +
        className
      }
    >
      {initials(name)}
    </span>
  )
}
