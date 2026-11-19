import * as React from "react"
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
import { Field, FormError, formValues, useAction } from "@/components/form"
import { saveGymnast } from "@/server/functions/gymnasts"
import type { Gymnast } from "@/lib/domain"

export function GymnastDialog({
  open,
  onOpenChange,
  gymnast,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  gymnast?: Gymnast
  onSaved?: (id: number) => void
}) {
  const router = useRouter()
  const save = useAction(async (form: HTMLFormElement) => {
    const v = formValues(form)
    const id = await saveGymnast({
      data: {
        id: gymnast?.id,
        first_name: v.first_name,
        last_name: v.last_name,
        date_of_birth: v.date_of_birth,
        squad: v.squad,
        level: v.level,
        guardian_contact: v.guardian_contact,
        medical_info: v.medical_info,
      },
    })
    await router.invalidate()
    onOpenChange(false)
    onSaved?.(id)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{gymnast ? "Edit gymnast" : "Add gymnast"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            save.run(e.currentTarget)
          }}
        >
          <Field label="First name" htmlFor="first_name">
            <Input id="first_name" name="first_name" required defaultValue={gymnast?.first_name} />
          </Field>
          <Field label="Last name" htmlFor="last_name">
            <Input id="last_name" name="last_name" required defaultValue={gymnast?.last_name} />
          </Field>
          <Field label="Date of birth" htmlFor="date_of_birth">
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              defaultValue={gymnast?.date_of_birth ?? ""}
            />
          </Field>
          <Field label="Squad / group" htmlFor="squad">
            <Input
              id="squad"
              name="squad"
              placeholder="e.g. Performance"
              defaultValue={gymnast?.squad ?? ""}
            />
          </Field>
          <Field label="Level / grade" htmlFor="level" className="sm:col-span-2">
            <Input
              id="level"
              name="level"
              placeholder="e.g. Proficiency 5, Regional 2"
              defaultValue={gymnast?.level ?? ""}
            />
          </Field>
          <Field label="Parent / guardian contact" htmlFor="guardian_contact" className="sm:col-span-2">
            <Input
              id="guardian_contact"
              name="guardian_contact"
              defaultValue={gymnast?.guardian_contact ?? ""}
            />
          </Field>
          <Field label="Medical information" htmlFor="medical_info" className="sm:col-span-2">
            <Textarea
              id="medical_info"
              name="medical_info"
              placeholder="Allergies, conditions, medication…"
              defaultValue={gymnast?.medical_info ?? ""}
            />
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

export function useDialog() {
  const [open, setOpen] = React.useState(false)
  return { open, onOpenChange: setOpen, show: () => setOpen(true) }
}
