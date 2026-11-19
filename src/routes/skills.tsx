import * as React from "react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { deleteSkill, listSkills, saveSkill } from "@/server/functions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Field,
  FormError,
  NativeSelect,
  formValues,
  useAction,
} from "@/components/form"
import { SKILL_CATEGORIES } from "@/lib/domain"
import { useCan } from "@/lib/use-user"

export const Route = createFileRoute("/skills")({
  loader: () => listSkills(),
  component: SkillsPage,
})

type SkillRow = Awaited<ReturnType<typeof listSkills>>[number]

function SkillsPage() {
  const skills = Route.useLoaderData()
  const router = useRouter()
  const isAdmin = useCan("admin")
  const [editing, setEditing] = React.useState<SkillRow | "new" | null>(null)
  const del = useAction(async (s: SkillRow) => {
    const msg =
      s.tracked > 0
        ? `Delete "${s.name}"? ${s.tracked} gymnast(s) have progress recorded for it, which will be removed too. This can't be undone.`
        : `Delete "${s.name}"?`
    if (!confirm(msg)) return
    await deleteSkill({ data: s.id })
    await router.invalidate()
  })

  const categories = [
    ...new Set([...SKILL_CATEGORIES, ...skills.map((s) => s.category)]),
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Skill catalogue</h1>
          <p className="text-sm text-muted-foreground">
            The skills your club tracks. Tariffs are starting values — check
            them against the current Code of Points.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setEditing("new")}>
            <Plus /> Add skill
          </Button>
        )}
      </div>
      <FormError error={del.error} />

      {categories.map((cat) => {
        const rows = skills.filter((s) => s.category === cat)
        if (!rows.length) return null
        return (
          <section key={cat} className="flex flex-col gap-2">
            <h2 className="font-medium">{cat}</h2>
            <div className="rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill</TableHead>
                    <TableHead className="w-20 text-right">Tariff</TableHead>
                    <TableHead className="w-32 text-right max-sm:hidden">
                      Gymnasts
                    </TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-normal">
                        <div className="font-medium">{s.name}</div>
                        {s.description && (
                          <div className="text-xs text-muted-foreground">
                            {s.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.tariff.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums max-sm:hidden">
                        {s.independent} / {s.tracked}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && (
                          <>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              aria-label={`Edit ${s.name}`}
                              onClick={() => setEditing(s)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              aria-label={`Delete ${s.name}`}
                              onClick={() => del.run(s)}
                            >
                              <Trash2 />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )
      })}
      <p className="text-xs text-muted-foreground">
        Gymnasts column: independent or in routine / any progress recorded.
      </p>

      <SkillDialog
        skill={editing === "new" ? undefined : (editing ?? undefined)}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        categories={categories}
      />
    </div>
  )
}

function SkillDialog({
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
