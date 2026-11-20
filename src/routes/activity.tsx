import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { listActivity } from "@/server/functions/activity"
import { ActivityList } from "@/components/activity-list"
import { Button } from "@/components/ui/button"
import { EmptyState, NativeSelect } from "@/components/form"
import { ACTIVITY_PAGE_SIZE, hasRole } from "@/lib/domain"

type ActivitySearch = { who?: string; limit?: number }

export const Route = createFileRoute("/activity")({
  beforeLoad: ({ context }) => {
    if (!hasRole(context.user, "coach")) throw redirect({ to: "/" })
  },
  validateSearch: (s: Record<string, unknown>): ActivitySearch => {
    const limit = Number(s.limit)
    return {
      ...(typeof s.who === "string" && s.who && { who: s.who }),
      ...(Number.isInteger(limit) &&
        limit > ACTIVITY_PAGE_SIZE &&
        limit <= 1000 && { limit }),
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listActivity({ data: deps }),
  component: ActivityPage,
})

function ActivityPage() {
  const { rows, hasMore, people } = Route.useLoaderData()
  const { who, limit } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Activity</h1>
          <p className="text-sm text-muted-foreground">
            Every change made in the app, and who made it.
          </p>
        </div>
        <NativeSelect
          className="w-auto"
          aria-label="Whose activity to show"
          value={who ?? ""}
          onChange={(e) =>
            navigate({ search: { who: e.target.value || undefined } })
          }
        >
          <option value="">Everyone</option>
          {people.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={who ? `Nothing recorded for ${who}` : "Nothing recorded yet"}
        />
      ) : (
        <div className="surface px-4 py-3">
          <ActivityList rows={rows} showSubject />
        </div>
      )}

      {hasMore && (limit ?? ACTIVITY_PAGE_SIZE) < 1000 && (
        <Button
          variant="outline"
          className="self-center"
          onClick={() =>
            navigate({
              search: (s) => ({
                ...s,
                limit: Math.min(
                  (limit ?? ACTIVITY_PAGE_SIZE) + ACTIVITY_PAGE_SIZE,
                  1000
                ),
              }),
              resetScroll: false,
            })
          }
        >
          Show older
        </Button>
      )}
    </div>
  )
}
