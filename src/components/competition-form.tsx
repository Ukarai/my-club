import { useRouter } from "@tanstack/react-router"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FormError, NativeSelect, formValues, useAction } from "@/components/form"
import { saveCompetition } from "@/server/functions/competitions"
import { COMPETITION_STATUSES, type Competition } from "@/lib/domain"

export function CompetitionDialog({
  open,
  onOpenChange,
  competition,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  competition?: Competition
  onSaved?: (id: number) => void
}) {
  const router = useRouter()
  const c = competition
  const save = useAction(async (form: HTMLFormElement) => {
    const v = formValues(form)
    const id = await saveCompetition({
      data: {
        id: c?.id,
        name: v.name,
        start_date: v.start_date,
        end_date: v.end_date,
        venue: v.venue,
        organiser: v.organiser,
        level: v.level,
        entry_deadline: v.entry_deadline,
        entry_fee: v.entry_fee ? Number(v.entry_fee) : null,
        status: v.status,
        notes: v.notes,
      },
    })
    await router.invalidate()
    onOpenChange(false)
    onSaved?.(id)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{c ? "Edit competition" : "New competition"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            save.run(e.currentTarget)
          }}
        >
          <Field label="Name" htmlFor="name" className="sm:col-span-2">
            <Input id="name" name="name" required defaultValue={c?.name} />
          </Field>
          <Field label="Start date" htmlFor="start_date">
            <Input id="start_date" name="start_date" type="date" required defaultValue={c?.start_date} />
          </Field>
          <Field label="End date (if multi-day)" htmlFor="end_date">
            <Input id="end_date" name="end_date" type="date" defaultValue={c?.end_date ?? ""} />
          </Field>
          <Field label="Venue" htmlFor="venue">
            <Input id="venue" name="venue" defaultValue={c?.venue ?? ""} />
          </Field>
          <Field label="Organiser" htmlFor="organiser">
            <Input id="organiser" name="organiser" defaultValue={c?.organiser ?? ""} />
          </Field>
          <Field label="Level" htmlFor="level">
            <Input id="level" name="level" placeholder="Club, Regional, National…" defaultValue={c?.level ?? ""} />
          </Field>
          <Field label="Status" htmlFor="status">
            <NativeSelect id="status" name="status" defaultValue={c?.status ?? "planning"}>
              {COMPETITION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Entry deadline" htmlFor="entry_deadline">
            <Input id="entry_deadline" name="entry_deadline" type="date" defaultValue={c?.entry_deadline ?? ""} />
          </Field>
          <Field label="Entry fee (per gymnast)" htmlFor="entry_fee">
            <Input id="entry_fee" name="entry_fee" type="number" step="0.01" min="0" defaultValue={c?.entry_fee ?? ""} />
          </Field>
          <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
            <Textarea id="notes" name="notes" placeholder="Timings, travel, kit…" defaultValue={c?.notes ?? ""} />
          </Field>
          <div className="sm:col-span-2">
            <FormError error={save.error} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.pending}>
              {save.pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
