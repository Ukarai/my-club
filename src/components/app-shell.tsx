import { Link, useRouter } from "@tanstack/react-router"
import { Menu } from "@base-ui/react/menu"
import {
  History,
  Layers,
  LayoutDashboard,
  ListChecks,
  LogOut,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from "lucide-react"
import type * as React from "react"
import { logout } from "@/server/auth-functions"
import { ClubLogo, initials } from "@/components/avatar"
import { CLUB } from "@/lib/club"
import { ROLES, hasRole } from "@/lib/domain"
import { useUser } from "@/lib/use-user"

const NAV = [
  { to: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { to: "/gymnasts", label: "Gymnasts", short: "Gymnasts", icon: Users },
  { to: "/groups", label: "Groups", short: "Groups", icon: Layers },
  { to: "/skills", label: "Skills", short: "Skills", icon: ListChecks },
  { to: "/competitions", label: "Competitions", short: "Comps", icon: Trophy },
] as const

const sideLink =
  "flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-white/5 hover:text-white data-[status=active]:bg-sidebar-accent data-[status=active]:font-semibold data-[status=active]:text-white data-[status=active]:shadow-[inset_3px_0_0_var(--sidebar-edge)]"

const sectionLabel =
  "px-3 pb-1.5 text-[11px] font-bold tracking-[0.08em] text-sidebar-label uppercase"

function useSignOut() {
  const router = useRouter()
  return async () => {
    await logout()
    await router.invalidate()
  }
}

function UserInitials({
  name,
  className,
}: {
  name: string
  className: string
}) {
  return (
    <span
      aria-hidden
      className={
        "flex shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[13px] font-bold text-sidebar-primary-foreground " +
        className
      }
    >
      {initials(name)}
    </span>
  )
}

/** Navy sidebar for tablets and up. */
function Sidebar() {
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

const menuItem =
  "flex min-h-11 cursor-default items-center gap-2.5 rounded-lg px-3 text-sm font-medium outline-none select-none data-highlighted:bg-muted"

/** Phone top bar: club badge and an account menu. */
function PhoneHeader() {
  const user = useUser()
  const signOut = useSignOut()
  if (!user) return null

  return (
    <header className="flex items-center justify-between gap-3 bg-sidebar px-4 py-3 text-white md:hidden">
      <Link to="/" className="flex items-center gap-2.5">
        <ClubLogo className="size-[38px]" />
        <span className="text-[17px] font-bold">{CLUB.name}</span>
      </Link>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Account menu for ${user.name}`}
          className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <UserInitials name={user.name} className="size-9" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={6} align="end" className="z-50">
            <Menu.Popup className="min-w-52 origin-(--transform-origin) rounded-xl bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-border">
              <div className="px-3 pt-1.5 pb-2 text-xs text-muted-foreground">
                Signed in as{" "}
                <span className="font-semibold text-foreground">
                  {user.name}
                </span>
              </div>
              <Menu.LinkItem
                closeOnClick
                className={menuItem}
                render={<Link to="/account" />}
              >
                <UserRound className="size-4" /> Your account
              </Menu.LinkItem>
              {hasRole(user, "coach") && (
                <Menu.LinkItem
                  closeOnClick
                  className={menuItem}
                  render={<Link to="/activity" />}
                >
                  <History className="size-4" /> Activity
                </Menu.LinkItem>
              )}
              {user.role === "admin" && (
                <Menu.LinkItem
                  closeOnClick
                  className={menuItem}
                  render={<Link to="/users" />}
                >
                  <ShieldCheck className="size-4" /> Users
                </Menu.LinkItem>
              )}
              <Menu.Item className={menuItem} onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </header>
  )
}

/** Phone bottom tab bar. */
function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-around bg-sidebar px-1.5 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_14px_rgb(11_31_61/0.18)] md:hidden"
    >
      {NAV.map(({ to, short, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="group flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-[#a8bbd8] data-[status=active]:font-bold data-[status=active]:text-white"
        >
          <span className="flex h-[30px] w-13 items-center justify-center rounded-full group-data-[status=active]:bg-sidebar-accent group-data-[status=active]:shadow-[inset_0_-2px_0_var(--sidebar-edge)]">
            <Icon className="size-5" />
          </span>
          {short}
        </Link>
      ))}
    </nav>
  )
}

/** Signed-in layout: sidebar on wide screens, top bar and tab bar on phones. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useUser()
  if (!user) {
    return <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
  }
  return (
    <div className="md:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <PhoneHeader />
        <main className="mx-auto max-w-6xl px-4 pt-4 pb-28 md:px-9 md:pt-8 md:pb-12">
          {children}
        </main>
      </div>
      <TabBar />
    </div>
  )
}
