import * as React from "react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { deleteSkill, listSkills } from "@/server/functions/skills"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FormError } from "@/components/form"
import { useAction } from "@/lib/use-action"
import { SKILL_CATEGORIES } from "@/lib/domain"
import { useCan } from "@/lib/use-user"
import type { SkillRow } from "@/components/skill/data"
import { SkillDialog } from "@/components/skill/skill-dialog"

export const Route = createFileRoute("/skills")({
  loader: () => listSkills(),
  component: SkillsPage,
})

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
            <div className="surface overflow-hidden">
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
