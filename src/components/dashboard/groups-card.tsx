import { Link } from "@tanstack/react-router"
import { cn } from "cn"
import { Users } from "lucide-react"
import { GROUP_COLOR_STYLES } from "@/components/badges"
import { CardHeading, cardRow } from "@/components/dashboard/card-parts"
import { Card } from "@/components/ui/card"
import { useCan, useUser } from "@/lib/use-user"
import type { DashboardData } from "./data"

/** How many groups the card lists before pointing to the full list. */
const GROUPS_SHOWN = 8

export function GroupsCard({ data }: { data: DashboardData }) {
  const user = useUser()
  const canEdit = useCan("coach")
  const isAdmin = useCan("admin")
  const mine = data.view === "mine"
  const shown = data.groups.slice(0, GROUPS_SHOWN)
  const more = data.groups.length - shown.length
  return (
    <Card className="gap-0 pb-0">
      <CardHeading title={mine ? "Your groups" : "Groups"} to="/groups" />
      {data.groups.length === 0 && (
        <p className="p-5 text-sm text-muted-foreground">
          No groups yet.
          {canEdit && (
            <>
              {" "}
              <Link to="/groups" className="text-primary underline">
                Create a group
              </Link>
            </>
          )}
        </p>
      )}
      {shown.map((g) => (
        <Link
          key={g.id}
          to="/groups/$groupId"
          params={{ groupId: String(g.id) }}
          className={cardRow}
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
              GROUP_COLOR_STYLES[g.color]?.pill ?? GROUP_COLOR_STYLES.sky?.pill
            )}
          >
            <Users className="size-4" strokeWidth={2.25} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold">{g.name}</span>
            <span className="truncate text-[13px] text-muted-foreground">
              <span className="tabular-nums">
                {g.member_count} gymnast{g.member_count === 1 ? "" : "s"}
              </span>
              {/* In "My groups" every coach is the user, so skip it. */}
              {!mine &&
                (g.primary_coach_name
                  ? ` · ${g.primary_coach_id === user?.id ? "You" : g.primary_coach_name}`
                  : isAdmin && " · No coach yet")}
            </span>
          </span>
        </Link>
      ))}
      {more > 0 && (
        <Link
          to="/groups"
          className={cn(
            cardRow,
            "justify-center py-3 text-[13px] font-semibold text-primary"
          )}
        >
          {more} more {more === 1 ? "group" : "groups"}
        </Link>
      )}
    </Card>
  )
}
