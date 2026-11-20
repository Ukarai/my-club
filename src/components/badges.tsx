import type * as React from "react"
import { cn } from "cn"
import {
  COMPETITION_STATUSES,
  ENTRY_STATUSES,
  NOTE_CATEGORIES,
  SKILL_STATUSES,
  labelFor,
} from "@/lib/domain"

const pill =
  "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap"

/** Chip, dot and solid colours shared by every status badge. */
const TONES = {
  grey: {
    chip: "bg-[#e7ecf3] text-[#364660]",
    dot: "bg-[#7a889c]",
    solid: "bg-[#5b6b80]",
  },
  amber: {
    chip: "bg-[#fcefc7] text-[#7c5100]",
    dot: "bg-[#d99a06]",
    solid: "bg-[#a36b00]",
  },
  teal: {
    chip: "bg-[#d5efef] text-[#0b6262]",
    dot: "bg-[#0f8a8a]",
    solid: "bg-[#0d7c7c]",
  },
  green: {
    chip: "bg-[#d9f3e2] text-[#17663a]",
    dot: "bg-[#22a05a]",
    solid: "bg-[#1a7f45]",
  },
  violet: {
    chip: "bg-[#ebe4fc] text-[#5634b8]",
    dot: "bg-[#6d4ad8]",
    solid: "bg-[#6d4ad8]",
  },
  blue: {
    chip: "bg-primary-soft text-primary-dark",
    dot: "bg-primary",
    solid: "bg-primary",
  },
  red: {
    chip: "bg-[#fde3e1] text-[#9f1f14]",
    dot: "bg-[#d1432f]",
    solid: "bg-[#b42318]",
  },
} as const
type Tone = keyof typeof TONES

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={cn(pill, TONES[tone].chip)}>
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", TONES[tone].dot)}
      />
      {children}
    </span>
  )
}

const SKILL_TONES: Record<string, Tone> = {
  learning: "grey",
  with_support: "amber",
  without_support: "teal",
  independent: "green",
  in_routine: "violet",
}

/** Per skill status: chip (tinted), dot (legend / bar) and solid (selected switch segment). */
export const SKILL_STATUS_STYLES: Record<
  string,
  { chip: string; dot: string; solid: string }
> = Object.fromEntries(
  Object.entries(SKILL_TONES).map(([status, tone]) => [status, TONES[tone]])
)

export function SkillStatusBadge({ status }: { status: string }) {
  if (status === "cleared")
    return (
      <span className={cn(pill, "border border-dashed text-muted-foreground")}>
        Cleared
      </span>
    )
  return (
    <Chip tone={SKILL_TONES[status] ?? "grey"}>
      {labelFor(SKILL_STATUSES, status)}
    </Chip>
  )
}

const NOTE_TONES: Record<string, Tone> = {
  general: "grey",
  injury: "red",
  coaching: "blue",
  achievement: "green",
}

export function NoteCategoryBadge({ category }: { category: string }) {
  return (
    <Chip tone={NOTE_TONES[category] ?? "grey"}>
      {labelFor(NOTE_CATEGORIES, category)}
    </Chip>
  )
}

const COMP_TONES: Record<string, Tone> = {
  planning: "grey",
  entries_open: "green",
  entries_closed: "amber",
  completed: "violet",
  cancelled: "red",
}

export function CompetitionStatusBadge({ status }: { status: string }) {
  return (
    <Chip tone={COMP_TONES[status] ?? "grey"}>
      {labelFor(COMPETITION_STATUSES, status)}
    </Chip>
  )
}

const ENTRY_TONES: Record<string, Tone> = {
  invited: "grey",
  entered: "blue",
  confirmed: "green",
  withdrawn: "red",
}

export function EntryStatusBadge({ status }: { status: string }) {
  return (
    <Chip tone={ENTRY_TONES[status] ?? "grey"}>
      {labelFor(ENTRY_STATUSES, status)}
    </Chip>
  )
}

export function InjuryBadge() {
  return <Chip tone="red">Injury</Chip>
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
