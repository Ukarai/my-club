import { useRouter } from "@tanstack/react-router"
import { saveSkill } from "@/server/functions/skills"
import { Field, FormError, NativeSelect, formValues } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAction } from "@/lib/use-action"
import type { SkillRow } from "./data"

export function SkillDialog({
  skill,
  open,
  onOpenChange,
  categories,
}: {
  skill?: SkillRow
  open: boolean
  onOpenChange: (o: boolean) => void
  categories: string[]
}) {
  const router = useRouter()
  const save = useAction(async (form: HTMLFormElement) => {
    const v = formValues(form)
    await saveSkill({
      data: {
        id: skill?.id,
        name: v.name,
        category: v.new_category.trim() || v.category,
        tariff: Number(v.tariff),
        description: v.description,
      },
    })
    await router.invalidate()
    onOpenChange(false)
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{skill ? "Edit skill" : "Add skill"}</DialogTitle>
        </DialogHeader>
        <form
          key={skill?.id ?? "new"}
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            save.run(e.currentTarget)
          }}
        >
          <Field label="Name" htmlFor="name">
            <Input id="name" name="name" required defaultValue={skill?.name} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" htmlFor="category">
              <NativeSelect
                id="category"
                name="category"
                defaultValue={skill?.category ?? categories[0]}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Tariff (DD)" htmlFor="tariff">
              <Input
                id="tariff"
                name="tariff"
                type="number"
                step="0.1"
                min="0"
                defaultValue={skill?.tariff ?? 0}
              />
            </Field>
          </div>
          <Field label="…or new category" htmlFor="new_category">
            <Input
              id="new_category"
              name="new_category"
              placeholder="Leave blank to use the one above"
            />
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              defaultValue={skill?.description ?? ""}
            />
          </Field>
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
