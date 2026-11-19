import * as React from "react"
import { Link, useRouter } from "@tanstack/react-router"
import { Plus, Trash2 } from "lucide-react"
import { cn } from "cn"
import { addEntries, removeEntry } from "@/server/functions/competitions"
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
import {
  EmptyState,
  Field,
  FormError,
  NativeSelect,
  formValues,
  useAction,
} from "@/components/form"
import { ENTRY_STATUSES, type Entry } from "@/lib/domain"
import { useCan } from "@/lib/use-user"
import { type CompetitionData, useEntryUpdate } from "./data"

export function EntriesTab({ data }: { data: CompetitionData }) {
  const router = useRouter()
  const canEdit = useCan("admin")
  const upd = useEntryUpdate()
  const [selected, setSelected] = React.useState<number[]>([])
  const entered = new Set(data.entries.map((e) => e.gymnast_id))
  const available = data.gymnasts.filter((g) => !entered.has(g.id))

  const add = useAction(async (form: HTMLFormElement) => {
    if (!selected.length) throw new Error("Pick at least one gymnast")
    await addEntries({
      data: {
        competitionId: data.competition.id,
        gymnastIds: selected,
        category: formValues(form).category,
      },
    })
    setSelected([])
    form.reset()
    await router.invalidate()
  })
  const del = useAction(async (e: Entry) => {
    if (
      !confirm(
        `Remove ${e.gymnast_name} from this competition (including their routines and result)?`
      )
    )
      return
    await removeEntry({ data: e.id })
    await router.invalidate()
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="flex flex-col gap-3 overflow-hidden">
        <FormError error={upd.error ?? del.error} />
        {data.entries.length === 0 ? (
          <EmptyState title="No entries yet">
            {canEdit && <p>Choose gymnasts on the right to enter them.</p>}
          </EmptyState>
        ) : (
          <fieldset
            disabled={!canEdit}
            className="min-w-0 overflow-x-auto rounded-2xl border"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gymnast</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fee paid</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entries.map((e) => (
                  <TableRow
                    key={e.id}
                    className={e.status === "withdrawn" ? "opacity-50" : ""}
                  >
                    <TableCell>
                      <Link
                        to="/gymnasts/$gymnastId"
                        params={{ gymnastId: String(e.gymnast_id) }}
                        className="font-medium hover:underline"
                      >
                        {e.gymnast_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Input
                        key={e.category}
                        defaultValue={e.category ?? ""}
                        placeholder="Age group / level"
                        className="min-w-36"
                        aria-label={`Category for ${e.gymnast_name}`}
                        onBlur={(ev) =>
                          ev.target.value !== (e.category ?? "") &&
                          upd.run({ id: e.id, category: ev.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <NativeSelect
                        value={e.status}
                        className="min-w-28"
                        aria-label={`Status for ${e.gymnast_name}`}
                        onChange={(ev) =>
                          upd.run({ id: e.id, status: ev.target.value })
                        }
                      >
                        {ENTRY_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={!!e.fee_paid}
                        aria-label={`Fee paid for ${e.gymnast_name}`}
                        onChange={(ev) =>
                          upd.run({ id: e.id, fee_paid: ev.target.checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Remove ${e.gymnast_name}`}
                        onClick={() => del.run(e)}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </fieldset>
        )}
      </div>

      <Card size="sm" className={cn("self-start", !canEdit && "hidden")}>
        <CardHeader>
          <CardTitle>Add gymnasts</CardTitle>
        </CardHeader>
        <CardContent>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every active gymnast is already entered.
            </p>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(ev) => {
                ev.preventDefault()
                add.run(ev.currentTarget)
              }}
            >
              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-xl border p-2">
                {available.map((g) => (
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
              <Field label="Category (optional)" htmlFor="category">
                <Input
                  id="category"
                  name="category"
                  placeholder="e.g. Regional 2 — 13-14"
                />
              </Field>
              <FormError error={add.error} />
              <Button type="submit" disabled={add.pending || !selected.length}>
                <Plus /> Enter {selected.length || ""} gymnast
                {selected.length === 1 ? "" : "s"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ───────────────────────────── Routines ─────────────────────────────
