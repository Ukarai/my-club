// Shared domain types and label maps used by both server and client code.

export const SKILL_STATUSES = [
  {
    value: "learning",
    label: "Learning",
    hint: "Introduced, working on drills / lead-ups",
  },
  {
    value: "with_support",
    label: "With support",
    hint: "Needs a spot, belt, or matting",
  },
  {
    value: "without_support",
    label: "Without support",
    hint: "No spot, but coach close by",
  },
  {
    value: "independent",
    label: "Independent",
    hint: "Consistent on their own",
  },
  {
    value: "in_routine",
    label: "In routine",
    hint: "Performed within a routine",
  },
] as const
export type SkillStatus = (typeof SKILL_STATUSES)[number]["value"]

export const NOTE_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "injury", label: "Injury" },
  { value: "coaching", label: "Coaching" },
  { value: "achievement", label: "Achievement" },
] as const
export type NoteCategory = (typeof NOTE_CATEGORIES)[number]["value"]

export const SKILL_NOTE_KINDS = [
  {
    value: "focus",
    label: "Current focus",
    hint: "What we're working on with this skill right now",
  },
  {
    value: "coaching_point",
    label: "Coaching point",
    hint: "Something to keep in mind whenever coaching this skill",
  },
] as const
export type SkillNoteKind = (typeof SKILL_NOTE_KINDS)[number]["value"]

export const GROUP_COLORS = [
  "sky",
  "emerald",
  "amber",
  "rose",
  "violet",
  "teal",
  "orange",
  "slate",
] as const
export type GroupColor = (typeof GROUP_COLORS)[number]

export type Group = {
  id: number
  name: string
  description: string | null
  color: GroupColor
  created_at: string
}

export type GroupSummary = Group & { member_count: number }

export const TARGET_STATUSES = [
  { value: "active", label: "Active" },
  { value: "achieved", label: "Achieved" },
  { value: "dropped", label: "Dropped" },
] as const
export type TargetStatus = (typeof TARGET_STATUSES)[number]["value"]

export const COMPETITION_STATUSES = [
  { value: "planning", label: "Planning" },
  { value: "entries_open", label: "Entries open" },
  { value: "entries_closed", label: "Entries closed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const
export type CompetitionStatus = (typeof COMPETITION_STATUSES)[number]["value"]

export const ENTRY_STATUSES = [
  { value: "invited", label: "Invited" },
  { value: "entered", label: "Entered" },
  { value: "confirmed", label: "Confirmed" },
  { value: "withdrawn", label: "Withdrawn" },
] as const
export type EntryStatus = (typeof ENTRY_STATUSES)[number]["value"]

export const SKILL_CATEGORIES = [
  "Basics",
  "Drops & rotations",
  "Somersaults",
  "Twisting",
  "Multiple somersaults",
] as const

export const ROLES = [
  {
    value: "admin",
    label: "Admin",
    hint: "Everything, including managing users, the skill catalogue and deleting records",
  },
  {
    value: "coach",
    label: "Coach",
    hint: "Record progress, notes, targets and manage competition entries",
  },
  {
    value: "viewer",
    label: "Viewer",
    hint: "Read-only; medical and contact details are hidden",
  },
] as const
export type Role = (typeof ROLES)[number]["value"]

const ROLE_RANK: Record<Role, number> = { viewer: 0, coach: 1, admin: 2 }
export function hasRole(user: { role: Role } | null | undefined, min: Role) {
  return !!user && ROLE_RANK[user.role] >= ROLE_RANK[min]
}

export type SessionUser = {
  id: number
  name: string
  email: string
  role: Role
}

export type UserRow = SessionUser & { active: number; created_at: string }

export const MIN_PASSWORD_LENGTH = 8

export function labelFor(
  list: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined
) {
  return list.find((i) => i.value === value)?.label ?? value ?? ""
}

export type Gymnast = {
  id: number
  first_name: string
  last_name: string
  date_of_birth: string | null
  squad: string | null
  level: string | null
  guardian_contact: string | null
  medical_info: string | null
  active: number
  created_at: string
}

export type GymnastSummary = Gymnast & {
  independent_count: number
  in_progress_count: number
  active_targets: number
  open_injuries: number
  group_ids: number[]
}

export type Skill = {
  id: number
  name: string
  category: string
  tariff: number
  description: string | null
  sort_order: number
}

export type GymnastSkill = {
  skill_id: number
  status: SkillStatus
  updated_at: string
  note: string | null
}

export type SkillHistory = {
  id: number
  skill_id: number
  skill_name: string
  status: SkillStatus
  recorded_on: string
  note: string | null
}

export type SkillNote = {
  id: number
  gymnast_id: number
  skill_id: number
  kind: SkillNoteKind
  body: string
  author: string | null
  noted_on: string
  /** 1 once a focus is done or a point no longer applies; kept as history */
  archived: number
}

export type Note = {
  id: number
  gymnast_id: number
  noted_on: string
  category: NoteCategory
  body: string
  author: string | null
  resolved: number
}

export type Target = {
  id: number
  gymnast_id: number
  title: string
  details: string | null
  skill_id: number | null
  skill_name: string | null
  goal_status: SkillStatus | null
  target_date: string | null
  status: TargetStatus
  achieved_on: string | null
}

export type Competition = {
  id: number
  name: string
  start_date: string
  end_date: string | null
  venue: string | null
  organiser: string | null
  level: string | null
  entry_deadline: string | null
  entry_fee: number | null
  status: CompetitionStatus
  notes: string | null
}

export type CompetitionSummary = Competition & {
  entry_count: number
  open_tasks: number
}

export type Entry = {
  id: number
  competition_id: number
  gymnast_id: number
  gymnast_name: string
  category: string | null
  status: EntryStatus
  fee_paid: number
  routine1: number[]
  routine2: number[]
  score: number | null
  placing: number | null
  notes: string | null
}

export type GymnastEntry = {
  id: number
  competition_id: number
  competition_name: string
  start_date: string
  category: string | null
  status: EntryStatus
  score: number | null
  placing: number | null
}

export type CompTask = {
  id: number
  competition_id: number
  title: string
  due_date: string | null
  assignee: string | null
  done: number
}

export function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return ""
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function ageFrom(dob: string | null) {
  if (!dob) return null
  const [y, m, d] = dob.split("-").map(Number)
  const now = new Date()
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d))
    age--
  return age
}

export function daysUntil(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  const target = new Date(y, m - 1, d).getTime()
  const now = new Date()
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime()
  return Math.round((target - start) / 86_400_000)
}
