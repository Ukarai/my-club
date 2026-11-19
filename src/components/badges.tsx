import { cn } from "cn"
import {
  COMPETITION_STATUSES,
  ENTRY_STATUSES,
  NOTE_CATEGORIES,
  SKILL_STATUSES,
  labelFor,
} from "@/lib/domain"

const pill =
  "inline-flex h-5 w-fit shrink-0 items-center rounded-2xl px-2 text-xs font-medium whitespace-nowrap"

export const SKILL_STATUS_STYLES: Record<string, string> = {
  learning: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  with_support:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  without_support: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  independent:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  in_routine:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
}

export function SkillStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(pill, SKILL_STATUS_STYLES[status])}>
      {labelFor(SKILL_STATUSES, status)}
    </span>
  )
}

const NOTE_STYLES: Record<string, string> = {
  general: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  injury: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  coaching: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  achievement:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
}

export function NoteCategoryBadge({ category }: { category: string }) {
  return (
    <span className={cn(pill, NOTE_STYLES[category])}>
      {labelFor(NOTE_CATEGORIES, category)}
    </span>
  )
}

const COMP_STYLES: Record<string, string> = {
  planning: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  entries_open:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  entries_closed:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  completed:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
}

export function CompetitionStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(pill, COMP_STYLES[status])}>
      {labelFor(COMPETITION_STATUSES, status)}
    </span>
  )
}

const ENTRY_STYLES: Record<string, string> = {
  invited: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  entered: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  confirmed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  withdrawn: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
}

export function EntryStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(pill, ENTRY_STYLES[status])}>
      {labelFor(ENTRY_STATUSES, status)}
    </span>
  )
}

export function InjuryBadge() {
  return (
    <span
      className={cn(
        pill,
        "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
      )}
    >
      Injury
    </span>
  )
}

/** Dot + text colours for each group colour (full class names so Tailwind sees them). */
export const GROUP_COLOR_STYLES: Partial<
  Record<string, { dot: string; pill: string }>
> = {
  sky: {
    dot: "bg-sky-500",
    pill: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  emerald: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  amber: {
    dot: "bg-amber-500",
    pill: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  rose: {
    dot: "bg-rose-500",
    pill: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  },
  violet: {
    dot: "bg-violet-500",
    pill: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  },
  teal: {
    dot: "bg-teal-500",
    pill: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  },
  orange: {
    dot: "bg-orange-500",
    pill: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  },
  slate: {
    dot: "bg-slate-500",
    pill: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  },
}

export function GroupDot({
  color,
  className,
}: {
  color: string
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full",
        GROUP_COLOR_STYLES[color]?.dot ?? "bg-sky-500",
        className
      )}
    />
  )
}

export function GroupBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className={cn(
        pill,
        "gap-1.5",
        GROUP_COLOR_STYLES[color]?.pill ?? GROUP_COLOR_STYLES.sky?.pill
      )}
    >
      <GroupDot color={color} className="size-1.5" />
      {name}
    </span>
  )
}
