import { Link } from "@tanstack/react-router"
import { CardHeader, CardTitle } from "@/components/ui/card"

/** Rows inside a dashboard card: full-bleed, with a divider between them. */
export const cardRow =
  "flex items-center gap-3.5 border-b border-divider px-4 py-3.5 transition-colors last:border-b-0 hover:bg-[#f7f9fc] md:px-5"

/** A card header with its title and a "View all" link. */
export function CardHeading({
  title,
  to,
}: {
  title: string
  to: "/competitions" | "/groups" | "/gymnasts"
}) {
  return (
    <CardHeader className="grid-cols-[1fr_auto]">
      <CardTitle>{title}</CardTitle>
      <Link
        to={to}
        className="text-[13px] font-semibold text-primary hover:text-primary-dark"
      >
        View all
      </Link>
    </CardHeader>
  )
}
