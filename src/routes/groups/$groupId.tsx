import * as React from "react"
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { cn } from "cn"
import {
  addGroupMembers,
  deleteGroup,
  getGroup,
  removeGroupMember,
} from "@/server/functions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { GroupDot, InjuryBadge } from "@/components/badges"
import { EmptyState, FormError, useAction } from "@/components/form"
import { GroupDialog } from "@/components/group-form"
import { useDialog } from "@/components/gymnast-form"
import { ageFrom } from "@/lib/domain"
import { useCan } from "@/lib/use-user"

export const Route = createFileRoute("/groups/$groupId")({
  loader: ({ params }) => getGroup({ data: Number(params.groupId) }),
  component: GroupPage,
})

type Data = Awaited<ReturnType<typeof getGroup>>

function GroupPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const edit = useDialog()
  const canEdit = useCan("coach")
  const g = data.group
  const active = data.members.filter((m) => m.active)
  const archived = data.members.length - active.length

  const remove = useAction(async () => {
    if (
      !confirm(
        `Delete the group "${g.name}"? The gymnasts in it are not affected.`
      )
    )
      return
    await deleteGroup({ data: g.id })
    await navigate({ to: "/groups" })
  })

  const removeMember = useAction(async (gymnastId: number) => {
    await removeGroupMember({ data: { groupId: g.id, gymnastId } })
    await router.invalidate()
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            to="/groups"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Groups
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <GroupDot color={g.color} className="size-3" />
            <span className="min-w-0 break-words">{g.name}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {active.length} gymnast{active.length === 1 ? "" : "s"}
            {archived > 0 && ` · ${archived} archived`}
          </p>
          {g.description && (
            <p className="max-w-prose text-sm whitespace-pre-wrap">
              {g.description}
            </p>
          )}
        </div>
        <div className={cn("flex gap-2", !canEdit && "hidden")}>
          <Button variant="outline" onClick={edit.show}>
            <Pencil /> Edit
          </Button>
          <Button
            variant="destructive"
            size="icon"
            aria-label="Delete group"
            onClick={() => remove.run()}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <FormError error={remove.error ?? removeMember.error} />

      <div
        className={cn(
          "grid items-start gap-6",
          canEdit && "lg:grid-cols-[minmax(0,1fr)_20rem]"
        )}
      >
        {data.members.length === 0 ? (
          <EmptyState title="No gymnasts in this group yet">
            {canEdit && "Pick gymnasts from the list to add them."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="max-sm:hidden">Squad</TableHead>
                  <TableHead className="max-sm:hidden">Level</TableHead>
                  <TableHead className="text-right">Skills</TableHead>
                  <TableHead className="text-right max-sm:hidden">
                    Targets
                  </TableHead>
                  {canEdit && (
                    <TableHead>
                      <span className="sr-only">Remove</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.members.map((m) => (
                  <TableRow
                    key={m.id}
                    className={cn(!m.active && "text-muted-foreground")}
                  >
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to="/gymnasts/$gymnastId"
                          params={{ gymnastId: String(m.id) }}
                          className="font-medium hover:underline"
                        >
                          {m.first_name} {m.last_name}
                        </Link>
                        {m.open_injuries > 0 && <InjuryBadge />}
                        {!m.active && (
                          <span className="text-xs">(archived)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {ageFrom(m.date_of_birth) ?? "—"}
                    </TableCell>
                    <TableCell className="max-sm:hidden">
                      {m.squad ?? "—"}
                    </TableCell>
                    <TableCell className="max-sm:hidden">
                      {m.level ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.independent_count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums max-sm:hidden">
                      {m.active_targets}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="w-0 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${m.first_name} ${m.last_name} from group`}
                          disabled={removeMember.pending}
                          onClick={() => removeMember.run(m.id)}
                        >
                          <X />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {canEdit && <AddMembers data={data} />}
      </div>

      <GroupDialog
        open={edit.open}
        onOpenChange={edit.onOpenChange}
        group={g}
      />
    </div>
  )
}

function AddMembers({ data }: { data: Data }) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<number[]>([])
  const [query, setQuery] = React.useState("")
  const memberIds = new Set(data.members.map((m) => m.id))
  const available = data.gymnasts.filter((g) => !memberIds.has(g.id))
  const q = query.trim().toLowerCase()
  const shown = available.filter(
    (g) =>
      !q ||
      `${g.first_name} ${g.last_name} ${g.squad ?? ""}`
        .toLowerCase()
        .includes(q)
  )

  const add = useAction(async () => {
    await addGroupMembers({
      data: { groupId: data.group.id, gymnastIds: selected },
    })
    setSelected([])
    setQuery("")
    await router.invalidate()
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Add gymnasts</CardTitle>
      </CardHeader>
      <CardContent>
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Every active gymnast is already in this group.
          </p>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(ev) => {
              ev.preventDefault()
              add.run()
            }}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search gymnasts"
                aria-label="Search gymnasts to add"
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-xl border p-2">
              {shown.length === 0 && (
                <p className="px-1 py-0.5 text-sm text-muted-foreground">
                  No matches.
                </p>
              )}
              {shown.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center gap-2 rounded-lg px-1 py-0.5 text-sm hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(g.id)}
                    onChange={(ev) =>
                      setSelected((s) =>
                        ev.target.checked
                          ? [...s, g.id]
                          : s.filter((x) => x !== g.id)
                      )
                    }
                  />
                  {g.first_name} {g.last_name}
                  {g.squad && (
                    <span className="text-xs text-muted-foreground">
                      {g.squad}
                    </span>
                  )}
                </label>
              ))}
            </div>
            <FormError error={add.error} />
            <Button type="submit" disabled={add.pending || !selected.length}>
              <Plus /> Add {selected.length || ""} gymnast
              {selected.length === 1 ? "" : "s"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
