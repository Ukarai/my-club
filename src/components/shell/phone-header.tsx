import { Menu } from "@base-ui/react/menu"
import { Link } from "@tanstack/react-router"
import { History, LogOut, ShieldCheck, UserRound } from "lucide-react"
import { ClubLogo } from "@/components/club-logo"
import { useSignOut } from "@/components/shell/use-sign-out"
import { UserInitials } from "@/components/shell/user-initials"
import { CLUB } from "@/lib/club"
import { hasRole } from "@/lib/roles"
import { useUser } from "@/lib/use-user"

const menuItem =
  "flex min-h-11 cursor-default items-center gap-2.5 rounded-lg px-3 text-sm font-medium outline-none select-none data-highlighted:bg-muted"

/** Phone top bar: club badge and an account menu. */
export function PhoneHeader() {
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
