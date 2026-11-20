import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react"
import { cn } from "cn"
import {
  deleteGymnast,
  getGymnast,
  setGymnastActive,
} from "@/server/functions/gymnasts"
import { Button } from "@/components/ui/button"
import {
  TabCount,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { InjuryBadge, SKILL_STATUS_STYLES } from "@/components/badges"
import { Avatar } from "@/components/avatar"
import { FormError, useAction } from "@/components/form"
import { GymnastDialog, useDialog } from "@/components/gymnast-form"
import { SKILL_STATUSES, ageFrom } from "@/lib/domain"
import { useCan } from "@/lib/use-user"
import { GymnastGroups } from "@/components/gymnast/groups"
import { SkillsTab } from "@/components/gymnast/skills-tab"
import { NotesTab } from "@/components/gymnast/notes-tab"
import { TargetsTab } from "@/components/gymnast/targets-tab"
import { CompetitionsTab } from "@/components/gymnast/competitions-tab"
import { HistoryTab } from "@/components/gymnast/history-tab"
import type { GymnastData } from "@/components/gymnast/data"

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

  const activeTargets = data.targets.filter((t) => t.status === "active")

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/gymnasts"
        className="-mb-1 inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark"
      >
        <ChevronLeft className="size-4" /> Gymnasts
      </Link>

      <section className="overflow-hidden rounded-2xl bg-card shadow-[0_1px_2px_rgb(11_31_61/0.06)] ring-1 ring-border">
        <div className="flex flex-wrap items-center gap-4 p-4 md:gap-5 md:px-6 md:py-[22px]">
          <Avatar
            name={`${g.first_name} ${g.last_name}`}
            seed={g.id}
            className="size-14 text-xl font-extrabold md:size-16 md:text-[22px]"
          />
          <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
            <h1 className="flex flex-wrap items-center gap-2 text-[22px] font-extrabold tracking-[-0.02em] md:text-[26px]">
              {g.first_name} {g.last_name}
              {openInjuries.length > 0 && <InjuryBadge />}
              {!g.active && (
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-[#364660]">
                  Archived
                </span>
              )}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {age !== null
                  ? `Age ${age}`
                  : !g.squad && !g.level && "No details yet"}
              </span>
              {g.squad && (
                <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary-dark">
                  {g.squad}
                </span>
              )}
              {g.level && (
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-[#364660]">
                  {g.level}
                </span>
              )}
              <GymnastGroups data={data} />
            </div>
          </div>
          <div className={cn("flex flex-wrap gap-2", !canEdit && "hidden")}>
            <Button
              variant="outline"
              className="h-10 px-3.5 font-semibold"
              onClick={edit.show}
            >
              <Pencil /> Edit
            </Button>
            <Button
              variant="outline"
              className="h-10 px-3.5 font-semibold"
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
                className="size-10 border-[#f1c4bf] bg-[#fff4f2] text-[#b42318] hover:bg-[#fde3e1]"
                onClick={() => remove.run()}
                aria-label="Delete gymnast"
              >
                <Trash2 />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4 border-t border-card-header-border bg-card-header px-4 py-4 md:px-6">
          {g.guardian_contact && (
            <div className="flex flex-[1_1_220px] flex-col gap-1">
              <span className={stripLabel}>Contact</span>
              <span className="flex items-start gap-2 text-sm text-[#17253b]">
                <Phone className="mt-0.5 size-[15px] shrink-0 text-primary" />
                {g.guardian_contact}
              </span>
            </div>
          )}
          {g.medical_info && (
            <div className="flex flex-[1_1_220px] flex-col gap-1">
              <span className={cn(stripLabel, "text-[#7c5100]")}>Medical</span>
              <p className="rounded-lg border border-[#f3dc9a] bg-[#fdf6e3] px-2.5 py-1.5 text-sm whitespace-pre-line text-[#3d2b00]">
                {g.medical_info}
              </p>
            </div>
          )}
          <SkillsProgress data={data} />
        </div>
      </section>

      <Tabs
        value={tab}
        onValueChange={(v) =>
          navigate({ search: { tab: v as Tab }, replace: true })
        }
      >
        <TabsList aria-label="Gymnast sections">
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="notes">
            Notes <TabCount n={data.notes.length} />
          </TabsTrigger>
          <TabsTrigger value="targets">
            Targets <TabCount n={activeTargets.length} />
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

const stripLabel =
  "text-[11px] font-bold tracking-[0.07em] text-muted-foreground uppercase"

/** Stacked bar of how many catalogue skills are at each status. */
function SkillsProgress({ data }: { data: GymnastData }) {
  const total = data.skills.length
  // Most advanced first, so the bar fills from the left with the best work.
  const counts = [...SKILL_STATUSES].reverse().map((st) => ({
    ...st,
    n: data.gymnastSkills.filter((x) => x.status === st.value).length,
  }))
  const started = counts.reduce((sum, c) => sum + c.n, 0)
  const summary = [
    ...counts.filter((c) => c.n).map((c) => `${c.n} ${c.label.toLowerCase()}`),
    `${total - started} not started`,
  ].join(", ")

  return (
    <div className="flex flex-[3_1_360px] flex-col gap-2">
      <div className="flex justify-between gap-3">
        <span className={stripLabel}>Skills progress</span>
        <span className="text-[13px] text-muted-foreground">
          <strong className="text-foreground">{started}</strong> of {total}{" "}
          started
        </span>
      </div>
      <div
        role="img"
        aria-label={summary}
        className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-[#d9e1ec]"
      >
        {total > 0 &&
          counts.map(
            (c) =>
              c.n > 0 && (
                <span
                  key={c.value}
                  className={SKILL_STATUS_STYLES[c.value].dot}
                  style={{ width: `${(c.n / total) * 100}%` }}
                />
              )
          )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#364660]">
        {counts.map((c) => (
          <span
            key={c.value}
            className="inline-flex items-center gap-1.5"
            title={c.hint}
          >
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-[2px]",
                SKILL_STATUS_STYLES[c.value].dot
              )}
            />
            {c.label} <strong className="text-foreground">{c.n}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}
