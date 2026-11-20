import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { listCoaches, listGroups } from "@/server/functions/groups"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/form"
import { GroupDot } from "@/components/badges"
import { GroupDialog } from "@/components/group-form"
import { useDialog } from "@/components/gymnast-form"
import { hasRole } from "@/lib/domain"
import { useCan, useUser } from "@/lib/use-user"

export const Route = createFileRoute("/groups/")({
  loader: async ({ context }) => {
    const [groups, coaches] = await Promise.all([
      listGroups(),
      hasRole(context.user, "admin") ? listCoaches() : undefined,
    ])
    return { groups, coaches }
  },
  component: Groups,
})

function Groups() {
  const { groups, coaches } = Route.useLoaderData()
  const navigate = useNavigate()
  const dialog = useDialog()
  const user = useUser()
  const canEdit = useCan("coach")
  const isAdmin = useCan("admin")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Groups</h1>
          <p className="text-sm text-muted-foreground">
            Training sessions, squads, competition teams — any set of gymnasts
            you want to see together. A gymnast can be in several groups.
          </p>
        </div>
        {canEdit && (
          <Button onClick={dialog.show}>
            <Plus /> New group
          </Button>
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyState title="No groups yet">
          {canEdit
            ? "Create a group, then add gymnasts to it."
            : "A coach can create groups of gymnasts."}
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link
              key={g.id}
              to="/groups/$groupId"
              params={{ groupId: String(g.id) }}
              className="surface flex flex-col gap-1 p-4 hover:bg-[#f6f8fb]"
            >
              <div className="flex items-center gap-2 font-medium">
                <GroupDot color={g.color} />
                <span className="min-w-0 truncate">{g.name}</span>
              </div>
              {g.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {g.description}
                </p>
              )}
              <div className="mt-auto flex flex-wrap justify-between gap-x-3 gap-y-0.5 pt-1 text-sm">
                <span className="tabular-nums">
                  {g.member_count} gymnast{g.member_count === 1 ? "" : "s"}
                </span>
                {g.primary_coach_name ? (
                  <span className="min-w-0 truncate text-muted-foreground">
                    Coach:{" "}
                    <span className="font-medium text-foreground">
                      {g.primary_coach_id === user?.id
                        ? "You"
                        : g.primary_coach_name}
                    </span>
                  </span>
                ) : (
                  isAdmin && (
                    <span className="text-muted-foreground">No coach yet</span>
                  )
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <GroupDialog
        open={dialog.open}
        onOpenChange={dialog.onOpenChange}
        coaches={coaches}
        onSaved={(id) =>
          navigate({
            to: "/groups/$groupId",
            params: { groupId: String(id) },
          })
        }
      />
    </div>
  )
}
