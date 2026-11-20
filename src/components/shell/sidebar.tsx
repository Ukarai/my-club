import { Link } from "@tanstack/react-router"
import { History, LogOut, ShieldCheck } from "lucide-react"
import { ClubLogo } from "@/components/club-logo"
import { NAV } from "@/components/shell/nav"
import { useSignOut } from "@/components/shell/use-sign-out"
import { UserInitials } from "@/components/shell/user-initials"
import { CLUB } from "@/lib/club"
import { ROLES, hasRole } from "@/lib/roles"
import { useUser } from "@/lib/use-user"

const sideLink =
  "flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-white/5 hover:text-white data-[status=active]:bg-sidebar-accent data-[status=active]:font-semibold data-[status=active]:text-white data-[status=active]:shadow-[inset_3px_0_0_var(--sidebar-edge)]"

const sectionLabel =
  "px-3 pb-1.5 text-[11px] font-bold tracking-[0.08em] text-sidebar-label uppercase"

/** Navy sidebar for tablets and up. */
export function Sidebar() {
  const user = useUser()
  const signOut = useSignOut()
  if (!user) return null
  const role = ROLES.find((r) => r.value === user.role)?.label ?? user.role

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 flex h-svh w-62 shrink-0 flex-col gap-7 overflow-y-auto bg-sidebar px-3.5 py-6 text-sidebar-foreground max-md:hidden"
    >
      <Link to="/" className="flex items-center gap-2.5 px-2">
        <ClubLogo />
        <span className="flex flex-col leading-tight">
          <span className="text-[17px] font-bold text-white">{CLUB.name}</span>
          <span className="text-xs text-sidebar-muted">{CLUB.tagline}</span>
        </span>
      </Link>

      <div className="flex flex-col gap-1">
        <span className={sectionLabel}>Club</span>
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className={sideLink}
          >
            <Icon className="size-[18px]" />
            {label}
          </Link>
        ))}
        {hasRole(user, "coach") && (
          <Link to="/activity" className={sideLink}>
            <History className="size-[18px]" />
            Activity
          </Link>
        )}
        {user.role === "admin" && (
          <>
            <span className={sectionLabel + " pt-4"}>Admin</span>
            <Link to="/users" className={sideLink}>
              <ShieldCheck className="size-[18px]" />
              Users
            </Link>
          </>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-sidebar-raised py-2.5 pr-2.5 pl-3">
        <Link
          to="/account"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg"
          title="Your account"
        >
          <UserInitials name={user.name} className="size-[34px]" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-white">
              {user.name}
            </span>
            <span className="truncate text-xs text-[#a8bbd8]">
              {role} · Account
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          title="Sign out"
          className="flex size-10 shrink-0 items-center justify-center rounded-[10px] text-sidebar-foreground transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-[18px]" />
        </button>
      </div>
    </nav>
  )
}
