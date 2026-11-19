import { useRouter } from "@tanstack/react-router"
import { cn } from "cn"
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
import { GROUP_COLOR_STYLES } from "@/components/badges"
import { saveGroup } from "@/server/functions/groups"
import { GROUP_COLORS, type Group } from "@/lib/domain"

export function GroupDialog({
  open,
  onOpenChange,
  group,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: Group
  onSaved?: (id: number) => void
}) {
  const router = useRouter()
  const save = useAction(async (form: HTMLFormElement) => {
    const v = formValues(form)
    const id = await saveGroup({
      data: {
        id: group?.id,
        name: v.name,
        description: v.description,
        color: v.color,
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
          <DialogTitle>{group ? "Edit group" : "New group"}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save.run(e.currentTarget)
          }}
        >
          <Field label="Name" htmlFor="group-name">
            <Input
              id="group-name"
              name="name"
              required
              placeholder="e.g. Tuesday 5pm, Regional squad"
              defaultValue={group?.name}
            />
          </Field>
          <Field label="Description (optional)" htmlFor="group-description">
            <Textarea
              id="group-description"
              name="description"
              placeholder="When they train, who coaches them, what it's for…"
              defaultValue={group?.description ?? ""}
            />
          </Field>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {GROUP_COLORS.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={c}
                    defaultChecked={(group?.color ?? "sky") === c}
                    className="peer sr-only"
                    aria-label={c}
                  />
                  <span
                    className={cn(
                      "block size-7 rounded-full ring-offset-2 ring-offset-background peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                      GROUP_COLOR_STYLES[c]?.dot
                    )}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <FormError error={save.error} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
