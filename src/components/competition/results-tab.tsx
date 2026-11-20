import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState, FormError } from "@/components/form"
import { useCan } from "@/lib/use-user"
import { type CompetitionData, useEntryUpdate } from "./data"

export function ResultsTab({ data }: { data: CompetitionData }) {
  const upd = useEntryUpdate()
  const canEdit = useCan("admin")
  const active = data.entries.filter((e) => e.status !== "withdrawn")
  if (!active.length)
    return <EmptyState title="No entries to record results for" />

  const num = (v: string) => (v.trim() === "" ? null : Number(v))

  return (
    <div className="flex flex-col gap-3">
      <FormError error={upd.error} />
      <fieldset disabled={!canEdit} className="surface min-w-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gymnast</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-32">Total score</TableHead>
              <TableHead className="w-24">Placing</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.gymnast_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {e.category ?? "—"}
                </TableCell>
                <TableCell>
                  <Input
                    key={`s${e.score}`}
                    type="number"
                    step="0.001"
                    defaultValue={e.score ?? ""}
                    aria-label={`Score for ${e.gymnast_name}`}
                    onBlur={(ev) =>
                      num(ev.target.value) !== e.score &&
                      upd.run({ id: e.id, score: num(ev.target.value) })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    key={`p${e.placing}`}
                    type="number"
                    min="1"
                    defaultValue={e.placing ?? ""}
                    aria-label={`Placing for ${e.gymnast_name}`}
                    onBlur={(ev) =>
                      num(ev.target.value) !== e.placing &&
                      upd.run({ id: e.id, placing: num(ev.target.value) })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    key={`n${e.notes}`}
                    defaultValue={e.notes ?? ""}
                    placeholder="e.g. Fell on skill 7"
                    className="min-w-40"
                    aria-label={`Notes for ${e.gymnast_name}`}
                    onBlur={(ev) =>
                      ev.target.value !== (e.notes ?? "") &&
                      upd.run({ id: e.id, notes: ev.target.value })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        Results save when you leave each field.
      </p>
    </div>
  )
}
