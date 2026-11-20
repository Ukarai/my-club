import { useRouter } from "@tanstack/react-router"
import { logout } from "@/server/functions/session"

export function useSignOut() {
  const router = useRouter()
  return async () => {
    await logout()
    await router.invalidate()
  }
}
