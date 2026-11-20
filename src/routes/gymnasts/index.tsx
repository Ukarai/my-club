import * as React from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { Plus, Search } from "lucide-react"
import { listGroups } from "@/server/functions/groups"
import { listGymnasts } from "@/server/functions/gymnasts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState, NativeSelect } from "@/components/form"
import { GroupDot, InjuryBadge } from "@/components/badges"
import { GymnastDialog, useDialog } from "@/components/gymnast-form"
import { ageFrom } from "@/lib/domain"
import { useCan } from "@/lib/use-user"

export const Route = createFileRoute("/gymnasts/")({
  // ?add=1 opens the "Add gymnast" dialog (used by the dashboard buttons).
  validateSearch: (
    s: Record<string, unknown>
  ): { group?: number; add?: boolean } => ({
    ...(Number(s.group) > 0 && { group: Number(s.group) }),
    ...((s.add === true || s.add === 1 || s.add === "1") && { add: true }),
  }),
  loader: async () => {
    const [gymnasts, groups] = await Promise.all([listGymnasts(), listGroups()])
    return { gymnasts, groups }
  },
  component: Gymnasts,
})

function Gymnasts() {
  const { gymnasts, groups } = Route.useLoaderData()
  const { group, add } = Route.useSearch()
  const navigate = useNavigate()
  const groupById = new Map(groups.map((gr) => [gr.id, gr]))
  const dialog = useDialog()
  const canEdit = useCan("coach")
  const { show } = dialog

  React.useEffect(() => {
    if (!add) return
    if (canEdit) show()
    void navigate({
      to: "/gymnasts",
      search: group ? { group } : {},
      replace: true,
    })
  }, [add, canEdit, group, navigate, show])
  const [query, setQuery] = React.useState("")
  const [squad, setSquad] = React.useState("")
  const [showArchived, setShowArchived] = React.useState(false)

  const squads = [
    ...new Set(gymnasts.map((g) => g.squad).filter(Boolean)),
  ] as string[]
  const q = query.toLowerCase()
  const visible = gymnasts.filter(
    (g) =>
      (showArchived || g.active) &&
      (!squad || g.squad === squad) &&
      (!group || g.group_ids.includes(group)) &&
      `${g.first_name} ${g.last_name} ${g.level ?? ""}`
        .toLowerCase()
        .includes(q)
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Gymnasts</h1>
        {canEdit && (
          <Button onClick={dialog.show}>
            <Plus /> Add gymnast
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-2 left-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or level"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <NativeSelect
          className="w-auto"
          value={squad}
          onChange={(e) => setSquad(e.target.value)}
          aria-label="Filter by squad"
        >
          <option value="">All squads</option>
          {squads.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </NativeSelect>
        {groups.length > 0 && (
          <NativeSelect
            className="w-auto"
            value={group ?? ""}
            onChange={(e) =>
              navigate({
                to: "/gymnasts",
                search: e.target.value ? { group: Number(e.target.value) } : {},
                replace: true,
              })
            }
            aria-label="Filter by group"
          >
            <option value="">All groups</option>
            {groups.map((gr) => (
              <option key={gr.id} value={gr.id}>
                {gr.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>

      {gymnasts.length === 0 ? (
        <EmptyState title="No gymnasts yet">
          <p>Add gymnasts to start tracking their skills and progress.</p>
        </EmptyState>
      ) : (
        <div className="surface overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="max-sm:hidden">Age</TableHead>
                <TableHead>Squad</TableHead>
                <TableHead className="max-md:hidden">Level</TableHead>
                <TableHead className="text-right">Skills</TableHead>
                <TableHead className="text-right max-sm:hidden">
                  Targets
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((g) => (
                <TableRow
                  key={g.id}
                  className={"cursor-pointer " + (g.active ? "" : "opacity-50")}
                  onClick={() =>
                    navigate({
                      to: "/gymnasts/$gymnastId",
                      params: { gymnastId: String(g.id) },
                    })
                  }
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        to="/gymnasts/$gymnastId"
                        params={{ gymnastId: String(g.id) }}
                        className="font-medium"
                      >
                        {g.first_name} {g.last_name}
                      </Link>
                      {g.open_injuries > 0 && <InjuryBadge />}
                      {!g.active && (
                        <span className="text-xs text-muted-foreground">
                          archived
                        </span>
                      )}
                      {g.group_ids.length > 0 && (
                        <span className="flex items-center gap-1">
                          {g.group_ids.map((id) => {
                            const gr = groupById.get(id)
                            return gr ? (
                              <span key={id} title={gr.name}>
                                <GroupDot color={gr.color} className="size-2" />
                                <span className="sr-only">{gr.name}</span>
                              </span>
                            ) : null
                          })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-sm:hidden">
                    {ageFrom(g.date_of_birth) ?? "—"}
                  </TableCell>
                  <TableCell>{g.squad ?? "—"}</TableCell>
                  <TableCell className="max-md:hidden">
                    {g.level ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span title="Independent or in routine">
                      {g.independent_count}
                    </span>
                    <span className="text-muted-foreground" title="Working on">
                      {" "}
                      / +{g.in_progress_count}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums max-sm:hidden">
                    {g.active_targets}
                  </TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    No gymnasts match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Skills column: independent or in routine / + still working on.
      </p>

      <GymnastDialog
        open={dialog.open}
        onOpenChange={dialog.onOpenChange}
        onSaved={(id) =>
          navigate({
            to: "/gymnasts/$gymnastId",
            params: { gymnastId: String(id) },
          })
        }
      />
    </div>
  )
}
