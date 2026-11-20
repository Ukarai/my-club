import * as React from "react"
import { useRouter } from "@tanstack/react-router"
import { Plus, Search } from "lucide-react"
import { addGroupMembers } from "@/server/functions/group-members"
import { FormError } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAction } from "@/lib/use-action"
import type { GroupData } from "./data"

export function AddMembers({ data }: { data: GroupData }) {
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
