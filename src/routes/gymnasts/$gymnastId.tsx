import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react"
import { cn } from "cn"
import {
  deleteGymnast,
  getGymnast,
  setGymnastActive,
} from "@/server/functions/gymnasts"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InjuryBadge } from "@/components/badges"
import { FormError, useAction } from "@/components/form"
import { GymnastDialog, useDialog } from "@/components/gymnast-form"
import { ageFrom } from "@/lib/domain"
import { useCan } from "@/lib/use-user"
import { GymnastGroups } from "@/components/gymnast/groups"
import { SkillsTab } from "@/components/gymnast/skills-tab"
import { NotesTab } from "@/components/gymnast/notes-tab"
import { TargetsTab } from "@/components/gymnast/targets-tab"
import { CompetitionsTab } from "@/components/gymnast/competitions-tab"
import { HistoryTab } from "@/components/gymnast/history-tab"

const TABS = ["skills", "notes", "targets", "competitions", "history"] as const
type Tab = (typeof TABS)[number]

export const Route = createFileRoute("/gymnasts/$gymnastId")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    TABS.includes(s.tab as Tab) ? { tab: s.tab as Tab } : {},
  loader: ({ params }) => getGymnast({ data: Number(params.gymnastId) }),
  component: GymnastPage,
})

function GymnastPage() {
  const data = Route.useLoaderData()
  const { tab = "skills" } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const router = useRouter()
  const edit = useDialog()
  const canEdit = useCan("coach")
  const isAdmin = useCan("admin")
  const g = data.gymnast
  const age = ageFrom(g.date_of_birth)
  const openInjuries = data.notes.filter(
    (n) => n.category === "injury" && !n.resolved
  )

  const archive = useAction(async () => {
    await setGymnastActive({ data: { id: g.id, active: !g.active } })
    await router.invalidate()
  })
  const remove = useAction(async () => {
    if (
      !confirm(
        `Permanently delete ${g.first_name} ${g.last_name} and all their skills, notes and targets? This can't be undone. (Archiving keeps their history.)`
      )
    )
      return
    await deleteGymnast({ data: g.id })
    await navigate({ to: "/gymnasts" })
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            to="/gymnasts"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Gymnasts
          </Link>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
            {g.first_name} {g.last_name}
            {openInjuries.length > 0 && <InjuryBadge />}
            {!g.active && (
              <span className="text-sm font-normal text-muted-foreground">
                (archived)
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[age !== null && `Age ${age}`, g.squad, g.level]
              .filter(Boolean)
              .join(" · ") || "No details yet"}
          </p>
          <GymnastGroups data={data} />
        </div>
        <div className={cn("flex gap-2", !canEdit && "hidden")}>
          <Button variant="outline" onClick={edit.show}>
            <Pencil /> Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => archive.run()}
            disabled={archive.pending}
          >
            {g.active ? <Archive /> : <ArchiveRestore />}
            {g.active ? "Archive" : "Restore"}
          </Button>
          {isAdmin && (
            <Button
              variant="destructive"
              size="icon"
              onClick={() => remove.run()}
              aria-label="Delete gymnast"
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>

      {(g.medical_info || g.guardian_contact) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {g.guardian_contact && (
            <div className="rounded-2xl bg-muted/60 p-3 text-sm">
              <div className="text-xs font-medium text-muted-foreground">
                Contact
              </div>
              {g.guardian_contact}
            </div>
          )}
          {g.medical_info && (
            <div className="rounded-2xl bg-amber-50 p-3 text-sm dark:bg-amber-950/40">
              <div className="text-xs font-medium text-amber-800 dark:text-amber-300">
                Medical
              </div>
              <p className="whitespace-pre-line">{g.medical_info}</p>
            </div>
          )}
        </div>
      )}

      <Tabs
        value={tab}
        onValueChange={(v) =>
          navigate({ search: { tab: v as Tab }, replace: true })
        }
      >
        <TabsList className="max-w-full overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="notes">
            Notes{data.notes.length > 0 && ` (${data.notes.length})`}
          </TabsTrigger>
          <TabsTrigger value="targets">
            Targets
            {data.targets.filter((t) => t.status === "active").length > 0 &&
              ` (${data.targets.filter((t) => t.status === "active").length})`}
          </TabsTrigger>
          <TabsTrigger value="competitions">Competitions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="skills" className="pt-4">
          <SkillsTab data={data} />
        </TabsContent>
        <TabsContent value="notes" className="pt-4">
          <NotesTab data={data} />
        </TabsContent>
        <TabsContent value="targets" className="pt-4">
          <TargetsTab data={data} />
        </TabsContent>
        <TabsContent value="competitions" className="pt-4">
          <CompetitionsTab data={data} />
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          <HistoryTab data={data} />
        </TabsContent>
      </Tabs>

      <FormError error={archive.error ?? remove.error} />
      <GymnastDialog
        open={edit.open}
        onOpenChange={edit.onOpenChange}
        gymnast={g}
      />
    </div>
  )
}

// ───────────────────────────── Groups ─────────────────────────────
