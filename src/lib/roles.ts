// User roles, and the check for whether a user has at least a given role.
export const ROLES = [
  {
    value: "admin",
    label: "Admin",
    hint: "Everything, including competitions, managing users, the skill catalogue and deleting records",
  },
  {
    value: "coach",
    label: "Coach",
    hint: "Record progress, notes and targets, manage gymnasts and groups, and edit competition routines unless locked",
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
