import { useRouteContext } from "@tanstack/react-router"
import { hasRole, type Role } from "@/lib/roles"

/** The signed-in user (null on the login and setup pages). */
export function useUser() {
  return useRouteContext({ from: "__root__", select: (c) => c.user })
}

/** Whether the signed-in user has at least the given role. */
export function useCan(min: Role) {
  return hasRole(useUser(), min)
}
